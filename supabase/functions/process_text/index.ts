// Runs in Supabase Edge Functions (Deno). No external imports.
// Purpose: turn raw text into non-overlapping, verb-first actionable items via Groq.
// Contract: POST { text: string, platform?: string, timezone?: string } -> JSON per schema below.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
} as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Use POST with JSON { text, platform?, timezone? }" }, 405);
    }

    // ---- Input ----
    const body = await safeJson(req);
    const text = (body?.text ?? "").toString();
    const platform = body?.platform ?? "web";
    const timezone = body?.timezone ?? null;

    if (!text || text.trim().length < 2) {
      return json({ error: "`text` is required (min length 2)" }, 400);
    }

    console.log(`📝 Processing text for ${platform} platform`);
    console.log(`📊 Text length: ${text.length} characters`);
    if (timezone) {
      console.log(`🌍 User timezone: ${timezone}`);
    }

    // ---- Secret ----
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return json({ error: "Missing GROQ_API_KEY secret" }, 500);
    }

    // ---- Strong system prompt (no overlaps, verb required, short titles) ----
    const systemPrompt = `
You output JSON-only. Split input into atomic, NON-OVERLAPPING action items.

HARD RULES
- Each item must include a clear ACTION VERB ("call", "buy", "finish", "send", "email", "book", "schedule", "pay", "review", "write"…).
- If a sentence has multiple actions, split into multiple items (keep order).
- Drop fragments that are subsets of another item or lack a verb.
- Titles are ≤ 80 chars, imperative where possible ("Call friend to check weekend availability").
- If calendar-like time exists ("tomorrow 5pm", "Sat 9:30"), set type=Event; otherwise To-do/Task.
- Reflective/story-like → Note or Journal.
- Do not invent details. No duplicates.

Return ONLY this object (no prose):
{
  "items": [
    {
      "type": "Task" | "To-do" | "Event" | "Note" | "Journal",
      "title": "string",
      "details": "string|null",
      "due_iso": "YYYY-MM-DDTHH:mm:ssZ|null",
      "duration_min": number|null,
      "location": "string|null",
      "subtasks": string[]
    }
  ],
  "suggested_overall_category": "Task" | "To-do" | "Event" | "Note" | "Journal",
  "forced_rules_applied": string[],
  "warnings": string[],
  "confidence": number
}

DOUBLE-CHECK
- Remove any item that is a substring of another item.
- Remove items shorter than 3 words unless verb+noun (e.g., "Buy milk").
- Prefer "To-do" over "Task" when unsure.
`.trim();

    // ---- Call Groq (OpenAI-compatible) ----
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        top_p: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ timezone, text }) }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return json({ error: "Groq API error", status: resp.status, body: errText }, 502);
    }

    // Groq returns a JSON string in choices[0].message.content
    const payload = await resp.json().catch(() => ({}));
    const content = payload?.choices?.[0]?.message?.content ?? "";

    // Parse the JSON Groq generated
    let out: any;
    try {
      out = JSON.parse(content);
    } catch {
      return json({ error: "Groq returned non-JSON content", content }, 502);
    }

    // ---- Minimal shape guard + last-mile cleanup (no heavy deps) ----
    if (!Array.isArray(out?.items)) out.items = [];
    out.items = sanitizeItems(out.items);

    // Fill optional fields if missing
    out.suggested_overall_category ??= inferOverall(out.items);
    out.forced_rules_applied ??= ["non_overlapping", "verb_required"];
    out.warnings ??= [];
    out.confidence ??= Math.min(1, 0.75 + out.items.length * 0.05);

    return json(out, 200);
  } catch (e) {
    return json({ error: "Unhandled error", detail: String(e) }, 500);
  }
});

// ---------- helpers ----------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return null; }
}

function sanitizeItems(items: any[]): any[] {
  // Normalize, drop empties/duplicates/overlaps, ensure required keys exist.
  const norm = (s: string) =>
    (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  const VERB = /\b(call|text|message|email|send|finish|complete|buy|pick|book|schedule|pay|renew|plan|review|write|draft|upload|submit|meet|follow up|check|verify)\b/i;

  const keep: any[] = [];
  const seen: string[] = [];

  for (const raw of items) {
    const title = String(raw?.title ?? "").trim();
    const type = String(raw?.type ?? "").trim() || "To-do";

    if (!title) continue;
    if (!VERB.test(title)) continue;                 // require a verb
    if (title.split(" ").length < 3 && !/^\b(buy|call|email|send|pay)\b/i.test(title)) continue;

    const k = norm(title);
    if (!k) continue;

    // drop near-duplicates / substrings
    const isDup = seen.some(s => overlapHigh(s, k) || s.includes(k) || k.includes(s));
    if (isDup) continue;

    seen.push(k);
    keep.push({
      type,
      title: title.length > 80 ? title.slice(0, 77) + "..." : title,
      details: raw?.details ?? null,
      due_iso: validISO(raw?.due_iso) ? raw.due_iso : null,
      duration_min: toNumOrNull(raw?.duration_min),
      location: raw?.location ?? null,
      subtasks: Array.isArray(raw?.subtasks) ? raw.subtasks.slice(0, 10) : []
    });
  }
  return keep.slice(0, 20);
}

function overlapHigh(a: string, b: string) {
  const A = new Set(a.split(" ")), B = new Set(b.split(" "));
  const inter = [...A].filter(w => B.has(w)).length;
  const ratio = inter / Math.min(A.size, B.size);
  return ratio >= 0.75;
}

function toNumOrNull(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function validISO(s: any) {
  if (!s || typeof s !== "string") return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

type ItemType = "Task" | "To-do" | "Event" | "Note" | "Journal";

function inferOverall(items: Array<{ type?: string }>): ItemType {
  if (!Array.isArray(items) || items.length === 0) return "Note";

  const counts: Record<ItemType, number> = {
    "Event": 0,
    "To-do": 0,
    "Task": 0,
    "Note": 0,
    "Journal": 0
  };

  for (const it of items) {
    const t = (it?.type ?? "").trim() as ItemType;
    if (t in counts) counts[t as ItemType] += 1;
  }

  // Iterate to find the max instead of sorting tuples with unknown types
  let best: ItemType = "To-do";
  let max = -1;
  (Object.keys(counts) as ItemType[]).forEach((k) => {
    const v = counts[k];
    if (v > max) {
      max = v;
      best = k;
    }
  });

  return best;
}

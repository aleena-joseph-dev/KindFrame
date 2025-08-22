import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// ---------- Logging ----------
function log(event: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    event,
    data,
    provider: PROVIDER,
    model: PROVIDER === 'groq' ? GROQ_MODEL : PROVIDER === 'ollama' ? OLLAMA_MODEL : 'mock'
  };
  console.log(`[AI-BREAKDOWN] ${event}:`, JSON.stringify(logData, null, 2));
}

// ---------- Config ----------
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "*")
  .split(",").map(s => s.trim());
const PROVIDER = Deno.env.get("LLM_PROVIDER") ?? ""; // "groq" | "ollama" | "mock"
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant";
const OLLAMA_URL = Deno.env.get("OLLAMA_URL") ?? "";
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "";

// ---------- CORS ----------
function corsHeaders(origin: string) {
  const allow = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin"
  };
}

// ---------- Schemas ----------
const TimeBlock = z.object({
  iso: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  tz: z.string().optional(),
  when_text: z.string().optional(),
});

const BaseItem = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
});

const TaskItem  = BaseItem.extend({
  due: TimeBlock.optional(),
  reminder: z.object({ iso: z.string().optional(), lead_minutes: z.number().int().optional() }).optional(),
  projectId: z.string().nullable().optional(),
});
const TodoItem  = TaskItem;
const EventItem = BaseItem.extend({
  start: TimeBlock.optional(),
  end: TimeBlock.optional(),
  all_day: z.boolean().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string()).optional(),
});

const BreakdownOutput = z.object({
  tasks: z.array(TaskItem).default([]),
  todos: z.array(TodoItem).default([]),
  events: z.array(EventItem).default([]),
  follow_ups: z.array(z.string()).optional(),
});

// ---------- Prompt ----------
const SYSTEM_PROMPT = `
You are a precise structuring assistant for a neurodivergent-friendly productivity app.
Return STRICT JSON ONLY (no prose, no code fences).
Categories: tasks, todos, events. No duplicates across categories.
Timezone default: Asia/Kolkata unless input says otherwise. Fill machine fields (iso/date/time/tz) and human "when_text" when possible.
If ambiguous, add brief questions under follow_ups.
Output shape:
{"tasks":[...], "todos":[...], "events":[...], "follow_ups":[...]}
`;

// ---------- Providers ----------
async function callGroq(userContent: string) {
  if (!GROQ_API_KEY || !GROQ_MODEL) throw new Error("CONFIG: GROQ_API_KEY or GROQ_MODEL missing");
  
  log("groq_api_call_start", { model: GROQ_MODEL, contentLength: userContent.length });
  
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userContent }],
    }),
  });
  
  const text = await res.text();
  log("groq_api_response", { 
    status: res.status, 
    statusText: res.statusText,
    responseLength: text.length,
    responsePreview: text.slice(0, 200)
  });
  
  if (!res.ok) throw new Error(`GROQ_${res.status}: ${text}`);
  const json = JSON.parse(text);
  const content = json?.choices?.[0]?.message?.content ?? "";
  
  log("groq_content_extracted", { contentLength: content.length, contentPreview: content.slice(0, 200) });
  return content;
}

async function callOllama(userContent: string) {
  if (!OLLAMA_URL || !OLLAMA_MODEL) throw new Error("CONFIG: OLLAMA_URL or OLLAMA_MODEL missing");
  
  log("ollama_api_call_start", { model: OLLAMA_MODEL, url: OLLAMA_URL, contentLength: userContent.length });
  
  const res = await fetch(`${OLLAMA_URL.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userContent }],
      options: { temperature: 0 },
      format: "json",
    }),
  });
  
  const text = await res.text();
  log("ollama_api_response", { 
    status: res.status, 
    statusText: res.statusText,
    responseLength: text.length,
    responsePreview: text.slice(0, 200)
  });
  
  if (!res.ok) throw new Error(`OLLAMA_${res.status}: ${text}`);
  const json = JSON.parse(text);
  const content = json?.message?.content ?? "";
  
  log("ollama_content_extracted", { contentLength: content.length, contentPreview: content.slice(0, 200) });
  return content;
}

// ---------- Utils ----------
const RUNTIME_INFO = {
  deno: Deno.version,
  provider: PROVIDER,
  hasGroqKey: !!GROQ_API_KEY,
  hasOllamaUrl: !!OLLAMA_URL,
  model: GROQ_MODEL || OLLAMA_MODEL || null,
};
function stripFences(s: string) { return s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim(); }
function safeParseJSON(s: string) {
  const raw = stripFences(s);
  try { return JSON.parse(raw); }
  catch (e) {
    const repaired = raw.replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(repaired);
  }
}

// Transform Groq response to our expected format
function transformGroqResponse(groqData: any, tz: string) {
  const transformed = {
    tasks: [] as any[],
    todos: [] as any[],
    events: [] as any[]
  };

  // Transform todos (Groq uses 'text' instead of 'title')
  if (groqData.todos && Array.isArray(groqData.todos)) {
    transformed.todos = groqData.todos.map((todo: any) => ({
      title: todo.text || todo.title || "",
      notes: todo.notes || "",
      priority: todo.priority || "normal",
      due: todo.when_iso ? { iso: todo.when_iso, tz: todo.when_tz || tz } : undefined,
      tags: todo.tags || []
    }));
  }

  // Transform events (Groq uses 'text' instead of 'title')
  if (groqData.events && Array.isArray(groqData.events)) {
    transformed.events = groqData.events.map((event: any) => ({
      title: event.text || event.title || "",
      notes: event.notes || "",
      start: event.when_iso ? { iso: event.when_iso, tz: event.when_tz || tz } : undefined,
      end: event.end_iso ? { iso: event.end_iso, tz: event.when_tz || tz } : undefined,
      location: event.location || "",
      tags: event.tags || []
    }));
  }

  // Transform tasks (Groq uses 'text' instead of 'title')
  if (groqData.tasks && Array.isArray(groqData.tasks)) {
    transformed.tasks = groqData.tasks.map((task: any) => ({
      title: task.text || task.title || "",
      notes: task.notes || "",
      priority: task.priority || "normal",
      due: task.when_iso ? { iso: task.when_iso, tz: task.when_tz || tz } : undefined,
      tags: task.tags || []
    }));
  }

  return transformed;
}

// ---------- Handler ----------
serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get("Origin") ?? "*";
  const headers = { "Content-Type": "application/json", ...corsHeaders(origin) };

  log("request_received", { 
    method: req.method, 
    url: req.url, 
    origin,
    hasAuth: !!req.headers.get("authorization"),
    contentType: req.headers.get("content-type")
  });

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  // Health check (no secrets)
  if (req.method === "GET" && url.pathname.endsWith("/ai-breakdown")) {
    if (url.searchParams.has("diag")) {
      log("health_check_diagnostics", { params: Object.fromEntries(url.searchParams) });
      return new Response(JSON.stringify({ ok: true, runtime: RUNTIME_INFO }), { headers });
    }
    log("health_check_basic");
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  if (req.method !== "POST") {
    log("method_not_allowed", { method: req.method });
    return new Response(JSON.stringify({ error: "Use POST for breakdown. GET /ai-breakdown?diag for diagnostics." }), { status: 405, headers });
  }

  try {
    log("processing_start");
    const body = await req.json().catch(() => ({}));
    const polishedText = String(body?.polishedText ?? "").trim();
    const tz = String(body?.tz ?? "Asia/Kolkata");

    log("request_parsed", { 
      polishedTextLength: polishedText.length, 
      polishedTextPreview: polishedText.slice(0, 100),
      timezone: tz,
      bodyKeys: Object.keys(body)
    });

    if (!polishedText) {
      log("validation_failed", { reason: "missing_polished_text" });
      return new Response(JSON.stringify({ error: "polishedText is required" }), { status: 400, headers });
    }
    if (!["groq", "ollama", "mock"].includes(PROVIDER)) {
      log("validation_failed", { reason: "invalid_provider", provider: PROVIDER });
      return new Response(JSON.stringify({ error: "LLM_PROVIDER must be groq | ollama | mock" }), { status: 400, headers });
    }

    const userContent = `TIMEZONE=${tz}\nPOLISHED_TEXT:\n${polishedText}`;
    log("llm_request_prepared", { 
      provider: PROVIDER, 
      userContentLength: userContent.length,
      userContentPreview: userContent.slice(0, 150)
    });

    let raw = "";
    if (PROVIDER === "groq") {
      log("calling_groq", { model: GROQ_MODEL, hasApiKey: !!GROQ_API_KEY });
      raw = await callGroq(userContent);
    } else if (PROVIDER === "ollama") {
      log("calling_ollama", { model: OLLAMA_MODEL, url: OLLAMA_URL });
      raw = await callOllama(userContent);
    } else {
      log("using_mock_provider");
      // Mock provider for debugging
      raw = JSON.stringify({
        tasks: [{ title: "Example task", notes: "", priority: "normal" }],
        todos: [{ title: "Example todo" }],
        events: [{ title: "Example event", start: { when_text: "tomorrow", tz } }],
        follow_ups: [],
      });
    }
    log("provider_response_received", { 
      raw_length: raw?.length ?? 0, 
      raw_preview: raw?.slice(0, 200),
      provider: PROVIDER
    });

    let json: unknown;
    try { 
      json = safeParseJSON(raw); 
      log("json_parsed_successfully", { jsonType: typeof json });
    } catch (e) {
      log("json_parse_failed", { error: String(e), rawPreview: (raw || "").slice(0, 600) });
      const preview = (raw || "").slice(0, 600);
      return new Response(JSON.stringify({ error: "Model returned non-JSON", preview }), { status: 502, headers });
    }

    log("parsed_json_details", { 
      json_type: typeof json, 
      has_tasks: !!(json as any)?.tasks, 
      has_todos: !!(json as any)?.todos, 
      has_events: !!(json as any)?.events,
      json_keys: json && typeof json === 'object' ? Object.keys(json as any) : []
    });

    // Transform Groq response if needed
    if (PROVIDER === "groq" && json && typeof json === "object") {
      log("transforming_groq_response", { before: json });
      json = transformGroqResponse(json as any, tz);
      log("groq_response_transformed", { after: json });
    }

    let parsed;
    try { 
      parsed = BreakdownOutput.parse(json); 
      log("validation_successful", { 
        tasksCount: parsed.tasks.length,
        todosCount: parsed.todos.length,
        eventsCount: parsed.events.length
      });
    } catch (e) {
      const issues = (e as any)?.issues ?? null;
      log("validation_failed", { 
        issues, 
        json_preview: JSON.stringify(json).slice(0, 400),
        error: String(e)
      });
      return new Response(JSON.stringify({ error: "Validation failed", issues, raw_response: json }), { status: 422, headers });
    }

    // Normalize tz if missing
    function ensureTZ(tb?: any) { if (!tb) return tb; if ((tb.iso || tb.date || tb.time) && !tb.tz) tb.tz = tz; return tb; }
    parsed.tasks.forEach((t: any) => { t.due = ensureTZ(t.due); if (t.reminder?.iso && !t.reminder.lead_minutes) t.reminder.lead_minutes = 10; });
    parsed.todos.forEach((t: any) => { t.due = ensureTZ(t.due); });
    parsed.events.forEach((e: any) => { e.start = ensureTZ(e.start); e.end = ensureTZ(e.end); });

    log("processing_complete", { 
      finalOutput: parsed,
      responseSize: JSON.stringify(parsed).length
    });
    return new Response(JSON.stringify(parsed), { status: 200, headers });
  } catch (e) {
    log("unexpected_error", { 
      error: String(e), 
      errorMessage: (e as Error)?.message,
      errorStack: (e as Error)?.stack
    });
    console.error("ERR", (e as Error)?.message);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers });
  }
});

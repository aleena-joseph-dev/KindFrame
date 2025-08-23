import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PROVIDER = Deno.env.get("LLM_PROVIDER") ?? "groq"; // Changed back to groq
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `You are a precise structuring assistant for a neurodivergent-friendly productivity app. Return STRICT JSON ONLY with "tasks", "todos", "events" arrays.

MANDATORY RULES - NEVER VIOLATE:
1. If text contains "doctor", "medical", "appointment", "checkup", "hospital" = ALWAYS "Professional" tag
2. If text contains "walk", "market", "call mom", "shower", "exercise" = ALWAYS "Casual" tag
3. ALL "Casual" items MUST be "todos" (never tasks or events)
4. "Professional" items can be tasks, events, or todos based on their nature

CATEGORIZATION RULES:
- EVENT: appointments, meetings, sessions, travel bookings. If time exists but no date, set when_text="today".
- TO-DO: casual tasks like buy groceries, call mom, personal care, chores, hobbies.
- TASK: professional work like complete project, submit report, prepare presentation.

CRITICAL RULES:
1. ALL "Casual" items MUST be categorized as "todos" (never tasks or events)
2. Doctor's appointments, medical visits, professional meetings are "Professional" (not Casual)
3. Professional items can be tasks, events, or todos based on their nature
4. Only truly personal, non-urgent, non-professional items get "Casual" tag

MEDICAL/HEALTH RULES - STRICTLY ENFORCED:
- ANY medical appointment, doctor visit, hospital visit, medical checkup = "Professional" tag (NEVER "Casual")
- ANY health-related professional service = "Professional" tag (NEVER "Casual")
- Personal care (shower, exercise, meditation) = "Casual" tag
- Doctor, medical, appointment, checkup, hospital = ALWAYS "Professional"

REQUIRED FIELDS FOR EACH ITEM:
- "text": The actual content/description of the item (REQUIRED)
- "tags": Array of tags including "Casual" or "Professional" + domain tags
- "priority": "high", "normal", or "low"
- "when_text": For time references like "tomorrow", "after 30 minutes", "today"
- "when_time": For specific times like "2:00 PM", "14:00", "morning"

EXAMPLES:
- "go for a walk" => TO-DO with "text": "go for a walk", "Casual" tag
- "go to market" => TO-DO with "text": "go to market", "Casual" tag  
- "doctor appointment" => EVENT with "text": "doctor appointment", "Professional" tag
- "medical checkup" => EVENT with "text": "medical checkup", "Professional" tag
- "call mom" => TO-DO with "text": "call mom", "Casual" tag
- "submit report" => TASK with "text": "submit report", "Professional" tag

TAGS: Always include "Casual" or "Professional" + domain tags like "Shopping", "Health", "Work", "Study".

PRIORITY: "high" for urgent words (ASAP, urgent), "low" for defer words (later, someday), otherwise "normal".

STRICT JSON ONLY. Example: 
{
  "tasks": [
    {
      "text": "complete presentation",
      "priority": "normal",
      "tags": ["Professional", "Work"],
      "when_text": "tomorrow"
    }
  ],
  "todos": [
    {
      "text": "go for a walk",
      "priority": "normal", 
      "tags": ["Casual", "Health"],
      "when_text": "after 30 minutes"
    }
  ],
  "events": [
    {
      "text": "doctor appointment",
      "priority": "normal",
      "tags": ["Professional", "Health"],
      "when_text": "tomorrow",
      "when_time": "2:00 PM"
    }
  ]
}`;

serve(async (req) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({
      ok: true,
      message: "Enhanced AI Breakdown Edge Function with Groq",
      provider: PROVIDER,
      timestamp: new Date().toISOString()
    }), { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST for breakdown" }), { status: 405, headers });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const polishedText = String(body?.polishedText ?? "").trim();
    const tz = String(body?.tz ?? "Asia/Kolkata");

    if (!polishedText) {
      return new Response(JSON.stringify({ error: "polishedText is required" }), { status: 400, headers });
    }

    if (PROVIDER === "groq" && GROQ_API_KEY) {
      try {
        const userContent = `TIMEZONE=${tz}\nPOLISHED_TEXT:\n${polishedText}`;
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error("No content from Groq API");
        }

        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          throw new Error("Invalid JSON from AI");
        }

        const result = {
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          todos: Array.isArray(parsed.todos) ? parsed.todos : [],
          events: Array.isArray(parsed.events) ? parsed.events : [],
          follow_ups: Array.isArray(parsed.follow_ups) ? parsed.follow_ups : []
        };

        return new Response(JSON.stringify(result), { status: 200, headers });
      } catch (error) {
        return new Response(JSON.stringify({
          error: "Groq API failed",
          details: String(error),
          fallback: "mock"
        }), { status: 502, headers });
      }
    }

    // Fallback to mock if Groq is not available
    const mockResponse = {
      tasks: [
        {
          text: "Enhanced mock task",
          notes: "This is from the enhanced Edge Function",
          priority: "normal",
          tags: ["Professional", "Work"]
        }
      ],
      todos: [
        {
          text: "Enhanced mock todo",
          notes: "Enhanced categorization and tagging",
          priority: "normal",
          tags: ["Casual", "Personal"]
        }
      ],
      events: [
        {
          text: "Enhanced mock event",
          priority: "normal",
          when_text: "tomorrow",
          tags: ["Casual", "Personal"]
        }
      ],
      follow_ups: []
    };

    return new Response(JSON.stringify(mockResponse), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e),
      message: "Error in enhanced Edge Function"
    }), { status: 500, headers });
  }
});

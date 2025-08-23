import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST to save events" }), { 
      status: 405, 
      headers 
    });
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers
      });
    }

    const body = await req.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: "events array is required" }), {
        status: 400,
        headers
      });
    }

    // Format events for database insertion
    const formattedEvents = events.map((event: any) => ({
      user_id: user.id,
      title: event.title || "Untitled Event",
      description: event.description || "",
      start_time: event.start_time ? new Date(event.start_time).toISOString() : new Date().toISOString(),
      end_time: event.end_time ? new Date(event.end_time).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Default 1 hour duration
      all_day: false,
      location: event.location || "",
      color: "#3B82F6",
      is_recurring: false,
      recurrence_rule: null,
      sync_source: "ai_breakdown",
      external_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert events into database
    const { data, error } = await supabase
      .from("calendar_events")
      .insert(formattedEvents)
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ 
        error: "Failed to save events", 
        details: error.message 
      }), {
        status: 500,
        headers
      });
    }

    return new Response(JSON.stringify({
      success: true,
      saved: data?.length || 0,
      events: data
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("Error in save-events:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: String(error)
    }), {
      status: 500,
      headers
    });
  }
});

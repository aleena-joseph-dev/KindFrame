import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Validation functions
function validateCategory(category: string): string {
  const validCategories = ['personal', 'work', 'health', 'shopping', 'learning', 'other'];
  return validCategories.includes(category) ? category : 'personal';
}

function mapAITagsToCategory(tags: string[]): string {
  if (!tags || tags.length === 0) return 'personal';
  
  // Map AI tags to database categories
  const tagMap: { [key: string]: string } = {
    'casual': 'personal',
    'professional': 'work',
    'health': 'health',
    'shopping': 'shopping',
    'learning': 'learning',
    'work': 'work',
    'personal': 'personal'
  };
  
  // Look for matching tags (case-insensitive)
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    if (tagMap[lowerTag]) {
      return tagMap[lowerTag];
    }
  }
  
  return 'personal'; // default fallback
}

function validatePriority(priority: string): string {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  return validPriorities.includes(priority) ? priority : 'medium';
}

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
    return new Response(JSON.stringify({ error: "Use POST to save todos" }), { 
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
    const { todos } = body;

    if (!Array.isArray(todos) || todos.length === 0) {
      return new Response(JSON.stringify({ error: "todos array is required" }), {
        status: 400,
        headers
      });
    }

    // Format todos for database insertion
    const formattedTodos = todos.map((todo: any) => ({
      user_id: user.id,
      title: todo.title || "Untitled Todo",
      description: todo.description || "",
      priority: validatePriority(todo.priority || "medium"),
      category: mapAITagsToCategory(todo.tags || []),
      tags: todo.tags || [],
      due_date: todo.due_date ? new Date(todo.due_date).toISOString() : null,
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert todos into database
    const { data, error } = await supabase
      .from("todos")
      .insert(formattedTodos)
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ 
        error: "Failed to save todos", 
        details: error.message 
      }), {
        status: 500,
        headers
      });
    }

    return new Response(JSON.stringify({
      success: true,
      saved: data?.length || 0,
      todos: data
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("Error in save-todos:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: String(error)
    }), {
      status: 500,
      headers
    });
  }
});

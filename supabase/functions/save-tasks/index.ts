import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Validation functions
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
    return new Response(JSON.stringify({ error: "Use POST to save tasks" }), { 
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
    const { tasks } = body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return new Response(JSON.stringify({ error: "tasks array is required" }), {
        status: 400,
        headers
      });
    }

    // Format tasks for database insertion
    const formattedTasks = tasks.map((task: any) => ({
      user_id: user.id,
      title: task.title || "Untitled Task",
      description: task.description || "",
      status: "todo",
      priority: validatePriority(task.priority || "medium"),
      tags: task.tags || [],
      due_date: task.due_date ? new Date(task.due_date).toISOString() : null,
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // We need to insert into kanban_cards table since tasks are stored there
    // First, we need to find or create a default board for the user
    let { data: boards, error: boardError } = await supabase
      .from("kanban_boards")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", "AI Tasks")
      .limit(1);

    if (boardError) {
      console.error("Error fetching boards:", boardError);
      return new Response(JSON.stringify({ 
        error: "Failed to fetch boards", 
        details: boardError.message 
      }), {
        status: 500,
        headers
      });
    }

    let boardId: string;

    if (!boards || boards.length === 0) {
      // Create a default board for AI tasks
      const { data: newBoard, error: createBoardError } = await supabase
        .from("kanban_boards")
        .insert({
          user_id: user.id,
          title: "AI Tasks",
          description: "Tasks created from AI breakdown",
          color: "#3B82F6",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (createBoardError || !newBoard) {
        console.error("Error creating board:", createBoardError);
        return new Response(JSON.stringify({ 
          error: "Failed to create board", 
          details: createBoardError?.message 
        }), {
          status: 500,
          headers
        });
      }

      boardId = newBoard.id;
    } else {
      boardId = boards[0].id;
    }

    // Format tasks as kanban cards
    const formattedCards = formattedTasks.map((task: any) => ({
      board_id: boardId,
      title: task.title,
      description: task.description,
      status: "todo",
      priority: task.priority,
      tags: task.tags,
      due_date: task.due_date,
      position: task.position,
      assignee_id: user.id,
      created_at: task.created_at,
      updated_at: task.updated_at
    }));

    // Insert tasks as kanban cards
    const { data, error } = await supabase
      .from("kanban_cards")
      .insert(formattedCards)
      .select();

    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({ 
        error: "Failed to save tasks", 
        details: error.message 
      }), {
        status: 500,
        headers
      });
    }

    return new Response(JSON.stringify({
      success: true,
      saved: data?.length || 0,
      board_id: boardId,
      tasks: data
    }), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error("Error in save-tasks:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: String(error)
    }), {
      status: 500,
      headers
    });
  }
});

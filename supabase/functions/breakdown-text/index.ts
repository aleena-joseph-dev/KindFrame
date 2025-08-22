import "jsr:@supabase/functions-js/edge-runtime.d.ts";

export default async function handleAITextBreakdown(req: Request): Promise<Response> {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Text is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process text and categorize into items
    const items = processText(text);

    return new Response(JSON.stringify({
      success: true,
      items: items
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      items: []
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

function processText(text: string) {
  const items = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (trimmedSentence.length < 5) continue;

    const lowerSentence = trimmedSentence.toLowerCase();
    
    if (lowerSentence.includes('need to') || lowerSentence.includes('have to') || lowerSentence.includes('must')) {
      items.push({
        type: 'task',
        title: trimmedSentence,
        description: trimmedSentence,
        priority: 'medium',
        category: 'personal',
        confidence: 0.8
      });
    } else if (lowerSentence.includes('meeting') || lowerSentence.includes('appointment')) {
      items.push({
        type: 'event',
        title: trimmedSentence,
        description: trimmedSentence,
        category: 'personal',
        confidence: 0.7
      });
    } else if (lowerSentence.includes('buy') || lowerSentence.includes('get')) {
      items.push({
        type: 'todo',
        title: trimmedSentence,
        description: trimmedSentence,
        priority: 'medium',
        category: 'personal',
        confidence: 0.75
      });
    } else if (trimmedSentence.length > 10) {
      items.push({
        type: 'note',
        title: trimmedSentence.substring(0, 50) + (trimmedSentence.length > 50 ? '...' : ''),
        description: trimmedSentence,
        confidence: 0.6
      });
    }
  }

  if (items.length === 0) {
    items.push({
      type: 'note',
      title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      description: text,
      confidence: 0.5
    });
  }

  return items;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { access_token } = await req.json()

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Missing access token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user info from Notion using the access token
    const notionUserResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!notionUserResponse.ok) {
      console.error('Failed to get Notion user data:', notionUserResponse.status)
      return new Response(
        JSON.stringify({ error: 'Failed to get user information from Notion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notionUser = await notionUserResponse.json()
    console.log('Notion user data:', notionUser)

    return new Response(
      JSON.stringify(notionUser),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Notion user function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 
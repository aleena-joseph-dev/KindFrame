/// <reference types="https://deno.land/x/types/index.d.ts" />

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
    const { code, redirect_uri } = await req.json()

    if (!code) {
      console.error('Missing authorization code')
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const NOTION_CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID')
    const NOTION_CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET')

    console.log('Client ID available:', !!NOTION_CLIENT_ID)
    console.log('Client Secret available:', !!NOTION_CLIENT_SECRET)

    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      console.error('Missing Notion OAuth configuration')
      return new Response(
        JSON.stringify({ error: 'Notion OAuth not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle potential URL encoding in client secret
    const decodedSecret = decodeURIComponent(NOTION_CLIENT_SECRET)
    console.log('Using decoded client secret')

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${NOTION_CLIENT_ID}:${decodedSecret}`)}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri || 'http://localhost:8081/auth-callback', // Updated back to port 8081
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Notion token exchange failed:', tokenData)
      return new Response(
        JSON.stringify({ error: 'Failed to exchange code for token', details: tokenData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully exchanged code for token')
    return new Response(
      JSON.stringify(tokenData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Notion OAuth function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 
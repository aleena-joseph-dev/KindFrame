#!/usr/bin/env node

/**
 * Test script for Supabase MCP Server
 * Run this to verify your MCP server is working correctly
 */

import { spawn } from 'child_process';

async function testMcpServer() {
  console.log('🧪 Testing Supabase MCP Server...\n');

  // Check if access token is set
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.log('❌ SUPABASE_ACCESS_TOKEN not found in environment variables');
    console.log('💡 Please set your Supabase access token:');
    console.log('   export SUPABASE_ACCESS_TOKEN="your_token_here"');
    console.log('\n📖 See SUPABASE_MCP_SETUP.md for detailed instructions');
    return;
  }

  console.log('✅ Access token found');
  console.log('🚀 Starting MCP server test...\n');

  // Test the MCP server
  const mcpProcess = spawn('npx', ['@supabase/mcp-server-supabase'], {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  mcpProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  mcpProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  mcpProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ MCP server started successfully');
      console.log('📝 Output:', output);
    } else {
      console.log('❌ MCP server failed to start');
      console.log('📝 Error:', errorOutput);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify your access token is valid');
      console.log('2. Check your internet connection');
      console.log('3. Ensure you have a Supabase account');
    }
  });

  // Send a simple test message
  setTimeout(() => {
    console.log('📤 Sending test message...');
    mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    }) + '\n');
  }, 1000);

  // Clean up after 5 seconds
  setTimeout(() => {
    mcpProcess.kill();
    console.log('\n🧹 Test completed');
  }, 5000);
}

testMcpServer().catch(console.error); 
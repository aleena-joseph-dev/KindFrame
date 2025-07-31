#!/bin/bash

# Supabase MCP Setup Script for Cursor
# This script helps you set up Supabase MCP integration with Cursor

echo "🚀 Setting up Supabase MCP for Cursor..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install Supabase MCP packages
echo "📦 Installing Supabase MCP packages..."
npm install @supabase/mcp-server-supabase @supabase/mcp-utils

# Check if access token is already set
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "✅ SUPABASE_ACCESS_TOKEN is already set"
else
    echo "❌ SUPABASE_ACCESS_TOKEN is not set"
    echo ""
    echo "📋 To get your Supabase access token:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Click your profile icon → Account Settings → Access Tokens"
    echo "3. Generate a new token"
    echo "4. Copy the token"
    echo ""
    echo "💡 Then run: export SUPABASE_ACCESS_TOKEN='your_token_here'"
    echo ""
fi

# Create MCP config file if it doesn't exist
if [ ! -f "mcp-config.json" ]; then
    echo "📝 Creating mcp-config.json..."
    cat > mcp-config.json << EOF
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "YOUR_SUPABASE_ACCESS_TOKEN_HERE"
      }
    }
  }
}
EOF
    echo "✅ Created mcp-config.json"
    echo "⚠️  Remember to replace YOUR_SUPABASE_ACCESS_TOKEN_HERE with your actual token"
else
    echo "✅ mcp-config.json already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your Supabase access token (see instructions above)"
echo "2. Set the token: export SUPABASE_ACCESS_TOKEN='your_token_here'"
echo "3. Update mcp-config.json with your token"
echo "4. Configure Cursor to use the MCP config file"
echo "5. Restart Cursor"
echo ""
echo "📖 For detailed instructions, see SUPABASE_MCP_SETUP.md"
echo "🧪 To test the connection, run: node test-mcp.js" 
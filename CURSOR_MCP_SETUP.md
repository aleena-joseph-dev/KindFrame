# Cursor MCP Setup Guide

## ✅ What's Been Created

1. **`.cursor/` directory** - Created in your project root
2. **`.cursor/mcp.json`** - MCP configuration file with your project reference

## 🔧 Next Steps to Complete Setup

### 1. Get Your Personal Access Token

1. Go to your Supabase dashboard: https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name like "Cursor MCP Integration"
4. Copy the generated token

### 2. Update the Configuration

1. Open `.cursor/mcp.json` in your editor
2. Replace `YOUR_PERSONAL_ACCESS_TOKEN_HERE` with your actual token
3. Save the file

### 3. Open Cursor and Configure MCP

1. **Open Cursor** (if not already open)
2. **Navigate to Settings**:
   - On Mac: `Cmd + ,`
   - On Windows/Linux: `Ctrl + ,`
3. **Find MCP Settings**:
   - Look for "MCP" or "Model Context Protocol" in the settings
   - Or search for "MCP" in the settings search bar
4. **Check Connection Status**:
   - You should see a green "Active" status for the Supabase server
   - If not active, try restarting Cursor

### 4. Test the Connection

Once connected, you should be able to:

- Query your Supabase database directly from Cursor
- Get real-time schema information
- Execute database operations through the AI assistant

## 🔍 Troubleshooting

### If MCP Server Doesn't Connect:

1. **Check Token**: Ensure your personal access token is correct
2. **Check Project Ref**: Verify `dlenuyofztbvhzmdfiek` is your correct project reference
3. **Restart Cursor**: Sometimes a restart is needed after configuration changes
4. **Check Network**: Ensure you have internet access for the MCP server

### If You See Errors:

1. **Token Permissions**: Make sure your token has the necessary permissions
2. **Project Access**: Verify the token has access to your specific project
3. **Network Issues**: Check if your firewall is blocking the connection

## 📋 Configuration Details

Your current configuration:

- **Project Reference**: `dlenuyofztbvhzmdfiek`
- **Server**: `@supabase/mcp-server-supabase@latest`
- **Mode**: Read-only (safe for development)
- **Token**: [You need to add this]

## 🎯 Benefits Once Connected

- **Direct Database Access**: Query your Supabase database from Cursor
- **Schema Awareness**: AI assistant knows your table structure
- **Real-time Data**: Access live data during development
- **Type Safety**: Better TypeScript integration with your database

## 🔒 Security Notes

- Keep your personal access token secure
- The token is stored locally in your project
- Consider using environment variables for production
- The read-only mode prevents accidental data changes

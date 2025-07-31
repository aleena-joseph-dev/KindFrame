# Supabase MCP Setup for Cursor

This guide will help you connect Supabase to Cursor via Model Context Protocol (MCP).

## Prerequisites

1. **Supabase Account**: You need a Supabase account
2. **Supabase Access Token**: You'll need to generate a Personal Access Token
3. **Cursor**: Latest version of Cursor with MCP support

## Step 1: Generate Supabase Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile icon in the top right
3. Go to **Account Settings** → **Access Tokens**
4. Click **Generate new token**
5. Give it a name (e.g., "Cursor MCP Integration")
6. Copy the generated token (you won't be able to see it again)

## Step 2: Configure MCP in Cursor

### Option A: Using Environment Variables

1. Set your Supabase access token as an environment variable:

   ```bash
   export SUPABASE_ACCESS_TOKEN="your_access_token_here"
   ```

2. Add this to your shell profile (`.zshrc`, `.bashrc`, etc.):
   ```bash
   echo 'export SUPABASE_ACCESS_TOKEN="your_access_token_here"' >> ~/.zshrc
   source ~/.zshrc
   ```

### Option B: Using MCP Config File

1. Update the `mcp-config.json` file in your project:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["@supabase/mcp-server-supabase"],
         "env": {
           "SUPABASE_ACCESS_TOKEN": "your_access_token_here"
         }
       }
     }
   }
   ```

## Step 3: Configure Cursor

1. Open Cursor
2. Go to **Settings** (Cmd/Ctrl + ,)
3. Search for "MCP" or "Model Context Protocol"
4. Add the path to your `mcp-config.json` file
5. Restart Cursor

## Step 4: Test the Connection

1. Open a new chat in Cursor
2. Try asking: "List my Supabase projects"
3. The AI should be able to access your Supabase data

## Available MCP Commands

Once connected, you can use commands like:

- **List projects**: "Show me my Supabase projects"
- **Database operations**: "Create a table for users in my project"
- **Query data**: "Get all users from my database"
- **Schema management**: "Show me the schema of my database"
- **Real-time subscriptions**: "Set up a real-time subscription for user updates"

## Troubleshooting

### Common Issues:

1. **"Access token not found"**

   - Make sure your `SUPABASE_ACCESS_TOKEN` is set correctly
   - Verify the token has the necessary permissions

2. **"Command not found"**

   - Ensure `@supabase/mcp-server-supabase` is installed
   - Run `npm install @supabase/mcp-server-supabase`

3. **"Connection failed"**
   - Check your internet connection
   - Verify your Supabase account is active

### Debug Steps:

1. Test the MCP server manually:

   ```bash
   SUPABASE_ACCESS_TOKEN="your_token" npx @supabase/mcp-server-supabase
   ```

2. Check Cursor logs for MCP errors

3. Verify the config file syntax:
   ```bash
   cat mcp-config.json | jq .
   ```

## Security Notes

- Never commit your access token to version control
- Use environment variables or secure credential storage
- Regularly rotate your access tokens
- Grant minimal necessary permissions to the token

## Next Steps

Once connected, you can:

1. **Integrate with your KindFrame app**: Use MCP to manage your Supabase database
2. **Automate database operations**: Let AI help with schema design and migrations
3. **Real-time features**: Set up real-time subscriptions for your app
4. **Data analysis**: Query and analyze your app's data through natural language

## Example Usage

```
User: "Create a table for storing user memories in my KindFrame project"
AI: [Will use MCP to create the table with proper schema]

User: "Show me all the memories stored in my database"
AI: [Will query the database and display results]

User: "Set up a real-time subscription for new memories"
AI: [Will configure real-time subscriptions]
```

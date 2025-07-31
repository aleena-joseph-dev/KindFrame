# 🔗 Supabase MCP Integration with Cursor

## Overview

This guide covers integrating Supabase with Cursor using Model Context Protocol (MCP) for enhanced development experience. Learn how to set up MCP servers, configure Cursor, and leverage AI-powered database operations.

## Prerequisites

1. **Cursor IDE**: Latest version of Cursor with MCP support
2. **Supabase Project**: Active Supabase project
3. **Node.js**: Version 18 or higher
4. **Supabase CLI**: For local development

## Step 1: MCP Server Setup

### 1.1 Install Supabase MCP Server

```bash
# Install the official Supabase MCP server
npm install -g @supabase/mcp-server-supabase

# Or install locally in your project
npm install @supabase/mcp-server-supabase
```

### 1.2 Configure Environment Variables

Create a `.env` file in your project root:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# MCP Configuration
SUPABASE_ACCESS_TOKEN=your_supabase_access_token
MCP_SERVER_PORT=3001
```

### 1.3 Create MCP Configuration File

Create `mcp-config.json` in your project root:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",
        "SUPABASE_URL": "${EXPO_PUBLIC_SUPABASE_URL}",
        "SUPABASE_ANON_KEY": "${EXPO_PUBLIC_SUPABASE_ANON_KEY}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

## Step 2: Cursor Configuration

### 2.1 Configure Cursor for MCP

1. **Open Cursor Settings**:

   - Go to `Cursor` → `Preferences` → `Settings`
   - Search for "MCP" or "Model Context Protocol"

2. **Add MCP Configuration**:

   ```json
   {
     "mcp.servers": {
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

3. **Restart Cursor** to apply the configuration

### 2.2 Verify MCP Connection

1. **Open Command Palette** (`Cmd/Ctrl + Shift + P`)
2. **Search for "MCP"** commands
3. **Test the connection** by running MCP commands

## Step 3: MCP Server Features

### 3.1 Database Operations

The Supabase MCP server provides the following capabilities:

```typescript
// Example MCP commands you can use in Cursor

// List all tables
/mcp supabase list-tables

// Get table schema
/mcp supabase get-table-schema users

// Query data
/mcp supabase query "SELECT * FROM users WHERE sensory_mode = 'low'"

// Insert data
/mcp supabase insert users "{'email': 'test@example.com', 'first_name': 'John'}"

// Update data
/mcp supabase update users "SET first_name = 'Jane' WHERE email = 'test@example.com'"

// Delete data
/mcp supabase delete users "WHERE email = 'test@example.com'"
```

### 3.2 Real-time Subscriptions

```typescript
// Subscribe to real-time changes
/mcp supabase subscribe brain_dumps "user_id = auth.uid()"

// Listen for specific events
/mcp supabase subscribe mood_entries "INSERT,UPDATE,DELETE"
```

### 3.3 Authentication Operations

```typescript
// Get current user
/mcp supabase auth get-user

// Sign in user
/mcp supabase auth sign-in "email@example.com" "password"

// Sign up user
/mcp supabase auth sign-up "email@example.com" "password"

// Sign out user
/mcp supabase auth sign-out
```

## Step 4: Custom MCP Commands

### 4.1 Create Custom MCP Server

Create `custom-supabase-mcp.js`:

```javascript
#!/usr/bin/env node

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const { createClient } = require("@supabase/supabase-js");

class CustomSupabaseMCPServer {
  constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async initialize() {
    const transport = new StdioServerTransport();
    this.server = new Server(transport, {
      name: "custom-supabase-mcp",
      version: "1.0.0",
    });

    // Register custom commands
    await this.registerCommands();

    // Start the server
    await this.server.connect();
  }

  async registerCommands() {
    // Custom command: Get user analytics
    this.server.setRequestHandler(
      "custom/get-user-analytics",
      async (params) => {
        const { userId } = params;

        try {
          const { data, error } = await this.supabase
            .from("user_statistics")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (error) throw error;
          return { success: true, data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    );

    // Custom command: Create brain dump with AI analysis
    this.server.setRequestHandler(
      "custom/create-brain-dump",
      async (params) => {
        const { userId, content, tags } = params;

        try {
          // Insert brain dump
          const { data: brainDump, error: insertError } = await this.supabase
            .from("brain_dumps")
            .insert({
              user_id: userId,
              content,
              tags: tags || [],
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Analyze content sentiment (simplified)
          const sentiment = this.analyzeSentiment(content);

          // Create mood entry based on analysis
          if (sentiment.score !== 0) {
            await this.supabase.from("mood_entries").insert({
              user_id: userId,
              mood_score: sentiment.score,
              mood_label: sentiment.label,
              notes: `Auto-generated from brain dump analysis`,
              triggers: ["brain_dump_analysis"],
            });
          }

          return { success: true, data: brainDump, sentiment };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    );

    // Custom command: Get productivity insights
    this.server.setRequestHandler(
      "custom/get-productivity-insights",
      async (params) => {
        const { userId, timeframe = "week" } = params;

        try {
          const { data, error } = await this.supabase
            .from("productivity_analytics")
            .select("*")
            .eq("user_id", userId)
            .gte(
              "date",
              new Date(
                Date.now() -
                  this.getTimeframeDays(timeframe) * 24 * 60 * 60 * 1000
              ).toISOString()
            )
            .order("date", { ascending: false });

          if (error) throw error;

          const insights = this.generateProductivityInsights(data);
          return { success: true, data, insights };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    );
  }

  analyzeSentiment(content) {
    // Simple sentiment analysis (in production, use a proper NLP service)
    const positiveWords = [
      "happy",
      "good",
      "great",
      "excellent",
      "wonderful",
      "amazing",
    ];
    const negativeWords = [
      "sad",
      "bad",
      "terrible",
      "awful",
      "horrible",
      "depressed",
    ];

    const words = content.toLowerCase().split(" ");
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });

    const score = Math.max(
      1,
      Math.min(10, 5 + (positiveCount - negativeCount) * 2)
    );
    const label = score > 7 ? "happy" : score > 4 ? "neutral" : "sad";

    return { score, label };
  }

  generateProductivityInsights(data) {
    if (!data || data.length === 0) {
      return { message: "No productivity data available" };
    }

    const totalTodos = data.reduce(
      (sum, day) => sum + (day.todos_completed || 0),
      0
    );
    const avgCompletionRate =
      data.reduce((sum, day) => sum + (day.daily_completion_rate || 0), 0) /
      data.length;
    const avgMood =
      data.reduce((sum, day) => sum + (day.daily_avg_mood || 5), 0) /
      data.length;

    return {
      totalTodosCompleted: totalTodos,
      averageCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      averageMood: Math.round(avgMood * 100) / 100,
      recommendation: this.getProductivityRecommendation(
        avgCompletionRate,
        avgMood
      ),
    };
  }

  getProductivityRecommendation(completionRate, mood) {
    if (completionRate < 50 && mood < 5) {
      return "Consider breaking down tasks into smaller chunks and taking more breaks.";
    } else if (completionRate < 50) {
      return "Try setting more realistic goals and celebrating small wins.";
    } else if (mood < 5) {
      return "Your productivity is good! Consider adding some self-care activities.";
    } else {
      return "Great job! You're maintaining good productivity and mood balance.";
    }
  }

  getTimeframeDays(timeframe) {
    const timeframes = {
      day: 1,
      week: 7,
      month: 30,
      quarter: 90,
    };
    return timeframes[timeframe] || 7;
  }
}

// Start the server
const server = new CustomSupabaseMCPServer();
server.initialize().catch(console.error);
```

### 4.2 Update MCP Configuration

Update your `mcp-config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    },
    "custom-supabase": {
      "command": "node",
      "args": ["./custom-supabase-mcp.js"],
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "${EXPO_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

## Step 5: AI-Powered Development

### 5.1 Database Schema Generation

```typescript
// Use MCP to generate database schemas
/mcp custom-supabase generate-schema "Create a table for tracking user meditation sessions with fields for duration, type, mood before and after, and notes"

// Response will include SQL schema and TypeScript types
```

### 5.2 Query Optimization

```typescript
// Get query performance insights
/mcp custom-supabase optimize-query "SELECT * FROM brain_dumps WHERE user_id = '123' AND created_at > '2024-01-01'"

// Response will include optimized query and index recommendations
```

### 5.3 Data Migration

```typescript
// Generate migration scripts
/mcp custom-supabase generate-migration "Add a new column 'priority' to the todos table with default value 'medium'"

// Response will include migration SQL and rollback script
```

## Step 6: Advanced Features

### 6.1 Real-time Collaboration

```typescript
// Set up real-time collaboration for team development
/mcp custom-supabase setup-realtime "Enable real-time subscriptions for brain_dumps and mood_entries tables"

// Response will include RLS policies and subscription setup
```

### 6.2 Automated Testing

```typescript
// Generate test data and scenarios
/mcp custom-supabase generate-tests "Create test scenarios for user authentication, brain dump creation, and mood tracking"

// Response will include test data and test cases
```

### 6.3 Performance Monitoring

```typescript
// Set up performance monitoring
/mcp custom-supabase setup-monitoring "Create views and functions for monitoring database performance and user activity"

// Response will include monitoring queries and alerts
```

## Step 7: Integration with KindFrame

### 7.1 Update KindFrame Configuration

Update your KindFrame app to use MCP-enhanced features:

```typescript
// lib/supabase-mcp.ts
import { createClient } from "@supabase/supabase-js";

export class SupabaseMCPClient {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  // Enhanced brain dump creation with AI analysis
  async createBrainDumpWithAnalysis(content: string, tags: string[] = []) {
    try {
      // Use MCP to create brain dump with sentiment analysis
      const response = await fetch("/api/mcp/custom/create-brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (await this.supabase.auth.getUser()).data.user?.id,
          content,
          tags,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error creating brain dump with analysis:", error);
      throw error;
    }
  }

  // Get AI-powered productivity insights
  async getProductivityInsights(timeframe: "day" | "week" | "month" = "week") {
    try {
      const response = await fetch(
        "/api/mcp/custom/get-productivity-insights",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: (await this.supabase.auth.getUser()).data.user?.id,
            timeframe,
          }),
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error getting productivity insights:", error);
      throw error;
    }
  }

  // Get user analytics with MCP
  async getUserAnalytics() {
    try {
      const response = await fetch("/api/mcp/custom/get-user-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (await this.supabase.auth.getUser()).data.user?.id,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error getting user analytics:", error);
      throw error;
    }
  }
}
```

### 7.2 Update Components

```typescript
// components/BrainDumpScreen.tsx
import { SupabaseMCPClient } from "../lib/supabase-mcp";

export function BrainDumpScreen() {
  const mcpClient = new SupabaseMCPClient();

  const handleCreateBrainDump = async (content: string, tags: string[]) => {
    try {
      const result = await mcpClient.createBrainDumpWithAnalysis(content, tags);

      if (result.success) {
        // Show success message with sentiment analysis
        Alert.alert(
          "Brain Dump Created",
          `Your brain dump has been saved. Sentiment: ${result.sentiment.label} (${result.sentiment.score}/10)`
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create brain dump");
    }
  };

  // ... rest of component
}
```

## Step 8: Testing and Debugging

### 8.1 MCP Server Testing

```bash
# Test MCP server connection
npx @supabase/mcp-server-supabase --test

# Test custom MCP server
node custom-supabase-mcp.js --test
```

### 8.2 Debug MCP Commands

```typescript
// Enable MCP debugging in Cursor
// Add to your Cursor settings:
{
  "mcp.debug": true,
  "mcp.logLevel": "debug"
}
```

### 8.3 Monitor MCP Performance

```typescript
// Create MCP performance monitoring
/mcp custom-supabase setup-mcp-monitoring "Monitor MCP command performance and usage patterns"
```

## Security Best Practices

1. **Secure Access Tokens**: Never commit access tokens to version control
2. **Use Environment Variables**: Store sensitive data in environment variables
3. **Implement Rate Limiting**: Limit MCP command frequency
4. **Validate Input**: Always validate input data before processing
5. **Monitor Usage**: Track MCP command usage for security
6. **Regular Updates**: Keep MCP servers updated
7. **Access Control**: Implement proper access control for MCP commands

## Troubleshooting

### Common Issues

1. **MCP Server Not Starting**:

   - Check Node.js version (requires 18+)
   - Verify environment variables
   - Check network connectivity

2. **Commands Not Working**:

   - Restart Cursor after configuration changes
   - Check MCP server logs
   - Verify Supabase connection

3. **Performance Issues**:
   - Monitor query performance
   - Use appropriate indexes
   - Implement caching where needed

### Debug Steps

1. **Check MCP Server Status**:

   ```bash
   npx @supabase/mcp-server-supabase --status
   ```

2. **Test Supabase Connection**:

   ```bash
   npx supabase status
   ```

3. **Verify Environment Variables**:
   ```bash
   echo $SUPABASE_ACCESS_TOKEN
   ```

## Next Steps

1. **Advanced Auth**: See `supabase-auth.md`
2. **User Management**: See `supabase-usermanage.md`
3. **Database Views**: See `tableview-supabase.md`

This setup provides comprehensive MCP integration for KindFrame! 🎉

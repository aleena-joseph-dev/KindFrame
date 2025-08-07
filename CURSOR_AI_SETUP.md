# Cursor AI Integration Setup

This guide explains how to set up Cursor AI integration with the Quick Jot feature for AI-powered task breakdown.

## 🎯 **Overview**

The AI integration allows users to:
- **Break down complex tasks** into actionable subtasks
- **Control detail level** (few steps vs many small steps)
- **Save subtasks as todos** automatically
- **Enhance productivity** with intelligent task organization

## 🔧 **Prerequisites**

### **1. Cursor AI Setup**
- ✅ **Cursor AI running locally** with REST API endpoint
- ✅ **API endpoint accessible** (default: `http://localhost:3000/v1/chat/completions`)
- ✅ **API key configured** for authentication

### **2. Environment Configuration**
Add to your `.env` file:
```env
# Direct Cursor AI Integration
EXPO_PUBLIC_CURSOR_AI_KEY=your_cursor_ai_key_here

# Optional: Backend Proxy Configuration
AI_PROXY_PORT=3001
CURSOR_AI_ENDPOINT=http://localhost:3000/v1/chat/completions
CURSOR_AI_MODEL=gpt-4
CURSOR_AI_MAX_TOKENS=500
CURSOR_AI_TEMPERATURE=0.3
```

### **3. Quick Jot Feature**
- ✅ **Input functionality** - Users can type thoughts/ideas
- ✅ **Save options** - Can save as todo, note, core memory, etc.
- ✅ **Guest mode** - Handles unauthenticated users
- ✅ **Database integration** - Saves to Supabase

## 🚀 **How It Works**

### **User Flow:**
1. **User types** their task/idea in Quick Jot
2. **Clicks AI button** (🧠) to break down the task
3. **AI processes** the input using the defined prompt
4. **Shows breakdown** in a modal with detail level control
5. **User can save** all subtasks as todos with one click

### **AI Prompt:**
```
You are an assistant that helps break down a task or idea into actionable subtasks for a to-do list. 
For the following input, return only a bullet list of concrete, actionable steps. 
Each step should start with a verb and be concise. 
Break it down into [few steps/many small steps] based on the detail level: [detail_level].
Input: [user_input]
```

## 📱 **UI Components**

### **Quick Jot Screen:**
- **AI Button** (🧠) - Triggers task breakdown
- **Loading State** (🤖) - Shows when AI is processing
- **Detail Level Toggle** - Few vs Many steps
- **Subtasks Display** - Numbered list of actionable steps
- **Save as Todos** - One-click save for all subtasks

### **Guest Mode Handling:**
- **Signup popup** for unauthenticated users
- **Prevents AI usage** without account
- **Seamless integration** with existing guest flow

## 🔧 **Technical Implementation**

### **Files Modified:**
- `services/aiService.ts` - Direct Cursor AI service layer
- `services/aiProxyService.ts` - Backend proxy service layer (optional)
- `app/(tabs)/quick-jot.tsx` - UI integration
- `env.example` - Environment configuration
- `server/ai-proxy.js` - Backend proxy server (optional)
- `server/package.json` - Proxy server dependencies

### **Key Features:**
- **Error handling** for AI API failures
- **Loading states** for better UX
- **Detail level control** (few/many steps)
- **Guest mode integration** with signup prompts
- **Automatic todo creation** from subtasks

## 🎛️ **Configuration Options**

### **Direct Cursor AI Integration:**
```typescript
// services/aiService.ts
private static CURSOR_AI_ENDPOINT = 'http://localhost:3000/v1/chat/completions';
private static DEFAULT_MODEL = 'gpt-4';
private static DEFAULT_MAX_TOKENS = 500;
private static DEFAULT_TEMPERATURE = 0.3;
```

### **Backend Proxy Integration:**
```typescript
// services/aiProxyService.ts
private static PROXY_ENDPOINT = 'http://localhost:3001/api/ai';
```

### **Environment Variables:**
```env
# Direct Integration
EXPO_PUBLIC_CURSOR_AI_KEY=your_cursor_ai_key_here

# Backend Proxy
AI_PROXY_PORT=3001
CURSOR_AI_ENDPOINT=http://localhost:3000/v1/chat/completions
CURSOR_AI_MODEL=gpt-4
CURSOR_AI_MAX_TOKENS=500
CURSOR_AI_TEMPERATURE=0.3
```

### **Detail Levels:**
- **Few Steps** - High-level, actionable tasks
- **Many Steps** - Detailed, granular subtasks

## 🧪 **Testing**

### **1. Test Direct Connection:**
```typescript
const isConnected = await AIService.testConnection();
```

### **2. Test Proxy Connection:**
```typescript
const isProxyConnected = await AIProxyService.testConnection();
const isProxyHealthy = await AIProxyService.testHealth();
```

### **3. Test Task Breakdown (Direct):**
```typescript
const result = await AIService.getTaskBreakdown("Plan a vacation to Japan", 'few');
```

### **4. Test Task Breakdown (Proxy):**
```typescript
const result = await AIProxyService.getTaskBreakdown("Plan a vacation to Japan", 'few');
```

### **3. Expected Output:**
```
• Research flights to Japan
• Book accommodations in Tokyo
• Create itinerary for major cities
• Apply for travel visa
• Pack essential items
```

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **1. Direct Connection Error:**
- **Check Cursor AI** is running locally
- **Verify endpoint** URL and port
- **Confirm API key** is set correctly
- **Test with browser** at `http://localhost:3000/v1/chat/completions`

#### **2. Proxy Connection Error:**
- **Start proxy server**: `cd server && npm install && npm start`
- **Check proxy health**: `curl http://localhost:3001/health`
- **Verify CORS** settings
- **Check proxy logs** for detailed errors

#### **3. No Subtasks Generated:**
- **Check AI response** format
- **Verify prompt** is working correctly
- **Test with simple input** first
- **Check parsing logic** for bullet points

#### **4. Guest Mode Issues:**
- **Ensure signup popup** shows for guests
- **Verify session detection** works correctly
- **Test authentication flow**

#### **5. API Rate Limiting:**
- **Check Cursor AI** rate limits
- **Implement retry logic** if needed
- **Monitor usage** in proxy logs

## 🔮 **Future Enhancements**

### **Potential Features:**
- **Smart categorization** of subtasks
- **Priority assignment** based on AI analysis
- **Time estimation** for each subtask
- **Integration with calendar** for scheduling
- **Voice input** for task breakdown
- **Custom AI models** for specific domains

## 📚 **API Reference**

### **AIService Methods (Direct Integration):**

#### **getTaskBreakdown(jot, detailLevel):**
```typescript
const result: TaskBreakdownResponse = await AIService.getTaskBreakdown(
  "Plan a vacation to Japan", 
  'few'
);
```

#### **testConnection():**
```typescript
const isConnected: boolean = await AIService.testConnection();
```

### **AIProxyService Methods (Backend Proxy):**

#### **getTaskBreakdown(jot, detailLevel):**
```typescript
const result: TaskBreakdownResponse = await AIProxyService.getTaskBreakdown(
  "Plan a vacation to Japan", 
  'few'
);
```

#### **testConnection():**
```typescript
const isConnected: boolean = await AIProxyService.testConnection();
```

#### **testHealth():**
```typescript
const isHealthy: boolean = await AIProxyService.testHealth();
```

### **Interfaces:**
```typescript
interface TaskBreakdownRequest {
  userInput: string;
  detailLevel?: 'few' | 'many';
}

interface TaskBreakdownResponse {
  subtasks: string[];
  success: boolean;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

## 🎉 **Success Metrics**

### **User Experience:**
- **Faster task planning** with AI assistance
- **More organized workflows** through structured breakdowns
- **Increased productivity** with actionable subtasks
- **Better task completion** rates

### **Technical Metrics:**
- **AI response time** < 3 seconds
- **Success rate** > 95%
- **Error handling** for all edge cases
- **Guest mode conversion** through AI features

---

**Ready to enhance your productivity with AI-powered task breakdown! 🚀** 
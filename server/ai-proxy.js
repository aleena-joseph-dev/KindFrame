const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.AI_PROXY_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cursor AI Configuration
const CURSOR_AI_ENDPOINT = process.env.CURSOR_AI_ENDPOINT || 'http://localhost:3000/v1/chat/completions';
const CURSOR_AI_KEY = process.env.CURSOR_AI_KEY || '';
const DEFAULT_MODEL = process.env.CURSOR_AI_MODEL || 'gpt-4';
const DEFAULT_MAX_TOKENS = parseInt(process.env.CURSOR_AI_MAX_TOKENS) || 500;
const DEFAULT_TEMPERATURE = parseFloat(process.env.CURSOR_AI_TEMPERATURE) || 0.3;

/**
 * Get task breakdown from Cursor AI
 * POST /api/ai/task-breakdown
 */
app.post('/api/ai/task-breakdown', async (req, res) => {
  try {
    const { jot, detailLevel = 'few' } = req.body;

    if (!jot || typeof jot !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid input: jot is required and must be a string'
      });
    }

    console.log('🤖 AI Task Breakdown Request:', { jot, detailLevel });

    // For development, we'll provide mock responses
    // In production, this would call the actual Cursor AI endpoint
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.log('✅ Development mode: Providing mock AI response');
      
          // Generate mock subtasks based on the input
    const mockSubtasks = generateMockSubtasks(jot, detailLevel);
    
    // Create formatted breakdown
    const formattedBreakdown = formatBreakdown(mockSubtasks);
    
    res.json({
      success: true,
      subtasks: mockSubtasks,
      formattedBreakdown,
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      },
      mode: 'development'
    });
      return;
    }

    // Production mode: Call actual Cursor AI
    // Build the prompt
    const prompt = buildTaskBreakdownPrompt(jot, detailLevel);
    
    // Build the request body
    const requestBody = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      stream: false
    };

    // Make the API call to Cursor AI
    const headers = {
      'Content-Type': 'application/json'
    };

    if (CURSOR_AI_KEY) {
      headers['Authorization'] = `Bearer ${CURSOR_AI_KEY}`;
    }

    const response = await axios.post(CURSOR_AI_ENDPOINT, requestBody, { headers });

    // Parse the response
    const content = response.data.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('No content received from AI');
    }

    // Parse bullet points from AI response
    const subtasks = parseAIResponse(content);

    // Create formatted breakdown
    const formattedBreakdown = formatBreakdown(subtasks);

    console.log('✅ AI Task Breakdown Success:', { subtasksCount: subtasks.length });

    res.json({
      success: true,
      subtasks,
      formattedBreakdown,
      usage: response.data.usage
    });

  } catch (error) {
    console.error('❌ AI Task Breakdown Error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Test Cursor AI connection
 * GET /api/ai/test-connection
 */
app.get('/api/ai/test-connection', async (req, res) => {
  try {
    console.log('🔍 Testing Cursor AI connection...');
    
    // For development, we'll simulate a successful connection
    // In production, this would test the actual Cursor AI endpoint
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.log('✅ Development mode: Simulating successful AI connection');
      res.json({
        success: true,
        connected: true,
        endpoint: CURSOR_AI_ENDPOINT,
        model: DEFAULT_MODEL,
        mode: 'development'
      });
      return;
    }
    
    // Production mode: Test with actual Cursor AI
    const testResponse = await axios.post(CURSOR_AI_ENDPOINT, {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content: 'Test connection'
        }
      ],
      max_tokens: 10,
      temperature: 0.1
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(CURSOR_AI_KEY && { 'Authorization': `Bearer ${CURSOR_AI_KEY}` })
      }
    });

    const isConnected = testResponse.status === 200;
    console.log('🔍 Cursor AI connection test result:', isConnected);

    res.json({
      success: true,
      connected: isConnected,
      endpoint: CURSOR_AI_ENDPOINT,
      model: DEFAULT_MODEL
    });

  } catch (error) {
    console.error('❌ AI Connection Test Failed:', error);
    
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message,
      endpoint: CURSOR_AI_ENDPOINT
    });
  }
});

/**
 * Build the task breakdown prompt
 */
function buildTaskBreakdownPrompt(jot, detailLevel) {
  return `You are an assistant that helps break down a task or idea into actionable subtasks for a to-do list. 
For the following input, return only a bullet list of concrete, actionable steps. 
Each step should start with a verb and be concise. 
Break it down into ${detailLevel === 'few' ? 'few steps' : 'many small steps'} based on the detail level: ${detailLevel}.
Input: ${jot}`;
}

/**
 * Generate mock subtasks for development mode
 */
function generateMockSubtasks(jot, detailLevel) {
  // Analyze the input for dates, times, and recurring patterns
  const lowerJot = jot.toLowerCase();
  const hasDates = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|by friday|at \d+pm?|in \d+ days?)\b/i.test(jot);
  const isRecurring = /\b(weekly|daily|monthly|every day|every week|every month|regular|routine)\b/i.test(jot);
  
  // Generate context-aware tasks based on input
  let tasks = [];
  
  if (lowerJot.includes('market') || lowerJot.includes('store') || lowerJot.includes('buy') || lowerJot.includes('shopping')) {
    tasks = [
      'Make a shopping list',
      'Check what items are needed',
      'Set a budget for purchases',
      'Plan the shopping route',
      'Pack reusable bags',
      'Check store hours and locations'
    ];
  } else if (lowerJot.includes('church') || lowerJot.includes('worship') || lowerJot.includes('service')) {
    tasks = [
      'Check service times',
      'Prepare appropriate attire',
      'Plan transportation',
      'Bring necessary items (bible, offering)',
      'Coordinate with family/friends if attending together',
      'Set reminders for service time'
    ];
  } else if (lowerJot.includes('plan') || lowerJot.includes('organize')) {
    tasks = [
      'Research the topic thoroughly',
      'Create an outline or plan',
      'Set specific goals and deadlines',
      'Gather necessary resources',
      'Start with the most important task',
      'Review and refine your work'
    ];
  } else {
    // Generic task breakdown
    tasks = [
      'Break down the main objective',
      'Identify key steps needed',
      'Set priorities and deadlines',
      'Gather required resources',
      'Create a timeline',
      'Review and adjust as needed'
    ];
  }
  
  // Add date/time context if detected
  if (hasDates) {
    const dateMatch = jot.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|by friday|at \d+pm?|in \d+ days?)\b/i);
    if (dateMatch) {
      tasks = tasks.map(task => `${task} (${dateMatch[0]})`);
    }
  }
  
  // Mark as recurring if detected
  if (isRecurring) {
    tasks = tasks.map(task => `${task} [Recurring]`);
  }
  
  // Use more tasks for 'many' detail level
  const maxTasks = detailLevel === 'many' ? 6 : 4;
  return tasks.slice(0, maxTasks);
}

/**
 * Format subtasks into a readable breakdown
 */
function formatBreakdown(subtasks) {
  const header = "📋 TASK BREAKDOWN\n\n";
  const tasks = subtasks.map((task, index) => `${index + 1}. ${task}`).join('\n');
  const footer = "\n\n💡 You can now save these as todos, notes, or journal entries.";
  
  return header + tasks + footer;
}

/**
 * Parse the AI response to extract subtasks
 */
function parseAIResponse(content) {
  return content
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('•') || 
             trimmed.startsWith('-') || 
             trimmed.startsWith('*') ||
             trimmed.startsWith('1.') ||
             trimmed.startsWith('2.') ||
             trimmed.startsWith('3.') ||
             trimmed.startsWith('4.') ||
             trimmed.startsWith('5.');
    })
    .map(line => {
      // Remove bullet points and numbers
      return line
        .replace(/^[•\-\*]\s*/, '') // Remove bullet points
        .replace(/^\d+\.\s*/, '') // Remove numbered lists
        .trim();
    })
    .filter(task => task.length > 0);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI Proxy',
    version: '1.0.0'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 AI Proxy Server running on port ${PORT}`);
  console.log(`📡 Cursor AI Endpoint: ${CURSOR_AI_ENDPOINT}`);
  console.log(`🤖 Default Model: ${DEFAULT_MODEL}`);
  console.log(`🔑 API Key configured: ${CURSOR_AI_KEY ? 'Yes' : 'No'}`);
});

module.exports = app; 
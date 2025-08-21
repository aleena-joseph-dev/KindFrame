/**
 * Complex Test Setup for KindFrame
 * 
 * Additional setup and mocks specifically for complex input testing scenarios
 */

import { jest } from '@jest/globals';

// Enhanced Deno environment mocking for complex edge function tests
(global as any).Deno = {
  env: {
    get: jest.fn((key: string) => {
      const env: Record<string, string> = {
        'DEEPGRAM_API_KEY': 'test-deepgram-key-complex',
        'CRON_SECRET': 'test-cron-secret-complex',
        'SUPABASE_URL': 'https://test-complex.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key-complex',
        'OPENAI_API_KEY': 'test-openai-key-complex',
        'ANTHROPIC_API_KEY': 'test-anthropic-key-complex',
        'MAX_AUDIO_SIZE': '100MB',
        'MAX_TRANSCRIPTION_LENGTH': '10000',
        'AUDIO_RETENTION_HOURS': '4',
        'PROCESSING_TIMEOUT': '30000'
      };
      return env[key];
    }),
  },
  // Mock Deno.serve for edge function testing
  serve: jest.fn((handler: Function) => {
    return {
      port: 8000,
      handler: handler
    };
  }),
  // Mock Deno.cron for scheduled tasks
  cron: jest.fn((schedule: string, handler: Function) => {
    return {
      schedule,
      handler,
      start: jest.fn(),
      stop: jest.fn()
    };
  })
} as any;

// Enhanced fetch mocking for complex HTTP scenarios
const mockFetchResponses = new Map();

// Setup complex fetch scenarios
mockFetchResponses.set('transcription-success', {
  ok: true,
  json: () => Promise.resolve({
    transcript: {
      id: 'test-transcript-complex',
      rawText: 'I need to call the doctor tomorrow at 3 PM and buy groceries today and complete the quarterly report by Friday and schedule a team meeting next week.',
      cleanedText: 'I need to call the doctor tomorrow at 3 PM and buy groceries today and complete the quarterly report by Friday and schedule a team meeting next week.',
      meta: {
        duration: 45,
        wordCount: 25,
        confidence: 0.89,
        speakers: 1,
        language: 'en-US'
      }
    }
  }),
  text: () => Promise.resolve('Transcription completed successfully'),
  status: 200,
  headers: new Map([['content-type', 'application/json']])
});

mockFetchResponses.set('transcription-low-confidence', {
  ok: true,
  json: () => Promise.resolve({
    transcript: {
      id: 'test-transcript-low-confidence',
      rawText: 'I need to call the doctor tomorrow at 3 PM and buy groceries today.',
      cleanedText: 'I need to call the doctor tomorrow at 3 PM and buy groceries today.',
      meta: {
        duration: 15,
        wordCount: 12,
        confidence: 0.45,
        warnings: ['Background noise detected', 'Multiple speakers detected'],
        language: 'en-US'
      }
    }
  }),
  text: () => Promise.resolve('Transcription completed with low confidence'),
  status: 200,
  headers: new Map([['content-type', 'application/json']])
});

mockFetchResponses.set('transcription-multi-speaker', {
  ok: true,
  json: () => Promise.resolve({
    transcript: {
      id: 'test-transcript-multi-speaker',
      rawText: 'Speaker 1: I need to call the doctor tomorrow. Speaker 2: What time is your appointment? Speaker 1: At 3 PM. Speaker 2: Don\'t forget to buy groceries too.',
      cleanedText: 'I need to call the doctor tomorrow at 3 PM. Don\'t forget to buy groceries too.',
      meta: {
        duration: 30,
        wordCount: 20,
        confidence: 0.78,
        speakers: 2,
        speakerSegments: [
          { speaker: 1, text: 'I need to call the doctor tomorrow.', start: 0, end: 8 },
          { speaker: 2, text: 'What time is your appointment?', start: 9, end: 12 },
          { speaker: 1, text: 'At 3 PM.', start: 13, end: 15 },
          { speaker: 2, text: 'Don\'t forget to buy groceries too.', start: 16, end: 20 }
        ],
        language: 'en-US'
      }
    }
  }),
  text: () => Promise.resolve('Multi-speaker transcription completed'),
  status: 200,
  headers: new Map([['content-type', 'application/json']])
});

mockFetchResponses.set('process-text-success', {
  ok: true,
  json: () => Promise.resolve({
    cleaned_text: 'I need to call the doctor tomorrow at 3 PM and buy groceries today and complete the quarterly report by Friday.',
    items: [
      { type: 'event', title: 'Call the doctor', start: '2024-01-16T15:00:00Z', whenText: 'tomorrow at 3 PM' },
      { type: 'todo', title: 'Buy groceries', whenText: 'today' },
      { type: 'todo', title: 'Complete the quarterly report', due: '2024-01-19T00:00:00Z', whenText: 'by Friday' }
    ],
    suggestion: { inferredType: 'mixed', confidence: 0.92, rationale: 'Multiple types detected with high confidence' },
    followups: ['What time is the doctor appointment?', 'What groceries do you need?']
  }),
  text: () => Promise.resolve('Text processing completed successfully'),
  status: 200,
  headers: new Map([['content-type', 'application/json']])
});

mockFetchResponses.set('process-text-complex', {
  ok: true,
  json: () => Promise.resolve({
    cleaned_text: 'Project Alpha: Research market trends, create wireframes, develop prototype, conduct user testing, gather feedback, iterate design, finalize specifications, prepare presentation, schedule stakeholder review, and submit final proposal.',
    items: [
      { type: 'todo', title: 'Research market trends' },
      { type: 'todo', title: 'Create wireframes' },
      { type: 'todo', title: 'Develop prototype' },
      { type: 'todo', title: 'Conduct user testing' },
      { type: 'todo', title: 'Gather feedback' },
      { type: 'todo', title: 'Iterate design' },
      { type: 'todo', title: 'Finalize specifications' },
      { type: 'todo', title: 'Prepare presentation' },
      { type: 'todo', title: 'Schedule stakeholder review' },
      { type: 'todo', title: 'Submit final proposal' }
    ],
    suggestion: { inferredType: 'todo', confidence: 0.95, rationale: 'All fragments are todos' },
    followups: []
  }),
  text: () => Promise.resolve('Complex text processing completed'),
  status: 200,
  headers: new Map([['content-type', 'application/json']])
});

// Enhanced global fetch mock
(global as any).fetch = jest.fn((url: string, options?: RequestInit) => {
  // Determine response based on URL or request body
  let responseKey = 'transcription-success';
  
  if (url.includes('process_text_func')) {
    responseKey = 'process-text-success';
  } else if (url.includes('transcribe')) {
    // Check request body for complex scenarios
    if (options?.body) {
      try {
        const body = JSON.parse(options.body as string);
        if (body.audio && body.audio.length > 10000) {
          responseKey = 'transcription-low-confidence';
        } else if (body.audio && body.audio.includes('Speaker')) {
          responseKey = 'transcription-multi-speaker';
        }
      } catch {
        // Default response
      }
    }
  }
  
  const response = mockFetchResponses.get(responseKey);
  return Promise.resolve(response);
}) as jest.Mock;

// Mock console methods with enhanced logging for complex tests
const originalConsole = { ...console };

beforeEach(() => {
  console.log = jest.fn((...args) => {
    if (process.env.NODE_ENV === 'test' && process.env.VERBOSE === 'true') {
      originalConsole.log('[COMPLEX-TEST]', ...args);
    }
  });
  
  console.error = jest.fn((...args) => {
    if (process.env.NODE_ENV === 'test') {
      originalConsole.error('[COMPLEX-TEST-ERROR]', ...args);
    }
  });
  
  console.warn = jest.fn((...args) => {
    if (process.env.NODE_ENV === 'test') {
      originalConsole.warn('[COMPLEX-TEST-WARN]', ...args);
    }
  });
  
  console.info = jest.fn((...args) => {
    if (process.env.NODE_ENV === 'test' && process.env.VERBOSE === 'true') {
      originalConsole.info('[COMPLEX-TEST-INFO]', ...args);
    }
  });
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

// Enhanced custom matchers for complex testing
expect.extend({
  toBeValidISODate(received: any) {
    const pass = typeof received === 'string' && !isNaN(Date.parse(received));
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date`,
        pass: false,
      };
    }
  },
  
  toBeValidConfidence(received: any) {
    const pass = typeof received === 'number' && received >= 0 && received <= 1;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid confidence value (0-1)`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid confidence value (0-1)`,
        pass: false,
      };
    }
  },
  
  toBeValidTaskType(received: any) {
    const validTypes = ['todo', 'event', 'task', 'note', 'journal'];
    const pass = validTypes.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid task type`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid task type (${validTypes.join(', ')})`,
        pass: false,
      };
    }
  },
  
  toHaveValidItems(received: any) {
    const pass = Array.isArray(received) && received.length > 0 && 
                 received.every(item => item && typeof item === 'object' && 
                 typeof item.type === 'string' && typeof item.title === 'string');
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid items`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid items with type and title`,
        pass: false,
      };
    }
  }
});

// Global test utilities for complex scenarios
(global as any).createComplexTestInput = (length: number, pattern: string = 'task') => {
  const baseText = 'I need to call the doctor tomorrow and buy groceries today. ';
  const repeated = baseText.repeat(Math.ceil(length / baseText.length));
  return repeated.substring(0, length);
};

(global as any).createMultiTaskInput = (taskCount: number) => {
  const tasks = [
    'Call the doctor tomorrow at 3 PM',
    'Buy groceries including milk and bread',
    'Complete the quarterly report by Friday',
    'Schedule a team meeting next week',
    'Send follow-up emails to all clients',
    'Review and approve the budget proposal',
    'Organize the office supplies',
    'Prepare presentation slides',
    'Book a flight to New York',
    'Renew professional license'
  ];
  
  return tasks.slice(0, taskCount).join('. ') + '.';
};

(global as any).createSpeechErrorInput = () => {
  return 'I need to complaint the task, by groceries, and there are free time to work after lunch.';
};

(global as any).createMultiLanguageInput = () => {
  return 'I need to call el médico tomorrow and comprar groceries today. También necesito completar el reporte by Friday.';
};

(global as any).createTechnicalInput = () => {
  return 'I need to implement the REST API endpoints for user authentication, set up JWT token validation, configure CORS policies, implement rate limiting, add request logging middleware, set up database connection pooling, and deploy to the staging environment using Docker containers.';
};

// Performance monitoring for complex tests
(global as any).measurePerformance = async (fn: Function, iterations: number = 1) => {
  const startTime = performance.now();
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await fn();
    results.push(result);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  const averageDuration = duration / iterations;
  
  return {
    totalDuration: duration,
    averageDuration,
    iterations,
    results
  };
};

// Memory usage monitoring
(global as any).getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage();
  }
  
  // Fallback for environments without process.memoryUsage
  return {
    rss: 0,
    heapTotal: 0,
    heapUsed: 0,
    external: 0
  };
};

console.log('🧪 Complex Test Setup Complete');
console.log('   - Enhanced Deno environment mocking');
console.log('   - Complex fetch response scenarios');
console.log('   - Custom test matchers');
console.log('   - Global test utilities');
console.log('   - Performance monitoring');
console.log('   - Memory usage tracking');

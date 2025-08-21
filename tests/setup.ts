/**
 * Jest Setup File
 * 
 * Global test setup and mocks
 */

// Mock Deno environment for Edge Function tests
(global as any).Deno = {
  env: {
    get: jest.fn((key: string) => {
      const env: Record<string, string> = {
        'DEEPGRAM_API_KEY': 'test-deepgram-key',
        'CRON_SECRET': 'test-cron-secret',
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
      };
      return env[key];
    }),
  },
} as any;

// Mock fetch for HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as jest.Mock;

// Mock SpeechRecognition API
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
  onstart: ((this: MockSpeechRecognition, ev: Event) => any) | null = null;
  onresult: ((this: MockSpeechRecognition, ev: any) => any) | null = null;
  onerror: ((this: MockSpeechRecognition, ev: any) => any) | null = null;
  onend: ((this: MockSpeechRecognition, ev: Event) => any) | null = null;

  start() {
    if (this.onstart) this.onstart(new Event('start'));
  }

  stop() {
    if (this.onend) this.onend(new Event('end'));
  }

  abort() {
    if (this.onend) this.onend(new Event('end'));
  }
}

(global as any).SpeechRecognition = MockSpeechRecognition;
(global as any).webkitSpeechRecognition = MockSpeechRecognition;

// Mock window object for browser APIs
(global as any).window = {
  SpeechRecognition: MockSpeechRecognition,
  webkitSpeechRecognition: MockSpeechRecognition,
};

// Mock console methods to reduce test noise
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

// Add custom matchers if needed
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
});

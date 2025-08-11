/**
 * Jest Setup File
 * 
 * Global test setup and mocks
 */

// Mock Deno environment for Edge Function tests
global.Deno = {
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

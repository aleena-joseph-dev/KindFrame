/**
 * Jest Configuration for Complex Input Tests
 * 
 * Optimized configuration for testing complex inputs, edge cases, and error conditions
 * across all KindFrame text processing and audio transcription systems.
 */

module.exports = {
  // Extend the base configuration
  ...require('./jest.config.js'),
  
  // Test-specific overrides
  testMatch: [
    '**/complexInputs.test.ts',
    '**/audioTranscription.test.ts'
  ],
  
  // Performance optimizations for complex tests
  maxWorkers: 2, // Limit concurrent execution to avoid overwhelming the system
  testTimeout: 30000, // 30 seconds per test for complex processing
  
  // Enhanced coverage for complex scenarios
  collectCoverageFrom: [
    'services/**/*.ts',
    'lib/**/*.ts',
    'supabase/functions/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  coverageDirectory: 'coverage/complex-tests',
  coverageReporters: [
    'text',
    'lcov', 
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds for complex functionality
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './services/': {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90
    },
    './lib/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    },
    './supabase/functions/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  
  // Test results processing - removed for compatibility
  
  // Enhanced setup for complex test scenarios
  setupFilesAfterEnv: [
    '<rootDir>/../tests/setup.ts',
    '<rootDir>/complex-setup.ts'
  ],
  
  // Environment-specific configurations
  testEnvironment: 'node',
  
  // Module name mapping for complex imports - removed for compatibility
  
  // Transform configurations for complex TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        noImplicitAny: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true
      }
    }]
  },
  
  // Global test setup
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true
      }
    }
  },
  
  // Test file patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Watch patterns for development
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/test-results/'
  ],
  
  // Reporter configuration - simplified for compatibility
  reporters: ['default'],
  
  // Verbose output for complex tests
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Collect coverage from specific directories
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    '/dist/',
    '/build/',
    '/test-results/'
  ],
  
  // Coverage collection options
  collectCoverage: true,
  
  // Coverage provider
  coverageProvider: 'v8',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:8082'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(zod|luxon|chrono-node)/)'
  ],
  
  // Snapshot serializers
  snapshotSerializers: [],
  
  // Test location patterns
  roots: [
    '<rootDir>/../tests',
    '<rootDir>/../services',
    '<rootDir>/../lib',
    '<rootDir>/../supabase/functions'
  ]
};

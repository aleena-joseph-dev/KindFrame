#!/usr/bin/env node

/**
 * Complex Input Test Runner for KindFrame
 * 
 * Runs comprehensive tests for complex inputs, edge cases, and error conditions
 * across all text processing and audio transcription systems.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 KindFrame Complex Input Test Suite');
console.log('=====================================\n');

// Test configuration
const testConfig = {
  timeout: 30000, // 30 seconds per test
  verbose: true,
  coverage: true,
  maxWorkers: 2, // Limit concurrent tests to avoid overwhelming the system
  testPathPattern: 'complexInputs|audioTranscription'
};

// Test files to run
const testFiles = [
  'tests/complexInputs.test.ts',
  'tests/audioTranscription.test.ts'
];

// Jest command with configuration
const jestCommand = [
  'npx',
  'jest',
  '--testTimeout=30000',
  '--verbose',
  '--coverage',
  '--maxWorkers=2',
  '--testPathPattern=complexInputs|audioTranscription',
  '--collectCoverageFrom="services/**/*.ts,lib/**/*.ts,supabase/functions/**/*.ts"',
  '--coverageDirectory=coverage/complex-tests',
  '--coverageReporters=text,lcov,html',
  '--testResultsProcessor=jest-junit',
  '--testResultsProcessorOptions.outputFile=test-results/complex-tests.xml'
].join(' ');

console.log('📋 Test Configuration:');
console.log(`   Timeout: ${testConfig.timeout}ms`);
console.log(`   Verbose: ${testConfig.verbose}`);
console.log(`   Coverage: ${testConfig.coverage}`);
console.log(`   Max Workers: ${testConfig.maxWorkers}`);
console.log(`   Test Files: ${testFiles.length}`);
console.log('');

console.log('🧪 Running Complex Input Tests...\n');

try {
  // Create test results directory if it doesn't exist
  execSync('mkdir -p test-results', { stdio: 'inherit' });
  
  // Run the tests
  execSync(jestCommand, { 
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      JEST_WORKER_ID: '1'
    }
  });
  
  console.log('\n✅ All Complex Input Tests Completed Successfully!');
  
} catch (error) {
  console.error('\n❌ Complex Input Tests Failed!');
  console.error('Error:', error.message);
  
  // Exit with error code
  process.exit(1);
}

console.log('\n📊 Test Summary:');
console.log('   - Complex Input Tests: ✅');
console.log('   - Audio Transcription Tests: ✅');
console.log('   - Edge Function Tests: ✅');
console.log('   - Error Handling Tests: ✅');
console.log('   - Performance Tests: ✅');
console.log('   - Integration Tests: ✅');

console.log('\n🎯 Test Coverage Areas:');
console.log('   1. Very Long Inputs (10,000+ characters)');
console.log('   2. Multiple Tasks in Single Input');
console.log('   3. Complex Date and Time Patterns');
console.log('   4. Edge Cases and Error Conditions');
console.log('   5. Speech Recognition Error Corrections');
console.log('   6. Multi-language and Accent Handling');
console.log('   7. Network and Service Errors');
console.log('   8. Input Validation Errors');
console.log('   9. Performance and Scalability');
console.log('   10. End-to-End Integration');

console.log('\n📁 Test Results:');
console.log('   - Coverage Report: coverage/complex-tests/');
console.log('   - Test Results: test-results/complex-tests.xml');
console.log('   - Console Output: Above');

console.log('\n🚀 Complex Input Testing Complete!');

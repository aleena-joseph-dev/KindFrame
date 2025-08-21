# KindFrame Complex Input Testing System

## Overview

This comprehensive testing system validates KindFrame's ability to handle complex inputs, edge cases, and error conditions across all text processing and audio transcription systems. The tests cover very long inputs, multiple tasks, complex date patterns, speech recognition errors, and various failure scenarios.

## 🎯 Test Coverage Areas

### 1. **Very Long Inputs (10,000+ characters)**
- Extremely long text processing
- Long audio recordings (1+ hours)
- Memory usage optimization
- Performance under load

### 2. **Multiple Tasks in Single Input**
- Complex sentence parsing
- Shopping lists with many items
- Project task breakdowns
- Mixed content types

### 3. **Complex Date and Time Patterns**
- Multiple dates in single input
- Relative time expressions
- Fuzzy time handling
- Timezone considerations

### 4. **Edge Cases and Error Conditions**
- Empty/whitespace-only input
- Punctuation-only input
- Special characters and emojis
- Mixed language content

### 5. **Speech Recognition Error Corrections**
- Common misheard words
- Complex error patterns
- Context-aware corrections
- Fallback mechanisms

### 6. **Multi-language and Accent Handling**
- Mixed language speech
- Strong accents and dialects
- Regional variations
- Language detection

### 7. **Network and Service Errors**
- Service unavailable scenarios
- Authentication failures
- Rate limiting
- Network timeouts

### 8. **Input Validation Errors**
- Unsupported formats
- File size limits
- Corrupted data
- Invalid content types

### 9. **Performance and Scalability**
- Large file processing
- Concurrent requests
- Memory constraints
- Resource cleanup

### 10. **End-to-End Integration**
- Complete workflow testing
- Fallback scenarios
- Cross-system compatibility
- Real-world usage patterns

## 🚀 Running the Tests

### Quick Start
```bash
# Run all complex input tests
npm run test:complex

# Run with coverage
npm run test:complex:coverage

# Run in watch mode
npm run test:complex:watch

# Run with custom runner
npm run test:complex:run
```

### Individual Test Files
```bash
# Run specific test suites
npx jest tests/complexInputs.test.ts
npx jest tests/audioTranscription.test.ts

# Run with specific configuration
npx jest --config tests/complex-tests.config.js
```

### Environment Variables
```bash
# Enable verbose logging
VERBOSE=true npm run test:complex

# Set custom timeout
JEST_TIMEOUT=60000 npm run test:complex

# Enable performance monitoring
PERFORMANCE_MONITORING=true npm run test:complex
```

## 📁 Test Structure

### Core Test Files
- **`complexInputs.test.ts`** - Main complex input testing suite
- **`audioTranscription.test.ts`** - Audio processing and transcription tests
- **`complex-tests.config.js`** - Specialized Jest configuration
- **`complex-setup.ts`** - Enhanced test setup and mocks
- **`runComplexTests.js`** - Custom test runner script

### Test Categories

#### 1. **process_text_func Edge Function Tests**
```typescript
describe('1. process_text_func Edge Function - Complex Inputs', () => {
  describe('Very Long Inputs', () => {
    test('should handle extremely long text (10,000+ characters)', async () => {
      // Test implementation
    });
  });
});
```

#### 2. **processTextLocal Service Tests**
```typescript
describe('2. processTextLocal Service - Complex Inputs', () => {
  describe('Complex Task Extraction', () => {
    test('should extract multiple tasks from complex input', () => {
      // Test implementation
    });
  });
});
```

#### 3. **NLP Processing Function Tests**
```typescript
describe('3. NLP Processing Functions - Complex Inputs', () => {
  describe('processText Function', () => {
    test('should handle very long text input', async () => {
      // Test implementation
    });
  });
});
```

#### 4. **Audio Transcription System Tests**
```typescript
describe('Audio Transcription System - Complex Inputs and Edge Cases', () => {
  describe('Complex Audio Inputs', () => {
    test('should handle very long audio recordings', async () => {
      // Test implementation
    });
  });
});
```

## 🧪 Test Utilities

### Global Test Functions
```typescript
// Create complex test input
const longInput = global.createComplexTestInput(10000, 'task');

// Create multi-task input
const multiTaskInput = global.createMultiTaskInput(10);

// Create speech error input
const speechErrorInput = global.createSpeechErrorInput();

// Create multi-language input
const multiLangInput = global.createMultiLanguageInput();

// Create technical input
const technicalInput = global.createTechnicalInput();
```

### Performance Monitoring
```typescript
// Measure function performance
const performance = await global.measurePerformance(async () => {
  return await processText(longInput, 'web');
}, 5);

console.log(`Average duration: ${performance.averageDuration}ms`);
```

### Memory Usage Tracking
```typescript
// Get memory usage
const memoryUsage = global.getMemoryUsage();
console.log(`Heap used: ${memoryUsage.heapUsed} bytes`);
```

## 🔧 Configuration

### Jest Configuration (`complex-tests.config.js`)
```javascript
module.exports = {
  // Performance optimizations
  maxWorkers: 2,
  testTimeout: 30000,
  
  // Enhanced coverage
  collectCoverageFrom: [
    'services/**/*.ts',
    'lib/**/*.ts',
    'supabase/functions/**/*.ts'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Setup (`complex-setup.ts`)
- Enhanced Deno environment mocking
- Complex fetch response scenarios
- Custom test matchers
- Global test utilities
- Performance monitoring
- Memory usage tracking

## 📊 Test Results

### Coverage Reports
- **HTML Coverage**: `coverage/complex-tests/index.html`
- **LCOV Coverage**: `coverage/complex-tests/lcov.info`
- **JSON Summary**: `coverage/complex-tests/coverage-summary.json`

### Test Results
- **JUnit XML**: `test-results/complex-tests.xml`
- **Console Output**: Detailed test execution logs
- **Performance Metrics**: Execution time and memory usage

### Custom Matchers
```typescript
// Valid ISO date
expect(result.start).toBeValidISODate();

// Valid confidence value
expect(result.confidence).toBeValidConfidence();

// Valid task type
expect(result.type).toBeValidTaskType();

// Valid items array
expect(result.items).toHaveValidItems();
```

## 🚨 Error Handling

### Network Errors
- Service unavailable
- Authentication failures
- Rate limiting
- Timeout scenarios

### Input Validation
- Unsupported formats
- File size limits
- Corrupted data
- Invalid content

### System Failures
- Memory constraints
- Resource exhaustion
- Fallback mechanisms
- Graceful degradation

## 📈 Performance Benchmarks

### Expected Performance
- **Text Processing**: < 5 seconds for 10,000+ characters
- **Audio Transcription**: < 30 seconds for 1-hour recordings
- **Memory Usage**: < 100MB peak usage
- **Concurrent Requests**: Support for 5+ simultaneous requests

### Scalability Tests
- Large file processing (100MB+)
- Multiple concurrent users
- Extended usage sessions
- Resource cleanup efficiency

## 🔍 Debugging

### Verbose Logging
```bash
VERBOSE=true npm run test:complex
```

### Individual Test Debugging
```bash
# Run single test with verbose output
npx jest tests/complexInputs.test.ts --verbose --testNamePattern="should handle extremely long text"
```

### Performance Profiling
```bash
PERFORMANCE_MONITORING=true npm run test:complex
```

## 🧹 Maintenance

### Regular Updates
- Update test data for new edge cases
- Add tests for new features
- Update performance benchmarks
- Review and update error scenarios

### Test Data Management
- Rotate test inputs periodically
- Update speech error patterns
- Refresh multi-language examples
- Maintain realistic test scenarios

## 📚 Related Documentation

- [Main Testing Guide](../README.md#testing)
- [Edge Functions Documentation](../supabase/functions/README.md)
- [NLP Processing Guide](../lib/README.md)
- [Audio System Documentation](../services/README.md)

## 🤝 Contributing

### Adding New Tests
1. Identify the edge case or complex scenario
2. Create a descriptive test name
3. Implement comprehensive test logic
4. Add appropriate error handling
5. Update coverage expectations

### Test Standards
- Use descriptive test names
- Include edge case coverage
- Test both success and failure paths
- Validate performance characteristics
- Ensure deterministic results

---

**Note**: These tests are designed to be comprehensive and may take several minutes to complete. They are intended for CI/CD pipelines and thorough validation rather than quick development feedback.

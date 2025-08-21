/**
 * Basic test to verify the setup works
 */

const { processTextLocal } = require('../services/processTextLocal');

describe('Basic Setup Test', () => {
  it('should be able to import and run processTextLocal', () => {
    const result = processTextLocal('call mom');
    
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('should process a simple to-do correctly', () => {
    const result = processTextLocal('call mom');
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe('To-do');
    expect(result.items[0].title).toBe('call mom');
    expect(result.suggested_overall_category).toBe('To-do');
  });
});

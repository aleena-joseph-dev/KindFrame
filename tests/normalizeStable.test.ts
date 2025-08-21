/**
 * Tests for Normalization and Stability
 * Ensures deterministic output and consistent sorting
 */

import { normalizeResultForTesting, processTextLocal } from '../services/processTextLocal';

describe('normalizeStable', () => {
  describe('Array Sorting', () => {
    it('should sort forced_rules_applied deterministically', () => {
      const result1 = processTextLocal('urgent task: call client; buy milk');
      const result2 = processTextLocal('buy milk; urgent task: call client');
      
      const normalized1 = normalizeResultForTesting(result1);
      const normalized2 = normalizeResultForTesting(result2);
      
      // Rules should be sorted alphabetically
      expect(normalized1.forced_rules_applied).toEqual([...normalized1.forced_rules_applied].sort());
      expect(normalized2.forced_rules_applied).toEqual([...normalized2.forced_rules_applied].sort());
    });

    it('should sort warnings deterministically', () => {
      // Create a scenario that generates warnings
      const result = processTextLocal('');
      const normalized = normalizeResultForTesting(result);
      
      expect(normalized.warnings).toEqual([...normalized.warnings].sort());
    });

    it('should sort subtasks within each item', () => {
      const result = processTextLocal('Project: - zebra task - alpha task - beta task');
      const normalized = normalizeResultForTesting(result);
      
      if (normalized.items[0].subtasks.length > 0) {
        expect(normalized.items[0].subtasks).toEqual(['alpha task', 'beta task', 'zebra task']);
      }
    });
  });

  describe('String Trimming', () => {
    it('should trim whitespace from titles', () => {
      const result = processTextLocal('   call mom   ;   buy milk   ');
      const normalized = normalizeResultForTesting(result);
      
      normalized.items.forEach(item => {
        expect(item.title).not.toMatch(/^\\s+|\\s+$/);
      });
    });

    it('should handle empty strings after trimming', () => {
      const result = processTextLocal('call mom;    ;buy milk');
      const normalized = normalizeResultForTesting(result);
      
      // Should not include empty items
      normalized.items.forEach(item => {
        expect(item.title.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce identical results for same input', () => {
      const input = 'call mom; buy milk; meet Alex at Blue Bottle for 45m tomorrow';
      
      const results = Array.from({ length: 10 }, () => {
        return normalizeResultForTesting(processTextLocal(input));
      });
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
    });

    it('should be order-independent for equivalent inputs', () => {
      const input1 = 'call mom; buy milk; send email';
      const input2 = 'send email; call mom; buy milk';
      
      const result1 = normalizeResultForTesting(processTextLocal(input1));
      const result2 = normalizeResultForTesting(processTextLocal(input2));
      
      // Should have same number of items
      expect(result1.items.length).toBe(result2.items.length);
      expect(result1.suggested_overall_category).toBe(result2.suggested_overall_category);
      
      // Should have same rules applied (sorted)
      expect(result1.forced_rules_applied).toEqual(result2.forced_rules_applied);
    });

    it('should handle Unicode and special characters consistently', () => {
      const input = 'café meeting: résumé review & email müller@example.com';
      
      const result1 = normalizeResultForTesting(processTextLocal(input));
      const result2 = normalizeResultForTesting(processTextLocal(input));
      
      expect(result1).toEqual(result2);
      expect(result1.items[0].title).toContain('café');
      expect(result1.items[0].title).toContain('résumé');
    });
  });

  describe('Key Order Consistency', () => {
    it('should maintain consistent object key order', () => {
      const result = processTextLocal('call mom');
      const normalized = normalizeResultForTesting(result);
      
      // Check main object keys
      const mainKeys = Object.keys(normalized);
      expect(mainKeys).toEqual(['items', 'suggested_overall_category', 'forced_rules_applied', 'warnings', 'confidence']);
      
      // Check item object keys
      if (normalized.items.length > 0) {
        const itemKeys = Object.keys(normalized.items[0]);
        expect(itemKeys).toEqual(['type', 'title', 'details', 'due_iso', 'duration_min', 'location', 'subtasks']);
      }
    });

    it('should preserve null values in canonical positions', () => {
      const result = processTextLocal('call mom');
      const normalized = normalizeResultForTesting(result);
      
      if (normalized.items.length > 0) {
        const item = normalized.items[0];
        expect(item).toHaveProperty('details');
        expect(item).toHaveProperty('due_iso');
        expect(item).toHaveProperty('duration_min');
        expect(item).toHaveProperty('location');
        
        // These should be null for a simple "call mom" input
        expect(item.details).toBeNull();
        expect(item.due_iso).toBeNull();
        expect(item.duration_min).toBeNull();
        expect(item.location).toBeNull();
      }
    });
  });

  describe('Performance and Stability', () => {
    it('should process large inputs consistently', () => {
      const largeInput = Array.from({ length: 100 }, (_, i) => 
        `task ${i}: complete item number ${i}`
      ).join('; ');
      
      const start = Date.now();
      const result1 = normalizeResultForTesting(processTextLocal(largeInput));
      const duration1 = Date.now() - start;
      
      const start2 = Date.now();
      const result2 = normalizeResultForTesting(processTextLocal(largeInput));
      const duration2 = Date.now() - start2;
      
      // Should be deterministic
      expect(result1).toEqual(result2);
      
      // Should be reasonably fast (less than 1 second)
      expect(duration1).toBeLessThan(1000);
      expect(duration2).toBeLessThan(1000);
    });

    it('should handle edge cases without throwing', () => {
      const edgeCases = [
        '',
        '   ',
        '\\n\\t\\r',
        ';;;;',
        'a'.repeat(10000), // Very long input
        '🎉🚀💡', // Emojis only
        ';;;call;;;mom;;;', // Multiple delimiters
        'call mom'.repeat(1000) // Repeated content
      ];
      
      edgeCases.forEach(input => {
        expect(() => {
          const result = normalizeResultForTesting(processTextLocal(input));
          expect(result).toBeDefined();
          expect(Array.isArray(result.items)).toBe(true);
          expect(Array.isArray(result.forced_rules_applied)).toBe(true);
          expect(Array.isArray(result.warnings)).toBe(true);
          expect(typeof result.confidence).toBe('number');
        }).not.toThrow();
      });
    });
  });

  describe('Comparison Utilities', () => {
    it('should enable easy testing with normalized results', () => {
      const input = 'buy milk; call mom';
      const result = processTextLocal(input);
      const normalized = normalizeResultForTesting(result);
      
      // Normalized result should be suitable for snapshot testing
      expect(normalized).toMatchSnapshot({
        items: expect.arrayContaining([
          expect.objectContaining({
            type: 'To-do',
            title: expect.any(String),
            subtasks: expect.any(Array)
          })
        ]),
        confidence: expect.any(Number)
      });
    });

    it('should work with deep equality checks', () => {
      const input = 'urgent: call client about project status';
      const result1 = normalizeResultForTesting(processTextLocal(input));
      const result2 = normalizeResultForTesting(processTextLocal(input));
      
      // Deep equality should work
      expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
    });
  });
});

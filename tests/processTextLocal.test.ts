/**
 * Tests for Local Text Processing
 * Ensures deterministic behavior and canonical schema compliance
 */

import { CanonicalSchema, normalizeResultForTesting, processTextLocal, validateOrFallback } from '../services/processTextLocal';

describe('processTextLocal', () => {
  describe('Classification Logic', () => {
    it('should classify meetings as Events', () => {
      const result = processTextLocal('meet Alex tomorrow at 2pm');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('Event');
      expect(result.items[0].title).toBe('meet Alex tomorrow at 2pm');
      expect(result.suggested_overall_category).toBe('Event');
      expect(result.forced_rules_applied).toContain('event_keyword→Event');
    });

    it('should classify action items as To-dos', () => {
      const result = processTextLocal('call mom; buy milk; email Sarah');
      
      expect(result.items).toHaveLength(3);
      expect(result.items.every(item => item.type === 'To-do')).toBe(true);
      expect(result.suggested_overall_category).toBe('To-do');
      expect(result.forced_rules_applied).toContain('todo_keyword→To-do');
    });

    it('should classify work deliverables as Tasks', () => {
      const result = processTextLocal('task: refactor auth flow; deliverable: draft PRD');
      
      expect(result.items).toHaveLength(2);
      expect(result.items.every(item => item.type === 'Task')).toBe(true);
      expect(result.suggested_overall_category).toBe('Task');
      expect(result.forced_rules_applied).toContain('task_keyword→Task');
    });

    it('should classify long reflective text as Journal', () => {
      const longReflection = 'just journaling about my day and reflecting on how well the project went and what I learned from the team meeting today and how I feel about the progress we made';
      const result = processTextLocal(longReflection);
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('Journal');
      expect(result.suggested_overall_category).toBe('Journal');
      expect(result.forced_rules_applied).toContain('long_reflective→Journal');
    });

    it('should default to Note for unclear content', () => {
      const result = processTextLocal('random thoughts and observations');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('Note');
      expect(result.suggested_overall_category).toBe('Note');
      expect(result.forced_rules_applied).toContain('default→Note');
    });
  });

  describe('Date Parsing', () => {
    it('should parse ISO dates correctly', () => {
      const result = processTextLocal('submit report by 2025-01-15');
      
      expect(result.items[0].due_iso).toBe('2025-01-15T00:00:00Z');
      expect(result.forced_rules_applied).toContain('iso_date_detected');
    });

    it('should parse US date format', () => {
      const result = processTextLocal('meeting on 01/15/2025');
      
      expect(result.items[0].due_iso).toBe('2025-01-15T00:00:00Z');
      expect(result.forced_rules_applied).toContain('iso_date_detected');
    });

    it('should parse month names', () => {
      const result = processTextLocal('deadline is January 15, 2025');
      
      expect(result.items[0].due_iso).toBe('2025-01-15T00:00:00Z');
      expect(result.forced_rules_applied).toContain('iso_date_detected');
    });

    it('should not parse invalid dates', () => {
      const result = processTextLocal('meeting sometime soon');
      
      expect(result.items[0].due_iso).toBeNull();
      expect(result.forced_rules_applied).not.toContain('iso_date_detected');
    });
  });

  describe('Duration Parsing', () => {
    it('should parse minutes correctly', () => {
      const result = processTextLocal('meeting for 30 minutes');
      
      expect(result.items[0].duration_min).toBe(30);
      expect(result.forced_rules_applied).toContain('duration_detected');
    });

    it('should parse hours to minutes', () => {
      const result = processTextLocal('workshop for 2 hours');
      
      expect(result.items[0].duration_min).toBe(120);
      expect(result.forced_rules_applied).toContain('duration_detected');
    });

    it('should parse combined hours and minutes', () => {
      const result = processTextLocal('session for 1h 30m');
      
      expect(result.items[0].duration_min).toBe(90);
      expect(result.forced_rules_applied).toContain('duration_detected');
    });

    it('should not parse invalid durations', () => {
      const result = processTextLocal('meeting for a while');
      
      expect(result.items[0].duration_min).toBeNull();
      expect(result.forced_rules_applied).not.toContain('duration_detected');
    });
  });

  describe('Location Parsing', () => {
    it('should parse locations with "at"', () => {
      const result = processTextLocal('meet at Blue Bottle Coffee');
      
      expect(result.items[0].location).toBe('Blue Bottle Coffee');
      expect(result.forced_rules_applied).toContain('location_detected');
    });

    it('should parse locations with "@"', () => {
      const result = processTextLocal('conference @ downtown office');
      
      expect(result.items[0].location).toBe('downtown office');
      expect(result.forced_rules_applied).toContain('location_detected');
    });

    it('should parse locations with "in"', () => {
      const result = processTextLocal('presentation in conference room A');
      
      expect(result.items[0].location).toBe('conference room A');
      expect(result.forced_rules_applied).toContain('location_detected');
    });

    it('should not parse common false positives', () => {
      const result = processTextLocal('meet with the team');
      
      expect(result.items[0].location).toBeNull();
      expect(result.forced_rules_applied).not.toContain('location_detected');
    });
  });

  describe('Subtask Extraction', () => {
    it('should extract bullet point subtasks', () => {
      const result = processTextLocal('Project setup: - Init repo - Setup CI - Create docs');
      
      expect(result.items[0].subtasks).toEqual(['Create docs', 'Init repo', 'Setup CI']);
      expect(result.forced_rules_applied).toContain('subtasks_detected');
    });

    it('should extract numbered subtasks', () => {
      const result = processTextLocal('Plan: 1. Research 2. Design 3. Implement');
      
      expect(result.items[0].subtasks).toEqual(['Design', 'Implement', 'Research']);
      expect(result.forced_rules_applied).toContain('subtasks_detected');
    });

    it('should sort subtasks deterministically', () => {
      const result1 = processTextLocal('Tasks: - zebra - alpha - beta');
      const result2 = processTextLocal('Tasks: - beta - zebra - alpha');
      
      expect(result1.items[0].subtasks).toEqual(result2.items[0].subtasks);
      expect(result1.items[0].subtasks).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('Multiple Items Splitting', () => {
    it('should split on semicolons', () => {
      const result = processTextLocal('call mom; buy groceries; send email');
      
      expect(result.items).toHaveLength(3);
      expect(result.items.map(item => item.title)).toEqual([
        'call mom',
        'buy groceries', 
        'send email'
      ]);
    });

    it('should split on newlines', () => {
      const result = processTextLocal('task one\\ntask two\\ntask three');
      
      expect(result.items).toHaveLength(3);
    });

    it('should split on sentence boundaries for action items', () => {
      const result = processTextLocal('Call Sarah about meeting. Email team with updates.');
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].title).toContain('Call Sarah');
      expect(result.items[1].title).toContain('Email team');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = processTextLocal('');
      
      expect(result.items).toHaveLength(0);
      expect(result.suggested_overall_category).toBe('Note');
      expect(result.warnings).toContain('Empty input text provided');
      expect(result.confidence).toBe(0.6);
    });

    it('should handle whitespace-only input', () => {
      const result = processTextLocal('   \\n\\t   ');
      
      expect(result.items).toHaveLength(0);
      expect(result.warnings).toContain('Empty input text provided');
    });

    it('should handle filler words', () => {
      const result = processTextLocal('um, uh, well... call mom');
      
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('um, uh, well... call mom');
      expect(result.items[0].type).toBe('To-do');
    });

    it('should be deterministic across multiple runs', () => {
      const input = 'call mom; buy milk; meet Alex at 2pm for 1h';
      const result1 = processTextLocal(input);
      const result2 = processTextLocal(input);
      
      expect(normalizeResultForTesting(result1)).toEqual(normalizeResultForTesting(result2));
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence for clear keywords', () => {
      const result = processTextLocal('urgent: call client immediately');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should have medium confidence for task keywords', () => {
      const result = processTextLocal('complete the project documentation');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should have lower confidence for unclear short notes', () => {
      const result = processTextLocal('random note');
      
      expect(result.confidence).toBeLessThanOrEqual(0.6);
    });

    it('should have good confidence for journal entries', () => {
      const result = processTextLocal('Today I feel really good about the progress we made on the project and how the team worked together to solve the challenging problems we encountered');
      
      expect(result.confidence).toBe(0.85);
    });
  });
});

describe('validateOrFallback', () => {
  it('should return valid edge function results', () => {
    const validEdgeResult = {
      items: [{
        type: 'To-do',
        title: 'call mom',
        details: null,
        due_iso: null,
        duration_min: null,
        location: null,
        subtasks: []
      }],
      suggested_overall_category: 'To-do',
      forced_rules_applied: ['edge_processing'],
      warnings: [],
      confidence: 0.9
    };

    const result = validateOrFallback(validEdgeResult, 'call mom');
    
    expect(result).toEqual(validEdgeResult);
  });

  it('should fallback on invalid edge function results', () => {
    const invalidEdgeResult = {
      invalid: 'data',
      missing: 'required fields'
    };

    const result = validateOrFallback(invalidEdgeResult, 'call mom');
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('call mom');
    expect(result.warnings).toContain('Fell back to local processing due to edge function error');
  });

  it('should fallback on null edge function results', () => {
    const result = validateOrFallback(null, 'buy groceries');
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('buy groceries');
    expect(result.warnings).toContain('Fell back to local processing due to edge function error');
  });

  it('should always return valid schema', () => {
    const testCases = [
      { edgeResult: null, text: 'call mom' },
      { edgeResult: { invalid: 'data' }, text: 'buy milk' },
      { edgeResult: undefined, text: 'send email' }
    ];

    testCases.forEach(({ edgeResult, text }) => {
      const result = validateOrFallback(edgeResult, text);
      
      // Should pass Zod schema validation
      expect(() => CanonicalSchema.parse(result)).not.toThrow();
    });
  });
});

describe('Schema Compliance', () => {
  it('should always return canonical schema format', () => {
    const testInputs = [
      'call mom',
      'meet Alex tomorrow',
      'task: complete project',
      'long journal entry about my day and how I feel about everything that happened',
      'buy milk; call doctor; send email',
      ''
    ];

    testInputs.forEach(input => {
      const result = processTextLocal(input);
      
      // Should pass Zod schema validation
      expect(() => CanonicalSchema.parse(result)).not.toThrow();
      
      // Should have required fields
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('suggested_overall_category');
      expect(result).toHaveProperty('forced_rules_applied');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('confidence');
      
      // Items should have correct structure
      result.items.forEach(item => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('details');
        expect(item).toHaveProperty('due_iso');
        expect(item).toHaveProperty('duration_min');
        expect(item).toHaveProperty('location');
        expect(item).toHaveProperty('subtasks');
        
        expect(['Task', 'To-do', 'Event', 'Note', 'Journal']).toContain(item.type);
        expect(Array.isArray(item.subtasks)).toBe(true);
      });
      
      // Confidence should be between 0 and 1
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

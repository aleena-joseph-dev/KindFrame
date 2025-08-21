/**
 * Tests for Context-Aware Transcript Refinement
 * Validates homophone correction and context-faithful transcription
 */
import { refineAlternatives } from '../lib/refineTranscript';

describe('refineAlternatives', () => {
  describe('Core Examples from Requirements', () => {
    test('keeps "have to see they are" over "want to safe there"', () => {
      const alternatives = [
        { transcript: "I want to safe there", confidence: 0.92 },
        { transcript: "I have to see they are", confidence: 0.88 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      
      expect(result.transcript.toLowerCase()).toContain("have to see they are");
      expect(result.transcript.toLowerCase()).not.toContain("want to safe there");
    });

    test('fixes "Buy two eggs and packet of milk" from garbled alternatives', () => {
      const alternatives = [
        { transcript: "By to ex and packet of mild", confidence: 0.94 },
        { transcript: "Buy two egg and packet of milk", confidence: 0.90 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      
      expect(result.transcript.toLowerCase()).toContain("buy two");
      expect(result.transcript.toLowerCase()).toContain("packet of milk");
      expect(result.transcript.toLowerCase()).not.toContain("mild");
    });
  });

  describe('Homophone Confusion Correction', () => {
    test('by/buy/bye confusion', () => {
      const alternatives = [
        { transcript: "by two eggs", confidence: 0.95 },
        { transcript: "buy two eggs", confidence: 0.85 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("buy two eggs");
    });

    test('to/two/too confusion', () => {
      const alternatives = [
        { transcript: "buy to eggs", confidence: 0.93 },
        { transcript: "buy two eggs", confidence: 0.87 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("buy two eggs");
    });

    test('there/their/they\'re confusion', () => {
      const alternatives = [
        { transcript: "see if there free", confidence: 0.91 },
        { transcript: "see if they are free", confidence: 0.83 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("they are free");
    });

    test('milk/mild confusion', () => {
      const alternatives = [
        { transcript: "packet of mild", confidence: 0.89 },
        { transcript: "packet of milk", confidence: 0.81 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("packet of milk");
    });

    test('eggs/ex/egg confusion', () => {
      const alternatives = [
        { transcript: "buy two ex", confidence: 0.92 },
        { transcript: "buy two eggs", confidence: 0.84 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("buy two eggs");
    });

    test('see/sea confusion in context', () => {
      const alternatives = [
        { transcript: "I need to sea if they are free", confidence: 0.88 },
        { transcript: "I need to see if they are free", confidence: 0.82 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("see if they");
    });

    test('are/our confusion', () => {
      const alternatives = [
        { transcript: "they our coming", confidence: 0.87 },
        { transcript: "they are coming", confidence: 0.79 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("they are");
    });
  });

  describe('Context-Aware Scoring', () => {
    test('prefers strong collocations over confidence alone', () => {
      const alternatives = [
        { transcript: "purchase some items", confidence: 0.95 },
        { transcript: "buy two eggs", confidence: 0.75 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      // "buy two eggs" should win due to strong collocation
      expect(result.transcript.toLowerCase()).toContain("buy two eggs");
    });

    test('uses previous context for scoring', () => {
      const alternatives = [
        { transcript: "mild and bread", confidence: 0.90 },
        { transcript: "milk and bread", confidence: 0.82 }
      ];
      
      const result = refineAlternatives(alternatives, { 
        prevText: "I need to buy packet of" 
      });
      
      // Should prefer "milk" due to "packet of milk" collocation
      expect(result.transcript.toLowerCase()).toContain("milk and bread");
    });

    test('handles trigram scoring', () => {
      const alternatives = [
        { transcript: "I want to safe", confidence: 0.91 },
        { transcript: "I have to see", confidence: 0.84 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      // "I have to" is a strong trigram
      expect(result.transcript.toLowerCase()).toContain("i have to");
    });
  });

  describe('Grammar and Consistency', () => {
    test('penalizes impossible grammar sequences', () => {
      const alternatives = [
        { transcript: "a a lot of work", confidence: 0.89 },
        { transcript: "a lot of work", confidence: 0.82 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).not.toContain("a a lot");
    });

    test('preserves numbers as spoken', () => {
      const alternatives = [
        { transcript: "buy 2 eggs", confidence: 0.87 },
        { transcript: "buy two eggs", confidence: 0.83 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      // Should keep whichever was actually spoken (both are valid)
      expect(result.transcript.toLowerCase()).toMatch(/(buy (two|2) eggs)/);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty alternatives gracefully', () => {
      const result = refineAlternatives([], { prevText: "" });
      expect(result.transcript).toBe("");
    });

    test('handles single alternative', () => {
      const alternatives = [
        { transcript: "buy two eggs", confidence: 0.85 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript).toContain("Buy two eggs");
    });

    test('handles missing confidence scores', () => {
      const alternatives = [
        { transcript: "by two ex" }, // No confidence
        { transcript: "buy two eggs", confidence: 0.75 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("buy two eggs");
    });

    test('preserves capitalization appropriately', () => {
      const alternatives = [
        { transcript: "call john tomorrow", confidence: 0.85 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript).toMatch(/^[A-Z]/); // Should start with capital
    });
  });

  describe('Complex Multi-Error Cases', () => {
    test('fixes multiple errors in sequence', () => {
      const alternatives = [
        { transcript: "by to ex and packet of mild", confidence: 0.92 },
        { transcript: "buy two eggs and packet of milk", confidence: 0.78 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("buy two eggs");
      expect(result.transcript.toLowerCase()).toContain("packet of milk");
    });

    test('handles mixed correct and incorrect tokens', () => {
      const alternatives = [
        { transcript: "I want to sea if there free today", confidence: 0.89 },
        { transcript: "I have to see if they are free today", confidence: 0.81 }
      ];
      
      const result = refineAlternatives(alternatives, { prevText: "" });
      expect(result.transcript.toLowerCase()).toContain("have to see if they are free");
    });
  });

  describe('Context Preservation', () => {
    test('maintains context flow with previous text', () => {
      const alternatives = [
        { transcript: "mild", confidence: 0.88 },
        { transcript: "milk", confidence: 0.82 }
      ];
      
      const result = refineAlternatives(alternatives, { 
        prevText: "I need to buy eggs and packet of" 
      });
      
      expect(result.transcript.toLowerCase()).toBe("milk");
    });

    test('does not over-correct when context is weak', () => {
      const alternatives = [
        { transcript: "call there mom", confidence: 0.85 },
        { transcript: "call their mom", confidence: 0.79 }
      ];
      
      const result = refineAlternatives(alternatives, { 
        prevText: "We should" 
      });
      
      // Should prefer "their" due to grammar
      expect(result.transcript.toLowerCase()).toContain("their mom");
    });
  });
});

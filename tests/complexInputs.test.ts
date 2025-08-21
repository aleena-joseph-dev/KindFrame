/**
 * Comprehensive Tests for Complex Inputs and Edge Cases
 * 
 * Tests all text processing systems:
 * - process_text_func edge function
 * - processTextLocal service
 * - NLP processing functions
 * - Audio transcription handling
 * - Error conditions and edge cases
 */

import { previewCleanText, previewExtractTasks, processText } from './mocks/nlpMock';
import { processTextLocal } from '../services/processTextLocal';
import { process_text } from './mocks/processTextMock';

// Mock the supabase client for testing
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'test-token', user: { id: 'test-user' } } },
        error: null
      }))
    }
  }
}));

// Mock fetch for HTTP requests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Complex Input Testing - All Systems', () => {
  const testOptions = {
    timezone: 'Asia/Kolkata',
    userId: 'test-user',
    maxItems: 20,
    nowISO: '2024-01-15T10:00:00Z'
  };

  describe('1. process_text_func Edge Function - Complex Inputs', () => {
    describe('Very Long Inputs', () => {
      test('should handle extremely long text (10,000+ characters)', async () => {
        const longText = 'I need to call the doctor tomorrow and buy groceries. '.repeat(500);
        const result = await process_text(longText, testOptions);
        
        expect(result.cleaned_text).toBeDefined();
        expect(result.cleaned_text.length).toBeLessThan(longText.length);
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.length).toBeLessThanOrEqual(testOptions.maxItems);
        expect(result.suggestion.confidence).toBeGreaterThan(0);
      });

      test('should handle long text with many tasks', async () => {
        const longTaskList = Array.from({ length: 100 }, (_, i) => 
          `Task ${i + 1}: Complete item ${i + 1} by tomorrow. `
        ).join('');
        
        const result = await process_text(longTaskList, testOptions);
        
        expect(result.items.length).toBeLessThanOrEqual(testOptions.maxItems);
        expect(result.items.every(item => item.type === 'todo' || item.type === 'event')).toBe(true);
        expect(result.suggestion.inferredType).toBe('todo');
      });

      test('should handle long text with mixed content types', async () => {
        const mixedContent = [
          'I feel very tired today and had a long day at work. ',
          'I need to call the doctor tomorrow at 3 PM for my appointment. ',
          'Buy groceries including milk, bread, eggs, and vegetables. ',
          'Complete the quarterly report by Friday evening. ',
          'Schedule a meeting with the team next week. ',
          'I remember when I first started this project and how excited I was. ',
          'Send follow-up emails to all clients. ',
          'Review and approve the budget proposal. ',
          'Organize the office supplies and clean the workspace. ',
          'Prepare presentation slides for the board meeting. '
        ].join('').repeat(50);
        
        const result = await process_text(mixedContent, testOptions);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.length).toBeLessThanOrEqual(testOptions.maxItems);
        expect(result.suggestion.inferredType).toBe('mixed');
        expect(result.followups.length).toBeGreaterThan(0);
      });
    });

    describe('Multiple Tasks in Single Input', () => {
      test('should extract multiple tasks from complex sentence', async () => {
        const input = 'I need to call the doctor tomorrow at 3 PM, buy groceries including milk and bread, complete the quarterly report by Friday, schedule a team meeting next week, and send follow-up emails to all clients by the end of the day.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(3);
        expect(result.items.some(item => item.type === 'event')).toBe(true);
        expect(result.items.some(item => item.type === 'todo')).toBe(true);
        expect(result.suggestion.inferredType).toBe('mixed');
      });

      test('should handle shopping list with multiple items', async () => {
        const input = 'Buy groceries: milk, bread, eggs, vegetables, fruits, cheese, yogurt, pasta, rice, beans, tomatoes, onions, garlic, olive oil, salt, pepper, sugar, flour, butter, and honey.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.some(item => item.title.includes('groceries'))).toBe(true);
        expect(result.items.some(item => 
          (item.type === 'todo' && item.notes && item.notes.includes('milk')) ||
          (item.type === 'event' && item.title && item.title.includes('groceries'))
        )).toBe(true);
      });

      test('should handle complex project tasks', async () => {
        const input = 'Project Alpha: Research market trends, create wireframes, develop prototype, conduct user testing, gather feedback, iterate design, finalize specifications, prepare presentation, schedule stakeholder review, and submit final proposal.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(5);
        expect(result.items.every(item => item.type === 'todo')).toBe(true);
        expect(result.suggestion.inferredType).toBe('todo');
      });
    });

    describe('Complex Date and Time Patterns', () => {
      test('should handle multiple dates in single input', async () => {
        const input = 'Call doctor tomorrow at 3 PM, buy groceries today, complete report by Friday evening, schedule meeting next Monday at 10 AM, and submit proposal by January 31st.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(3);
        expect(result.items.some(item => 
          item.type === 'event' && item.start && item.start.includes('2024-01-16')
        )).toBe(true); // tomorrow
        expect(result.items.some(item => 
          item.type === 'event' && item.start && item.start.includes('2024-01-15')
        )).toBe(true); // today
        expect(result.items.some(item => 
          item.type === 'event' && item.start && item.start.includes('2024-01-19')
        )).toBe(true); // Friday
      });

      test('should handle relative time expressions', async () => {
        const input = 'Finish this in 30 minutes, call back in 2 hours, meet in 3 days, and follow up in 1 week.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(2);
        expect(result.items.every(item => item.type === 'event')).toBe(true);
        expect(result.suggestion.inferredType).toBe('event');
      });

      test('should handle fuzzy time expressions', async () => {
        const input = 'Call doctor soon, buy groceries later, complete report someday, and schedule meeting when convenient.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(2);
        expect(result.items.every(item => item.type === 'todo')).toBe(true);
        expect(result.items.some(item => item.type === 'todo' && item.notes && item.notes.includes('soon'))).toBe(true);
        expect(result.items.some(item => item.type === 'todo' && item.notes && item.notes.includes('later'))).toBe(true);
      });
    });

    describe('Edge Cases and Error Conditions', () => {
      test('should handle empty input gracefully', async () => {
        const result = await process_text('', testOptions);
        
        expect(result.cleaned_text).toBe('');
        expect(result.items).toEqual([]);
        expect(result.suggestion.confidence).toBe(0);
        expect(result.followups).toEqual([]);
      });

      test('should handle whitespace-only input', async () => {
        const result = await process_text('   \n\t  ', testOptions);
        
        expect(result.cleaned_text).toBe('');
        expect(result.items).toEqual([]);
        expect(result.suggestion.confidence).toBe(0);
      });

      test('should handle input with only punctuation', async () => {
        const result = await process_text('!!! ??? ... --- ***', testOptions);
        
        expect(result.cleaned_text).toBeDefined();
        expect(result.items).toEqual([]);
        expect(result.suggestion.confidence).toBe(0);
      });

      test('should handle input with only numbers', async () => {
        const result = await process_text('123 456 789 012', testOptions);
        
        expect(result.cleaned_text).toBeDefined();
        expect(result.items).toEqual([]);
        expect(result.suggestion.confidence).toBe(0);
      });

      test('should handle input with special characters', async () => {
        const input = '📞 Call doctor 🏥 tomorrow at 3 PM 🕒 and buy 🛒 groceries 🥛 today!';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.some(item => item.title.includes('doctor'))).toBe(true);
        expect(result.items.some(item => item.title.includes('groceries'))).toBe(true);
      });

      test('should handle mixed languages gracefully', async () => {
        const input = 'I need to call médico tomorrow and comprar groceries today. También necesito completar el reporte.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.cleaned_text).toBeDefined();
      });
    });

    describe('Speech Recognition Error Corrections', () => {
      test('should correct common speech recognition errors', async () => {
        const input = 'I need to complaint the task, by groceries, and there are free time to work after lunch.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.cleaned_text).toContain('complete');
        expect(result.cleaned_text).toContain('buy');
        expect(result.cleaned_text).toContain("they're free");
        expect(result.cleaned_text).toContain('walk after');
      });

      test('should handle complex speech error patterns', async () => {
        const input = 'I need to save if they are feed, and it to book a stay for next week. Later the sweet I will go for a work.';
        
        const result = await process_text(input, testOptions);
        
        expect(result.cleaned_text).toContain('see if they are free');
        expect(result.cleaned_text).toContain('and I need to book');
        expect(result.cleaned_text).toContain('later this evening');
        expect(result.cleaned_text).toContain('go for a walk');
      });
    });
  });

  describe('2. processTextLocal Service - Complex Inputs', () => {
    describe('Very Long Inputs', () => {
      test('should handle extremely long text locally', () => {
        const longText = 'I need to call the doctor tomorrow and buy groceries. '.repeat(500);
        const result = processTextLocal(longText);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.suggested_overall_category).toBeDefined();
      });

      test('should handle long text with many segments', () => {
        const longTaskList = Array.from({ length: 100 }, (_, i) => 
          `Task ${i + 1}: Complete item ${i + 1} by tomorrow. `
        ).join('');
        
        const result = processTextLocal(longTaskList);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.every(item => item.type === 'Task' || item.type === 'To-do' || item.type === 'Event')).toBe(true);
      });
    });

    describe('Complex Task Extraction', () => {
      test('should extract multiple tasks from complex input', () => {
        const input = 'I need to call the doctor tomorrow at 3 PM, buy groceries including milk and bread, complete the quarterly report by Friday, schedule a team meeting next week, and send follow-up emails to all clients by the end of the day.';
        
        const result = processTextLocal(input);
        
        expect(result.items.length).toBeGreaterThan(3);
        expect(result.items.some(item => item.type === 'Event')).toBe(true);
        expect(result.items.some(item => item.type === 'To-do')).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      test('should handle shopping lists with multiple items', () => {
        const input = 'Buy groceries: milk, bread, eggs, vegetables, fruits, cheese, yogurt, pasta, rice, beans, tomatoes, onions, garlic, olive oil, salt, pepper, sugar, flour, butter, and honey.';
        
        const result = processTextLocal(input);
        
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.some(item => item.title.includes('groceries'))).toBe(true);
        expect(result.items.some(item => item.details && item.details.includes('milk'))).toBe(true);
      });
    });

    describe('Edge Cases and Error Handling', () => {
      test('should handle empty input gracefully', () => {
        const result = processTextLocal('');
        
        expect(result.items).toEqual([]);
        expect(result.warnings).toContain('Empty input text provided');
        expect(result.confidence).toBe(0.6);
      });

      test('should handle whitespace-only input', () => {
        const result = processTextLocal('   \n\t  ');
        
        expect(result.items).toEqual([]);
        expect(result.warnings).toContain('Empty input text provided');
      });

      test('should handle input with only punctuation', () => {
        const result = processTextLocal('!!! ??? ... --- ***');
        
        expect(result.items).toEqual([]);
        expect(result.warnings.length).toBeGreaterThan(0);
      });

      test('should handle input with only numbers', () => {
        const result = processTextLocal('123 456 789 012');
        
        expect(result.items).toEqual([]);
        expect(result.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('3. NLP Processing Functions - Complex Inputs', () => {
    describe('processText Function', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            cleaned_text: 'Test cleaned text',
            items: [
              { type: 'todo', title: 'Test task', due: '2024-01-16T00:00:00Z' }
            ],
            suggestion: { inferredType: 'todo', confidence: 0.9, rationale: 'Test' },
            followups: []
          })
        });
      });

      test('should handle very long text input', async () => {
        const longText = 'I need to call the doctor tomorrow and buy groceries. '.repeat(500);
        
        const result = await processText(longText, 'web');
        
        expect(result.transcript.cleanedText).toBeDefined();
        expect(result.tasks.length).toBeGreaterThan(0);
        expect(result.meta.taskCount).toBeGreaterThan(0);
      });

      test('should handle complex multi-task input', async () => {
        const complexInput = 'I need to call the doctor tomorrow at 3 PM, buy groceries including milk and bread, complete the quarterly report by Friday, schedule a team meeting next week, and send follow-up emails to all clients by the end of the day.';
        
        const result = await processText(complexInput, 'web');
        
        expect(result.tasks.length).toBeGreaterThan(3);
        expect(result.meta.platform).toBe('web');
        expect(result.meta.provider).toBeDefined();
      });

      test('should handle input with special characters and emojis', async () => {
        const input = '📞 Call doctor 🏥 tomorrow at 3 PM 🕒 and buy 🛒 groceries 🥛 today!';
        
        const result = await processText(input, 'web');
        
        expect(result.tasks.length).toBeGreaterThan(0);
        expect(result.transcript.cleanedText).toBeDefined();
      });
    });

    describe('previewCleanText Function', () => {
      test('should handle very long text', () => {
        const longText = 'This is a very long text that needs to be cleaned. '.repeat(100);
        const result = previewCleanText(longText);
        
        expect(result.length).toBeLessThan(longText.length);
        expect(result).toContain('This is a very long text');
      });

      test('should handle text with many fillers', () => {
        const input = 'Um, I need to uh call the doctor, you know? Like, it\'s really important and stuff.';
        const result = previewCleanText(input);
        
        expect(result).not.toContain('Um');
        expect(result).not.toContain('uh');
        expect(result).not.toContain('you know');
        expect(result).not.toContain('Like');
        expect(result).not.toContain('stuff');
      });

      test('should handle edge cases', () => {
        expect(previewCleanText('')).toBe('');
        expect(previewCleanText('   ')).toBe('');
        expect(previewCleanText('')).toBe('');
        expect(previewCleanText('')).toBe('');
      });
    });

    describe('previewExtractTasks Function', () => {
      test('should extract tasks from very long text', () => {
        const longText = 'I need to call the doctor tomorrow. I should buy groceries today. '.repeat(50);
        const result = previewExtractTasks(longText);
        
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThanOrEqual(5); // Limited to 5 for preview
        expect(result.every(task => task.confidence === 0.7)).toBe(true);
      });

      test('should handle complex task patterns', () => {
        const input = 'I need to call the doctor tomorrow, should buy groceries today, have to complete the report by Friday, and must schedule a meeting next week.';
        const result = previewExtractTasks(input);
        
        expect(result.length).toBeGreaterThan(2);
        expect(result.some(task => task.title.includes('doctor'))).toBe(true);
        expect(result.some(task => task.title.includes('groceries'))).toBe(true);
        expect(result.some(task => task.title.includes('report'))).toBe(true);
      });

      test('should handle edge cases', () => {
        expect(previewExtractTasks('')).toEqual([]);
        expect(previewExtractTasks('   ')).toEqual([]);
        expect(previewExtractTasks('')).toEqual([]);
        expect(previewExtractTasks('Just some random text without tasks')).toEqual([]);
      });
    });
  });

  describe('4. Error Handling and Edge Cases', () => {
    describe('Network and Service Errors', () => {
      test('should handle network errors gracefully', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));
        
        await expect(processText('Test input', 'web')).rejects.toThrow('We couldn\'t process your text. Please try again.');
      });

      test('should handle service unavailable errors', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ message: 'Service unavailable' })
        });
        
        await expect(processText('Test input', 'web')).rejects.toThrow('Service unavailable');
      });

      test('should handle malformed responses', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ invalid: 'response' })
        });
        
        const result = await processText('Test input', 'web');
        expect(result).toBeDefined();
      });
    });

    describe('Input Validation Errors', () => {
      test('should handle extremely long input', async () => {
        const extremelyLongText = 'A'.repeat(15000);
        
        await expect(processText(extremelyLongText, 'web')).rejects.toThrow('Text content is too long. Please keep it under 10,000 characters');
      });

      test('should handle very short input', async () => {
        const shortText = 'Hi';
        
        await expect(processText(shortText, 'web')).rejects.toThrow('Please provide more text content to process');
      });

      test('should handle invalid input types', async () => {
        await expect(processText('', 'web')).rejects.toThrow();
        await expect(processText('', 'web')).rejects.toThrow();
        await expect(processText('', 'web')).rejects.toThrow();
      });
    });

    describe('Authentication and Authorization Errors', () => {
      test('should handle missing authentication', async () => {
        // Mock no session
        jest.doMock('../lib/supabase', () => ({
          supabase: {
            auth: {
              getSession: jest.fn(() => Promise.resolve({
                data: { session: null },
                error: null
              }))
            }
          }
        }));
        
        await expect(processText('Test input', 'web')).rejects.toThrow('Please sign in to use text processing services');
      });

      test('should handle authentication errors', async () => {
        // Mock session error
        jest.doMock('../lib/supabase', () => ({
          supabase: {
            auth: {
              getSession: jest.fn(() => Promise.resolve({
                data: { session: null },
                error: new Error('Auth error')
              }))
            }
          }
        }));
        
        await expect(processText('Test input', 'web')).rejects.toThrow('Please sign in to use text processing services');
      });
    });
  });

  describe('5. Performance and Scalability Tests', () => {
    describe('Large Input Processing', () => {
      test('should process large input within reasonable time', async () => {
        const largeInput = 'I need to complete task number '.repeat(1000) + 'and finish the project.';
        
        const startTime = Date.now();
        const result = await process_text(largeInput, testOptions);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        expect(result.items.length).toBeGreaterThan(0);
        expect(result.items.length).toBeLessThanOrEqual(testOptions.maxItems);
      });

      test('should handle maximum allowed items', async () => {
        const maxItemsInput = Array.from({ length: 25 }, (_, i) => 
          `Task ${i + 1}: Complete item ${i + 1} by tomorrow. `
        ).join('');
        
        const result = await process_text(maxItemsInput, { ...testOptions, maxItems: 25 });
        
        expect(result.items.length).toBeLessThanOrEqual(25);
        expect(result.suggestion.confidence).toBeGreaterThan(0);
      });
    });

    describe('Memory Usage', () => {
      test('should not crash with extremely large input', async () => {
        const extremelyLargeInput = 'A'.repeat(50000);
        
        // This should not throw or crash
        const result = await process_text(extremelyLargeInput, testOptions);
        
        expect(result).toBeDefined();
        expect(result.cleaned_text).toBeDefined();
        expect(result.items.length).toBeLessThanOrEqual(testOptions.maxItems);
      });
    });
  });

  describe('6. Integration Tests - All Systems Working Together', () => {
    test('should handle complex real-world input through all systems', async () => {
      const realWorldInput = `
        Good morning! I had a really long day yesterday and I'm feeling quite tired today.
        
        Here's what I need to get done:
        1. Call Dr. Smith tomorrow at 3:30 PM for my annual checkup
        2. Buy groceries including milk, bread, eggs, vegetables, and fruits
        3. Complete the quarterly sales report by Friday evening
        4. Schedule a team meeting with marketing and sales next Tuesday at 10 AM
        5. Send follow-up emails to all clients about the new product launch
        6. Review and approve the budget proposal for Q2
        7. Organize the office supplies and clean the workspace
        8. Prepare presentation slides for the board meeting on January 25th
        9. Book a flight to New York for the conference next month
        10. Renew my professional license before it expires
        
        I also need to remember to:
        - Check if the printer is working properly
        - Update my calendar with all these appointments
        - Call mom to wish her happy birthday on Saturday
        
        Personal notes: I'm really excited about the new project we're starting next week. 
        It's going to be challenging but I think we can make it work. The team has been 
        working really hard and I'm proud of everyone's effort.
      `;
      
      // Test through edge function
      const edgeResult = await process_text(realWorldInput, testOptions);
      expect(edgeResult.items.length).toBeGreaterThan(5);
      expect(edgeResult.suggestion.confidence).toBeGreaterThan(0.7);
      
      // Test through local service
      const localResult = processTextLocal(realWorldInput);
      expect(localResult.items.length).toBeGreaterThan(5);
      expect(localResult.confidence).toBeGreaterThan(0.7);
      
      // Test through NLP service (mocked)
      const nlpResult = await processText(realWorldInput, 'web');
      expect(nlpResult.tasks.length).toBeGreaterThan(0);
      expect(nlpResult.meta.taskCount).toBeGreaterThan(0);
    });

    test('should handle fallback scenarios gracefully', async () => {
      const testInput = 'I need to call the doctor tomorrow and buy groceries today.';
      
      // Mock edge function failure
              mockFetch.mockRejectedValue(new Error('Service unavailable'));
      
      // This should fall back to local processing
      const result = await processText(testInput, 'web');
      expect(result).toBeDefined();
    });
  });
});

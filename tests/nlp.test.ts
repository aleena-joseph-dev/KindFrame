/**
 * Unit Tests for Deterministic NLP Functions
 * 
 * Tests cleanText, extractTasks, and parseDue functions
 * Includes edge cases and timezone handling
 */

import { DeterministicNLPProvider } from '../supabase/functions/_shared/providers';

describe('DeterministicNLPProvider', () => {
  let nlpProvider: DeterministicNLPProvider;

  beforeEach(() => {
    nlpProvider = new DeterministicNLPProvider();
  });

  describe('cleanText', () => {
    test('should remove filler words', () => {
      const input = 'Um, I need to uh call the doctor, you know?';
      const result = nlpProvider.cleanText(input);
      expect(result).toBe('I need to call the doctor.');
    });

    test('should apply ND-friendly corrections', () => {
      const input = 'This task is overdue and I failed to complete it';
      const result = nlpProvider.cleanText(input);
      expect(result).toBe('This task is pending and I haven\'t complete it.');
    });

    test('should fix common transcription errors', () => {
      const input = 'I need too do the todo list';
      const result = nlpProvider.cleanText(input);
      expect(result).toBe('I need to do the todo.');
    });

    test('should normalize punctuation and spacing', () => {
      const input = 'Hello   world  !  How are you  ?';
      const result = nlpProvider.cleanText(input);
      expect(result).toBe('Hello world! How are you?');
    });

    test('should capitalize sentences properly', () => {
      const input = 'hello world. this is a test. how are you?';
      const result = nlpProvider.cleanText(input);
      expect(result).toBe('Hello world. This is a test. How are you?');
    });

    test('should add ending punctuation if missing', () => {
      const input = 'This is a sentence without ending';
      const result = nlpProvider.cleanText(input);
      expect(result).toBe('This is a sentence without ending.');
    });

    test('should handle empty or invalid input', () => {
      expect(nlpProvider.cleanText('')).toBe('');
      expect(nlpProvider.cleanText('   ')).toBe('');
      expect(nlpProvider.cleanText(null as any)).toBe('');
      expect(nlpProvider.cleanText(undefined as any)).toBe('');
    });
  });

  describe('extractTasks', () => {
    test('should extract tasks with action verbs', () => {
      const input = 'I need to call the doctor and buy groceries.';
      const tasks = nlpProvider.extractTasks(input);
      
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('call the doctor');
      expect(tasks[1].title).toBe('buy groceries');
      expect(tasks[0].priority).toBe('med');
      expect(tasks[1].priority).toBe('low');
    });

    test('should extract tasks from bullet lists', () => {
      const input = '• Call doctor\n- Buy milk\n* Finish report';
      const tasks = nlpProvider.extractTasks(input);
      
      expect(tasks).toHaveLength(3);
      expect(tasks.map(t => t.title)).toContain('Call doctor');
      expect(tasks.map(t => t.title)).toContain('Buy milk');
      expect(tasks.map(t => t.title)).toContain('Finish report');
    });

    test('should extract hashtags as tags', () => {
      const input = 'Need to buy groceries #shopping #urgent';
      const tasks = nlpProvider.extractTasks(input);
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('buy groceries');
      expect(tasks[0].tags).toEqual(['shopping', 'urgent']);
    });

    test('should extract priority markers', () => {
      const input = 'Need to call doctor p0 and buy milk p3';
      const tasks = nlpProvider.extractTasks(input);
      
      expect(tasks).toHaveLength(2);
      const doctorTask = tasks.find(t => t.title.includes('doctor'));
      const milkTask = tasks.find(t => t.title.includes('milk'));
      
      expect(doctorTask?.priority).toBe('high');
      expect(milkTask?.priority).toBe('low');
    });

    test('should set appropriate priorities based on action type', () => {
      const input = 'Need to submit report, review notes, and buy coffee';
      const tasks = nlpProvider.extractTasks(input);
      
      const submitTask = tasks.find(t => t.title.includes('submit'));
      const reviewTask = tasks.find(t => t.title.includes('review'));
      const buyTask = tasks.find(t => t.title.includes('buy'));
      
      expect(submitTask?.priority).toBe('high');
      expect(reviewTask?.priority).toBe('low');
      expect(buyTask?.priority).toBe('low');
    });

    test('should handle empty or invalid input', () => {
      expect(nlpProvider.extractTasks('')).toEqual([]);
      expect(nlpProvider.extractTasks('   ')).toEqual([]);
      expect(nlpProvider.extractTasks(null as any)).toEqual([]);
      expect(nlpProvider.extractTasks('Just some random text without tasks')).toEqual([]);
    });

    test('should deduplicate similar tasks', () => {
      const input = 'Need to call doctor. Should call the doctor.';
      const tasks = nlpProvider.extractTasks(input);
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('call doctor');
    });
  });

  describe('parseDue', () => {
    const mockDate = new Date('2024-01-15T10:00:00Z'); // Monday
    
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should parse "today" correctly', () => {
      const result = nlpProvider.parseDue('Do this today');
      expect(result).toBe('2024-01-15');
    });

    test('should parse "tomorrow" correctly', () => {
      const result = nlpProvider.parseDue('Do this tomorrow');
      expect(result).toBe('2024-01-16');
    });

    test('should parse "this week" as Friday', () => {
      const result = nlpProvider.parseDue('Finish this week');
      expect(result).toBe('2024-01-19'); // Friday
    });

    test('should parse "next week" correctly', () => {
      const result = nlpProvider.parseDue('Start next week');
      expect(result).toBe('2024-01-22'); // Next Monday
    });

    test('should parse specific weekdays', () => {
      const result = nlpProvider.parseDue('Meet on Friday');
      expect(result).toBe('2024-01-19'); // This Friday
    });

    test('should parse "next" weekdays', () => {
      const result = nlpProvider.parseDue('Call next Wednesday');
      expect(result).toBe('2024-01-24'); // Next Wednesday
    });

    test('should parse month names with days', () => {
      const result = nlpProvider.parseDue('Due January 20');
      expect(result).toBe('2024-01-20');
    });

    test('should parse numeric dates (MM/DD format)', () => {
      const result = nlpProvider.parseDue('Due 01/25');
      expect(result).toBe('2024-01-25');
    });

    test('should parse ISO dates (YYYY-MM-DD format)', () => {
      const result = nlpProvider.parseDue('Due 2024-02-15');
      expect(result).toBe('2024-02-15');
    });

    test('should parse relative time patterns', () => {
      const result = nlpProvider.parseDue('Finish in 3 days');
      expect(result).toBe('2024-01-18');
    });

    test('should handle past month dates by assuming next year', () => {
      // Current date is January 15, so December should be next year
      const result = nlpProvider.parseDue('Finish December 25');
      expect(result).toBe('2024-12-25');
    });

    test('should return undefined for unrecognized patterns', () => {
      expect(nlpProvider.parseDue('No date here')).toBeUndefined();
      expect(nlpProvider.parseDue('')).toBeUndefined();
      expect(nlpProvider.parseDue(null as any)).toBeUndefined();
    });
  });

  describe('process (integration)', () => {
    test('should process complete text with tasks and due dates', async () => {
      const input = 'I need to call the doctor tomorrow and buy groceries today #shopping.';
      const result = await nlpProvider.process(input, 'web');
      
      expect(result.cleanedText).toBe('I need to call the doctor tomorrow and buy groceries today.');
      expect(result.tasks).toHaveLength(2);
      
      const doctorTask = result.tasks.find(t => t.title.includes('doctor'));
      const groceryTask = result.tasks.find(t => t.title.includes('groceries'));
      
      expect(doctorTask?.due).toBeDefined();
      expect(groceryTask?.due).toBeDefined();
      expect(groceryTask?.tags).toContain('shopping');
      
      expect(result.meta?.provider).toBe('deterministic');
      expect(result.meta?.platform).toBe('web');
    });

    test('should handle complex input with multiple patterns', async () => {
      const input = `
        My todo list:
        • Call doctor tomorrow p1 #health
        • Buy groceries today #shopping
        • Finish report by Friday !
        Also need to review notes and maybe call mom.
      `;
      
      const result = await nlpProvider.process(input, 'android');
      
      expect(result.tasks.length).toBeGreaterThan(3);
      expect(result.cleanedText).toContain('My todo list');
      expect(result.meta?.platform).toBe('android');
      
      // Check that all task types are recognized
      const taskTitles = result.tasks.map(t => t.title);
      expect(taskTitles.some(title => title.includes('doctor'))).toBe(true);
      expect(taskTitles.some(title => title.includes('groceries'))).toBe(true);
      expect(taskTitles.some(title => title.includes('report'))).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle very long text', async () => {
      const longText = 'I need to call doctor. '.repeat(1000);
      const result = await nlpProvider.process(longText, 'web');
      
      expect(result.cleanedText).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    test('should handle special characters and emojis', async () => {
      const input = '📞 Call doctor 🏥 and buy 🛒 groceries!';
      const result = await nlpProvider.process(input, 'web');
      
      expect(result.cleanedText).toContain('Call doctor');
      expect(result.tasks.length).toBeGreaterThan(0);
    });

    test('should handle mixed languages gracefully', async () => {
      const input = 'I need to call médico and comprar groceries';
      const result = await nlpProvider.process(input, 'web');
      
      expect(result.cleanedText).toBeDefined();
      expect(result.tasks).toBeDefined();
    });

    test('should handle only punctuation or numbers', async () => {
      const input = '!!! 123 ??? 456 ...';
      const result = await nlpProvider.process(input, 'web');
      
      expect(result.cleanedText).toBeDefined();
      expect(result.tasks).toEqual([]);
    });
  });
});

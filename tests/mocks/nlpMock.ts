/**
 * Mock implementation of nlp functions for testing
 * This avoids SpeechRecognition API dependencies
 */

export function previewCleanText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^\w\s.,!?]/g, '');
}

export function previewExtractTasks(text: string): Array<{title: string, priority: string, tags: string[], confidence: number}> {
  if (!text || typeof text !== 'string') return [];
  
  const tasks: Array<{title: string, priority: string, tags: string[], confidence: number}> = [];
  
  // Simple task extraction for testing
  const taskPatterns = [
    /(?:need to|should|must|have to|want to)\s+([^.!?]+)/gi,
    /(?:buy|purchase|get)\s+([^.!?]+)/gi,
    /(?:call|phone|contact)\s+([^.!?]+)/gi,
    /(?:complete|finish|do)\s+([^.!?]+)/gi,
  ];

  for (const pattern of taskPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && tasks.length < 5) {
        tasks.push({
          title: match[1].trim(),
          priority: 'med',
          tags: [],
          confidence: 0.7,
        });
      }
    }
  }

  return tasks;
}

export async function processText(text: string, platform: string): Promise<any> {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input');
  }

  if (text.length > 10000) {
    throw new Error('Text content is too long. Please keep it under 10,000 characters');
  }

  // Mock response for testing
  return {
    cleanedText: previewCleanText(text),
    tasks: previewExtractTasks(text),
    platform,
    timestamp: new Date().toISOString(),
  };
}

// Mock speech recognition functions
export function createSpeechRecognition(): any {
  return null; // Mock implementation
}

export function startSpeechRecognition(
  recognition: any,
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void
): void {
  // Mock implementation
}

export function stopSpeechRecognition(recognition: any): void {
  // Mock implementation
}

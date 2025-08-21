/**
 * Mock implementation of process_text for testing
 * This simulates the Supabase Edge Function behavior without Deno dependencies
 */

import { z } from 'zod';

// Mock schemas based on the actual edge function
const ProcessItemSchema = z.union([
  z.object({
    type: z.literal('todo'),
    title: z.string(),
    notes: z.string().optional(),
    due: z.string().optional(),
    priority: z.enum(['low', 'med', 'high']).optional(),
    tags: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal('event'),
    title: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
]);

const ProcessResultSchema = z.object({
  cleaned_text: z.string(),
  items: z.array(ProcessItemSchema),
  suggestion: z.object({
    inferredType: z.string(),
    confidence: z.number(),
  }),
  followups: z.array(z.string()),
});

export type ProcessItem = z.infer<typeof ProcessItemSchema>;
export type ProcessResult = z.infer<typeof ProcessResultSchema>;

interface ProcessOptions {
  timezone: string;
  userId: string;
  maxItems: number;
  nowISO: string;
}

// Mock implementation that simulates the edge function behavior
export async function process_text(
  input: string,
  options: ProcessOptions
): Promise<ProcessResult> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 10));

  // Basic text cleaning
  const cleaned_text = input
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^\w\s.,!?]/g, '');

  // Extract basic tasks (simplified version)
  const items: ProcessItem[] = [];
  
  // Look for task indicators
  const taskPatterns = [
    /(?:need to|should|must|have to|want to)\s+([^.!?]+)/gi,
    /(?:buy|purchase|get)\s+([^.!?]+)/gi,
    /(?:call|phone|contact)\s+([^.!?]+)/gi,
    /(?:complete|finish|do)\s+([^.!?]+)/gi,
    /(?:schedule|book|arrange)\s+([^.!?]+)/gi,
  ];

  for (const pattern of taskPatterns) {
    const matches = input.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && items.length < options.maxItems) {
        items.push({
          type: 'todo',
          title: match[1].trim(),
          priority: 'med',
          tags: [],
        });
      }
    }
  }

  // Look for event indicators
  const eventPatterns = [
    /(?:meeting|appointment|call)\s+(?:with|at|on)\s+([^.!?]+)/gi,
    /(?:tomorrow|today|next week|this week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  ];

  for (const pattern of eventPatterns) {
    const matches = input.matchAll(pattern);
    for (const match of matches) {
      if (items.length < options.maxItems) {
        items.push({
          type: 'event',
          title: `Event: ${match[0]}`,
          tags: [],
        });
      }
    }
  }

  // Deduplicate items
  const uniqueItems = items.filter((item, index, self) => 
    index === self.findIndex(i => i.title === item.title)
  );

  // Limit to maxItems
  const limitedItems = uniqueItems.slice(0, options.maxItems);

  // Determine inferred type
  let inferredType = 'mixed';
  if (limitedItems.every(item => item.type === 'todo')) {
    inferredType = 'todo';
  } else if (limitedItems.every(item => item.type === 'event')) {
    inferredType = 'event';
  }

  // Generate followups
  const followups = [];
  if (limitedItems.length === 0) {
    followups.push('No specific tasks or events found. Try being more specific.');
  }
  if (limitedItems.length >= options.maxItems) {
    followups.push(`Limited to ${options.maxItems} items. Consider breaking down into smaller tasks.`);
  }

  return {
    cleaned_text,
    items: limitedItems,
    suggestion: {
      inferredType,
      confidence: limitedItems.length > 0 ? 0.8 : 0.3,
    },
    followups,
  };
}

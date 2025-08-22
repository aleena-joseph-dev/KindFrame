/**
 * Test Data for AI Breakdown Results
 * Use this to test the enhanced UI components
 */

import { AIResultItem } from '@/components/ui/AIResultCard';

export const mockAIBreakdownResults = {
  tasks: [
    {
      title: "Call mom tomorrow 6pm",
      notes: "Need to check on her health and discuss weekend plans",
      priority: "high" as const,
      due: { 
        iso: "2025-01-28T18:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      reminder: { 
        iso: "2025-01-28T17:30:00+05:30", 
        lead_minutes: 30 
      },
      tags: ["personal", "family"]
    },
    {
      title: "Complete project proposal",
      notes: "Finish the Q1 marketing strategy document for client review",
      priority: "medium" as const,
      due: { 
        iso: "2025-01-27T17:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      tags: ["work", "urgent"]
    }
  ],
  todos: [
    {
      title: "Buy groceries",
      notes: "Milk, eggs, bread, vegetables for the week",
      priority: "normal" as const,
      due: { 
        iso: "2025-01-26T20:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      tags: ["shopping", "home"]
    },
    {
      title: "Schedule dentist appointment",
      notes: "Check for available slots next week",
      priority: "low" as const,
      tags: ["health", "personal"]
    }
  ],
  events: [
    {
      title: "Team sync meeting",
      notes: "Weekly standup to discuss project progress and blockers",
      start: { 
        iso: "2025-01-27T10:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      end: { 
        iso: "2025-01-27T11:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      location: "Conference Room A",
      attendees: ["john@company.com", "sarah@company.com"],
      tags: ["work", "meeting"]
    },
    {
      title: "Doctor appointment",
      notes: "Annual health checkup",
      start: { 
        iso: "2025-01-28T14:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      end: { 
        iso: "2025-01-28T15:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      location: "City Medical Center",
      tags: ["health", "personal"]
    },
    {
      title: "Birthday party",
      notes: "Celebrate Sarah's 30th birthday",
      start: { 
        iso: "2025-01-29T19:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      end: { 
        iso: "2025-01-29T23:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      location: "Sarah's house",
      attendees: ["friends@email.com"],
      tags: ["social", "celebration"]
    }
  ]
};

// Test data with missing fields to test validation
export const mockIncompleteResults = {
  tasks: [
    {
      title: "Task without due date",
      notes: "This task is missing a due date",
      priority: "normal" as const,
      tags: ["work"]
    }
  ],
  todos: [],
  events: [
    {
      title: "Event without time",
      notes: "This event is missing start and end times",
      tags: ["personal"]
    },
    {
      title: "Event with invalid times",
      notes: "End time is before start time",
      start: { 
        iso: "2025-01-27T15:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      end: { 
        iso: "2025-01-27T14:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      tags: ["work"]
    }
  ]
};

// Test data for all-day events
export const mockAllDayEvents = {
  tasks: [],
  todos: [],
  events: [
    {
      title: "Company holiday",
      notes: "Office closed for New Year",
      start: { 
        iso: "2025-01-01T00:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      end: { 
        iso: "2025-01-01T00:00:00+05:30",
        tz: "Asia/Kolkata"
      },
      all_day: true,
      tags: ["work", "holiday"]
    }
  ]
};

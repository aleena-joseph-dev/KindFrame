# KindFrame Text Processing Examples

This document provides canonical examples of how the text processing system (both edge function and local fallback) handles different types of input and their expected outputs.

## Overview

The text processing system uses:

1. **Edge Function First**: Groq API with llama-3.1-70b-versatile model (deterministic parameters)
2. **Local Fallback**: Rule-based processing when edge function fails/times out
3. **Canonical Schema**: Both paths return identical output format

## Example Inputs and Expected Outputs

### 1. Meeting with Location and Duration

**Input:**

```
tomorrow 9:30 meet Alex at Blue Bottle for 45m
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "Event",
      "title": "meet Alex",
      "details": null,
      "due_iso": "2025-01-12T09:30:00Z",
      "duration_min": 45,
      "location": "Blue Bottle",
      "subtasks": []
    }
  ],
  "suggested_overall_category": "Event",
  "forced_rules_applied": [
    "event_keyword→Event",
    "duration_detected",
    "location_detected"
  ],
  "warnings": [],
  "confidence": 0.9
}
```

### 2. Multiple To-Do Items

**Input:**

```
buy milk; call mom; email Sarah about invoice
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "To-do",
      "title": "buy milk",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    },
    {
      "type": "To-do",
      "title": "call mom",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    },
    {
      "type": "To-do",
      "title": "email Sarah about invoice",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    }
  ],
  "suggested_overall_category": "To-do",
  "forced_rules_applied": ["todo_keyword→To-do"],
  "warnings": [],
  "confidence": 0.85
}
```

### 3. Work Tasks with Deliverables

**Input:**

```
task: refactor auth flow; deliverable: draft PRD
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "Task",
      "title": "refactor auth flow",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    },
    {
      "type": "Task",
      "title": "draft PRD",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    }
  ],
  "suggested_overall_category": "Task",
  "forced_rules_applied": ["task_keyword→Task"],
  "warnings": [],
  "confidence": 0.9
}
```

### 4. Journal Entry

**Input:**

```
just journaling about my day—no plans, just reflecting on how well the project went and what I learned from the team meeting today
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "Journal",
      "title": "just journaling about my day—no plans, just reflecting on how well the project went and what I learned from the team meeting today",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    }
  ],
  "suggested_overall_category": "Journal",
  "forced_rules_applied": ["long_reflective→Journal"],
  "warnings": [],
  "confidence": 0.85
}
```

### 5. Mixed Content with Date

**Input:**

```
Schedule dentist appointment for Friday 2pm and remember to buy gift for mom's birthday next week
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "Event",
      "title": "Schedule dentist appointment",
      "details": null,
      "due_iso": "2025-01-17T14:00:00Z",
      "duration_min": null,
      "location": null,
      "subtasks": []
    },
    {
      "type": "To-do",
      "title": "buy gift for mom's birthday",
      "details": null,
      "due_iso": "2025-01-19T00:00:00Z",
      "duration_min": null,
      "location": null,
      "subtasks": []
    }
  ],
  "suggested_overall_category": "Event",
  "forced_rules_applied": [
    "event_keyword→Event",
    "todo_keyword→To-do",
    "iso_date_detected"
  ],
  "warnings": [],
  "confidence": 0.9
}
```

### 6. Empty or Invalid Input

**Input:**

```
um, uh, well...
```

**Expected Output:**

```json
{
  "items": [],
  "suggested_overall_category": "Note",
  "forced_rules_applied": [],
  "warnings": ["No actionable items detected"],
  "confidence": 0.6
}
```

### 7. Priority and Date Parsing

**Input:**

```
urgent: submit report by 2025-01-15 for quarterly review
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "Task",
      "title": "submit report for quarterly review",
      "details": null,
      "due_iso": "2025-01-15T00:00:00Z",
      "duration_min": null,
      "location": null,
      "subtasks": []
    }
  ],
  "suggested_overall_category": "Task",
  "forced_rules_applied": ["task_keyword→Task", "iso_date_detected"],
  "warnings": [],
  "confidence": 0.9
}
```

### 8. List Format with Subtasks

**Input:**

```
Project setup: 1. Initialize repository 2. Set up CI/CD 3. Create documentation structure
```

**Expected Output:**

```json
{
  "items": [
    {
      "type": "Task",
      "title": "Project setup",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": [
        "Initialize repository",
        "Set up CI/CD",
        "Create documentation structure"
      ]
    }
  ],
  "suggested_overall_category": "Task",
  "forced_rules_applied": ["task_keyword→Task", "subtasks_detected"],
  "warnings": [],
  "confidence": 0.9
}
```

## Classification Rules

### Event Detection

- **Keywords**: reminder, appointment, meeting, meet, schedule
- **Patterns**: Time indicators (9:30, 2pm), calendar-like language
- **Priority**: High (meetings are time-sensitive)

### To-do Detection

- **Keywords**: call, email, buy, send, pay, book, renew, pick up
- **Patterns**: Action verbs without fixed time
- **Priority**: Medium (actionable but flexible timing)

### Task Detection

- **Keywords**: task, deliverable, complete, implement, develop, create
- **Patterns**: Work-related explicit deliverables
- **Priority**: Medium (structured work items)

### Note Detection

- **Default fallback** for informational content
- **Short text** without clear action verbs
- **Priority**: Low (reference material)

### Journal Detection

- **Long text** (>25 words) with reflective language
- **Keywords**: feel, think, today, remember, realize
- **Priority**: Low (personal reflection)

## Fallback Behavior

When the edge function fails or times out:

1. **Local Processing Triggers** automatically
2. **Warning Added**: "Fell back to local processing due to edge function error"
3. **Same Schema**: Identical output format maintained
4. **Deterministic Rules**: Regex-based classification ensures consistent results
5. **Performance**: Local processing completes in <100ms

## Testing the System

To test both paths:

```typescript
import {
  processTextLocal,
  validateOrFallback,
} from "@/services/processTextLocal";

// Test local processing directly
const localResult = processTextLocal("call mom tomorrow");

// Test edge function with fallback
const edgeResult = await TranscriptionService.processTextWithFallback(
  "call mom tomorrow",
  "web"
);
```

Both should return structurally identical results with the same confidence and classification logic.

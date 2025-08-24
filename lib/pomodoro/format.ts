// Pomodoro Time Formatting Utilities
// This file contains time formatting functions for the Pomodoro system

import { HourFormat } from './types';

/**
 * Format seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into MM:SS format with hours if needed
 */
export function formatTimeExtended(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time for display based on hour format preference
 */
export function formatTimeForDisplay(date: Date, hourFormat: HourFormat): string {
  if (hourFormat === '12h') {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } else {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}

/**
 * Calculate estimated completion time
 */
export function getEstimatedCompletionTime(secondsRemaining: number): Date {
  return new Date(Date.now() + secondsRemaining * 1000);
}

/**
 * Format estimated completion time
 */
export function formatEstimatedCompletionTime(secondsRemaining: number, hourFormat: HourFormat): string {
  const completionTime = getEstimatedCompletionTime(secondsRemaining);
  return formatTimeForDisplay(completionTime, hourFormat);
}

/**
 * Convert minutes to seconds
 */
export function minutesToSeconds(minutes: number): number {
  return minutes * 60;
}

/**
 * Convert seconds to minutes
 */
export function secondsToMinutes(seconds: number): number {
  return Math.ceil(seconds / 60);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Get time remaining as percentage
 */
export function getTimeRemainingPercentage(totalSeconds: number, remainingSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));
}

/**
 * Format pomodoro count (e.g., "1/4", "2/8")
 */
export function formatPomodoroCount(completed: number, total: number): string {
  return `${completed}/${total}`;
}

/**
 * Get progress text for current session
 */
export function getProgressText(
  mode: 'focus' | 'short_break' | 'long_break',
  focusCount: number,
  totalFocus: number
): string {
  switch (mode) {
    case 'focus':
      return `#${focusCount} Time to focus!`;
    case 'short_break':
      return 'Short break time!';
    case 'long_break':
      return 'Long break time!';
    default:
      return 'Time to focus!';
  }
}

/**
 * Get session summary text
 */
export function getSessionSummaryText(
  mode: 'focus' | 'short_break' | 'long_break',
  duration: number,
  linkedItem?: { title: string | null }
): string {
  const durationText = formatDuration(duration);
  
  if (linkedItem?.title && mode === 'focus') {
    return `Focusing on: ${linkedItem.title}`;
  }
  
  switch (mode) {
    case 'focus':
      return `Focus session - ${durationText}`;
    case 'short_break':
      return `Short break - ${durationText}`;
    case 'long_break':
      return `Long break - ${durationText}`;
    default:
      return `Session - ${durationText}`;
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AnyItem } from './types';

const QUEUE_KEY = "quickjot:pending-saves";

export type SaveJob = { 
  id: string; 
  createdAt: number; 
  payload: AnyItem[];
  retryCount: number;
  maxRetries: number;
};

/**
 * Add a save job to the offline queue
 */
export async function enqueueSave(payload: AnyItem[]): Promise<string> {
  const job: SaveJob = { 
    id: crypto.randomUUID(), 
    createdAt: Date.now(), 
    payload,
    retryCount: 0,
    maxRetries: 3
  };
  
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY) ?? "[]";
    const list = JSON.parse(raw) as SaveJob[];
    list.push(job);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
    console.log('📱 Offline: Queued save job', job.id, 'with', payload.length, 'items');
    return job.id;
  } catch (error) {
    console.error('📱 Offline: Failed to queue save job:', error);
    throw error;
  }
}

/**
 * Get all pending save jobs
 */
export async function getPendingJobs(): Promise<SaveJob[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY) ?? "[]";
    return JSON.parse(raw) as SaveJob[];
  } catch (error) {
    console.error('📱 Offline: Failed to get pending jobs:', error);
    return [];
  }
}

/**
 * Remove a job from the queue (after successful save)
 */
export async function removeJob(jobId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY) ?? "[]";
    const list = JSON.parse(raw) as SaveJob[];
    const filtered = list.filter(job => job.id !== jobId);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    console.log('📱 Offline: Removed completed job', jobId);
  } catch (error) {
    console.error('📱 Offline: Failed to remove job:', error);
  }
}

/**
 * Update retry count for a job
 */
export async function updateJobRetry(jobId: string, retryCount: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY) ?? "[]";
    const list = JSON.parse(raw) as SaveJob[];
    const job = list.find(j => j.id === jobId);
    if (job) {
      job.retryCount = retryCount;
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
    }
  } catch (error) {
    console.error('📱 Offline: Failed to update job retry count:', error);
  }
}

/**
 * Process all pending save jobs
 */
export async function flushQueue(
  trySave: (items: AnyItem[]) => Promise<void>
): Promise<{ success: number; failed: number; total: number }> {
  const jobs = await getPendingJobs();
  if (jobs.length === 0) {
    return { success: 0, failed: 0, total: 0 };
  }

  console.log('📱 Offline: Processing', jobs.length, 'pending jobs');
  
  let success = 0;
  let failed = 0;
  const remaining: SaveJob[] = [];

  for (const job of jobs) {
    try {
      if (job.retryCount >= job.maxRetries) {
        console.log('📱 Offline: Job', job.id, 'exceeded max retries, marking as failed');
        failed++;
        continue;
      }

      await trySave(job.payload);
      await removeJob(job.id);
      success++;
      console.log('📱 Offline: Successfully processed job', job.id);
    } catch (error) {
      console.error('📱 Offline: Failed to process job', job.id, ':', error);
      
      // Increment retry count
      job.retryCount++;
      if (job.retryCount < job.maxRetries) {
        remaining.push(job);
        console.log('📱 Offline: Job', job.id, 'will retry (attempt', job.retryCount, ')');
      } else {
        failed++;
        console.log('📱 Offline: Job', job.id, 'exceeded max retries');
      }
    }
  }

  // Update remaining jobs
  if (remaining.length > 0) {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch (error) {
      console.error('📱 Offline: Failed to update remaining jobs:', error);
    }
  }

  console.log('📱 Offline: Queue flush complete. Success:', success, 'Failed:', failed, 'Remaining:', remaining.length);
  return { success, failed, total: jobs.length };
}

/**
 * Watch for connectivity changes and automatically flush queue
 */
export function watchConnectivity(
  trySave: (items: AnyItem[]) => Promise<void>,
  onQueueUpdate?: (stats: { success: number; failed: number; total: number }) => void
): () => void {
  const unsub = NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      console.log('📱 Offline: Network connected, flushing queue...');
      try {
        const stats = await flushQueue(trySave);
        if (onQueueUpdate) {
          onQueueUpdate(stats);
        }
      } catch (error) {
        console.error('📱 Offline: Failed to flush queue on reconnect:', error);
      }
    }
  });

  return () => unsub();
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pendingCount: number;
  oldestJob: number | null;
  totalRetries: number;
}> {
  try {
    const jobs = await getPendingJobs();
    if (jobs.length === 0) {
      return { pendingCount: 0, oldestJob: null, totalRetries: 0 };
    }

    const oldestJob = Math.min(...jobs.map(j => j.createdAt));
    const totalRetries = jobs.reduce((sum, j) => sum + j.retryCount, 0);

    return {
      pendingCount: jobs.length,
      oldestJob,
      totalRetries
    };
  } catch (error) {
    console.error('📱 Offline: Failed to get queue stats:', error);
    return { pendingCount: 0, oldestJob: null, totalRetries: 0 };
  }
}

/**
 * Clear all pending jobs (for testing or reset)
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_KEY);
    console.log('📱 Offline: Cleared all pending jobs');
  } catch (error) {
    console.error('📱 Offline: Failed to clear queue:', error);
  }
}

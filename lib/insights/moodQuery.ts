import { supabase } from '@/lib/supabase';
import { MoodEntry } from './types';

export const fetchMoodEntries = async ({
  userId,
  from,
  to,
}: {
  userId: string;
  from: string; // ISO timestamp
  to: string; // ISO timestamp
}): Promise<MoodEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', from)
      .lte('timestamp', to)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching mood entries:', error);
      throw error;
    }

    // Transform the data to match our MoodEntry type
    // Note: The actual schema uses 'timestamp' and 'mood_value' with body/mind
    const transformedData: MoodEntry[] = (data || []).map((entry: any) => ({
      id: entry.id,
      created_at: entry.timestamp || entry.created_at,
      mind_energy: entry.mood_value?.mind || entry.mind_energy,
      body_energy: entry.mood_value?.body || entry.body_energy,
      mood_label: entry.mood_label,
      note: entry.note,
      tags: entry.tags,
    }));

    return transformedData;
  } catch (error) {
    console.error('Error in fetchMoodEntries:', error);
    throw error;
  }
};

export const fetchMoodEntriesForPeriod = async ({
  userId,
  period,
  timezone = 'UTC',
}: {
  userId: string;
  period: 'day' | 'week' | 'month';
  timezone?: string;
}): Promise<MoodEntry[]> => {
  const now = new Date();
  let from: Date;
  let to: Date = now;

  switch (period) {
    case 'day':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      // Start from Monday (or Sunday based on app setting)
      const dayOfWeek = now.getDay();
      const daysFromStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromStart);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return fetchMoodEntries({
    userId,
    from: from.toISOString(),
    to: to.toISOString(),
  });
};

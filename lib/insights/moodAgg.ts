import { MoodEntry, HourlyData, WeekdayData, MonthDayData, MoodStats } from './types';

export const bucketByHour = (entries: MoodEntry[], timezone: string = 'UTC'): HourlyData[] => {
  const hourlyBuckets: { [key: number]: { mind: number[]; body: number[] } } = {};
  
  // Initialize all 24 hours
  for (let i = 0; i < 24; i++) {
    hourlyBuckets[i] = { mind: [], body: [] };
  }

  entries.forEach(entry => {
    const date = new Date(entry.created_at);
    const hour = date.getUTCHours(); // Use UTC hours to avoid timezone issues
    
    if (entry.mind_energy !== undefined) {
      hourlyBuckets[hour].mind.push(entry.mind_energy);
    }
    if (entry.body_energy !== undefined) {
      hourlyBuckets[hour].body.push(entry.body_energy);
    }
  });

  return Object.entries(hourlyBuckets).map(([hour, data]) => ({
    hour: parseInt(hour),
    mind: data.mind.length > 0 ? data.mind.reduce((a, b) => a + b, 0) / data.mind.length : null,
    body: data.body.length > 0 ? data.body.reduce((a, b) => a + b, 0) / data.body.length : null,
    count: data.mind.length + data.body.length,
  }));
};

export const bucketByWeekday = (entries: MoodEntry[], timezone: string = 'UTC'): WeekdayData[] => {
  const weekdayBuckets: { [key: string]: { mind: number[]; body: number[] } } = {
    'Mon': { mind: [], body: [] },
    'Tue': { mind: [], body: [] },
    'Wed': { mind: [], body: [] },
    'Thu': { mind: [], body: [] },
    'Fri': { mind: [], body: [] },
    'Sat': { mind: [], body: [] },
    'Sun': { mind: [], body: [] },
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  entries.forEach(entry => {
    const date = new Date(entry.created_at);
    const dayName = dayNames[date.getUTCDay()]; // Use UTC day to avoid timezone issues
    
    if (entry.mind_energy !== undefined) {
      weekdayBuckets[dayName].mind.push(entry.mind_energy);
    }
    if (entry.body_energy !== undefined) {
      weekdayBuckets[dayName].body.push(entry.body_energy);
    }
  });

  return Object.entries(weekdayBuckets).map(([day, data]) => ({
    day: day as any,
    mind: data.mind.length > 0 ? data.mind.reduce((a, b) => a + b, 0) / data.mind.length : null,
    body: data.body.length > 0 ? data.body.reduce((a, b) => a + b, 0) / data.body.length : null,
    count: data.mind.length + data.body.length,
    min: {
      mind: data.mind.length > 0 ? Math.min(...data.mind) : null,
      body: data.body.length > 0 ? Math.min(...data.body) : null,
    },
    max: {
      mind: data.mind.length > 0 ? Math.max(...data.mind) : null,
      body: data.body.length > 0 ? Math.max(...data.body) : null,
    },
  }));
};

export const bucketByMonthDay = (entries: MoodEntry[], timezone: string = 'UTC'): MonthDayData[] => {
  const monthBuckets: { [key: string]: { mind: number[]; body: number[] } } = {};

  entries.forEach(entry => {
    const date = new Date(entry.created_at);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!monthBuckets[dateKey]) {
      monthBuckets[dateKey] = { mind: [], body: [] };
    }
    
    if (entry.mind_energy !== undefined) {
      monthBuckets[dateKey].mind.push(entry.mind_energy);
    }
    if (entry.body_energy !== undefined) {
      monthBuckets[dateKey].body.push(entry.body_energy);
    }
  });

  return Object.entries(monthBuckets).map(([date, data]) => {
    const avgMind = data.mind.length > 0 ? data.mind.reduce((a, b) => a + b, 0) / data.mind.length : null;
    const avgBody = data.body.length > 0 ? data.body.reduce((a, b) => a + b, 0) / data.body.length : null;
    const blended = avgMind !== null && avgBody !== null ? (avgMind + avgBody) / 2 : null;
    
    let mood_label: 'positive' | 'neutral' | 'negative' | null = null;
    if (blended !== null) {
      if (blended >= 67) mood_label = 'positive';
      else if (blended >= 33) mood_label = 'neutral';
      else mood_label = 'negative';
    }

    return {
      date,
      mind: avgMind,
      body: avgBody,
      count: data.mind.length + data.body.length,
      blended,
      mood_label,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

export const calcStats = (entries: MoodEntry[]): MoodStats => {
  if (entries.length === 0) {
    return {
      avgMind: 0,
      avgBody: 0,
      deltaAvg: 0,
      mostVolatileDay: null,
      bestDay: null,
      streakDays: 0,
    };
  }

  // Calculate averages
  const mindValues = entries.filter(e => e.mind_energy !== undefined).map(e => e.mind_energy!);
  const bodyValues = entries.filter(e => e.body_energy !== undefined).map(e => e.body_energy!);
  
  const avgMind = mindValues.length > 0 ? mindValues.reduce((a, b) => a + b, 0) / mindValues.length : 0;
  const avgBody = bodyValues.length > 0 ? bodyValues.reduce((a, b) => a + b, 0) / bodyValues.length : 0;
  const deltaAvg = Math.abs(avgMind - avgBody);

  // Calculate most volatile day (highest standard deviation)
  const dailyData = bucketByMonthDay(entries);
  let mostVolatileDay: string | null = null;
  let maxVolatility = 0;

  dailyData.forEach(day => {
    if (day.mind !== null && day.body !== null) {
      const volatility = Math.abs(day.mind - day.body);
      if (volatility > maxVolatility) {
        maxVolatility = volatility;
        mostVolatileDay = day.date;
      }
    }
  });

  // Calculate best day (highest blended average)
  let bestDay: string | null = null;
  let maxBlended = 0;

  dailyData.forEach(day => {
    if (day.blended !== null && day.blended > maxBlended) {
      maxBlended = day.blended;
      bestDay = day.date;
    }
  });

  // Calculate streak (consecutive days with entries)
  let streakDays = 0;
  let currentStreak = 0;
  const sortedDates = dailyData.map(d => d.date).sort();
  
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    streakDays = Math.max(streakDays, currentStreak);
  }

  return {
    avgMind: Math.round(avgMind * 100) / 100,
    avgBody: Math.round(avgBody * 100) / 100,
    deltaAvg: Math.round(deltaAvg * 100) / 100,
    mostVolatileDay,
    bestDay,
    streakDays,
  };
};

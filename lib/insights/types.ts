export type Period = 'day' | 'week' | 'month';

export type SeriesSelection = 'mind' | 'body' | 'both';

export type MoodEntry = {
  id: string;
  created_at: string; // ISO timestamp
  mind_energy?: number; // 0-100
  body_energy?: number; // 0-100
  mood_label?: 'positive' | 'neutral' | 'negative';
  note?: string;
  tags?: string[];
};

export type HourlyData = {
  hour: number; // 0-23
  mind: number | null;
  body: number | null;
  count: number;
};

export type WeekdayData = {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  mind: number | null;
  body: number | null;
  count: number;
  min: { mind: number | null; body: number | null };
  max: { mind: number | null; body: number | null };
};

export type MonthDayData = {
  date: string; // YYYY-MM-DD
  mind: number | null;
  body: number | null;
  count: number;
  blended: number | null; // (mind + body) / 2
  mood_label: 'positive' | 'neutral' | 'negative' | null;
};

export type MoodStats = {
  avgMind: number;
  avgBody: number;
  deltaAvg: number;
  mostVolatileDay: string | null;
  bestDay: string | null;
  streakDays: number;
};

export type ChartData = {
  hourly: HourlyData[];
  weekly: WeekdayData[];
  monthly: MonthDayData[];
  stats: MoodStats;
};

export type FilterOptions = {
  timezone: string;
  weekStartsOn: 'Mon' | 'Sun';
  tags?: string[];
};

import { bucketByHour, bucketByWeekday, bucketByMonthDay, calcStats } from '@/lib/insights/moodAgg';
import { MoodEntry } from '@/lib/insights/types';

describe('moodAgg', () => {
  const mockEntries: MoodEntry[] = [
    {
      id: '1',
      created_at: '2025-01-27T10:00:00.000Z',
      mind_energy: 80,
      body_energy: 75,
      mood_label: 'positive',
    },
    {
      id: '2',
      created_at: '2025-01-27T14:00:00.000Z',
      mind_energy: 70,
      body_energy: 85,
      mood_label: 'positive',
    },
    {
      id: '3',
      created_at: '2025-01-27T18:00:00.000Z',
      mind_energy: 60,
      body_energy: 65,
      mood_label: 'neutral',
    },
    {
      id: '4',
      created_at: '2025-01-28T09:00:00.000Z',
      mind_energy: 90,
      body_energy: 88,
      mood_label: 'positive',
    },
    {
      id: '5',
      created_at: '2025-01-28T15:00:00.000Z',
      mind_energy: 40,
      body_energy: 35,
      mood_label: 'negative',
    },
  ];

  describe('bucketByHour', () => {
    it('should bucket entries by hour correctly', () => {
      const result = bucketByHour(mockEntries);
      
      expect(result).toHaveLength(24);
      
      // Check specific hours with data
      const hour10 = result.find(h => h.hour === 10);
      expect(hour10?.mind).toBe(80);
      expect(hour10?.body).toBe(75);
      
      const hour14 = result.find(h => h.hour === 14);
      expect(hour14?.mind).toBe(70);
      expect(hour14?.body).toBe(85);
      
      const hour18 = result.find(h => h.hour === 18);
      expect(hour18?.mind).toBe(60);
      expect(hour18?.body).toBe(65);
    });

    it('should handle multiple entries per hour by averaging', () => {
      const multipleEntries: MoodEntry[] = [
        { id: '1', created_at: '2025-01-27T10:00:00Z', mind_energy: 80, body_energy: 75 },
        { id: '2', created_at: '2025-01-27T10:30:00Z', mind_energy: 90, body_energy: 85 },
      ];
      
      const result = bucketByHour(multipleEntries);
      const hour10 = result.find(h => h.hour === 10);
      
      expect(hour10?.mind).toBe(85); // (80 + 90) / 2
      expect(hour10?.body).toBe(80); // (75 + 85) / 2
    });

    it('should handle missing energy values', () => {
      const incompleteEntries: MoodEntry[] = [
        { id: '1', created_at: '2025-01-27T10:00:00.000Z', mind_energy: 80 },
        { id: '2', created_at: '2025-01-27T11:00:00.000Z', body_energy: 75 },
      ];
      
      const result = bucketByHour(incompleteEntries);
      const hour10 = result.find(h => h.hour === 10);
      const hour11 = result.find(h => h.hour === 11);
      
      expect(hour10?.mind).toBe(80);
      expect(hour10?.body).toBeNull();
      expect(hour11?.mind).toBeNull();
      expect(hour11?.body).toBe(75);
    });
  });

  describe('bucketByWeekday', () => {
    it('should bucket entries by weekday correctly', () => {
      const result = bucketByWeekday(mockEntries);
      
      expect(result).toHaveLength(7);
      expect(result.map(d => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      
      // Check Monday (Jan 27, 2025 was a Monday)
      const monday = result.find(d => d.day === 'Mon');
      expect(monday?.mind).toBe(70); // (80 + 70 + 60) / 3
      expect(monday?.body).toBe(75); // (75 + 85 + 65) / 3
      expect(monday?.count).toBe(6); // 3 entries × 2 values each
    });

    it('should calculate min/max values correctly', () => {
      const result = bucketByWeekday(mockEntries);
      const monday = result.find(d => d.day === 'Mon');
      
      expect(monday?.min.mind).toBe(60);
      expect(monday?.max.mind).toBe(80);
      expect(monday?.min.body).toBe(65);
      expect(monday?.max.body).toBe(85);
    });
  });

  describe('bucketByMonthDay', () => {
    it('should bucket entries by month day correctly', () => {
      const result = bucketByMonthDay(mockEntries);
      
      expect(result).toHaveLength(2); // 2 different dates
      
      const day27 = result.find(d => d.date === '2025-01-27');
      const day28 = result.find(d => d.date === '2025-01-28');
      
      expect(day27?.mind).toBe(70);
      expect(day27?.body).toBe(75);
      expect(day27?.blended).toBe(72.5);
      expect(day27?.mood_label).toBe('positive');
      
      expect(day28?.mind).toBe(65);
      expect(day28?.body).toBe(61.5);
      expect(day28?.blended).toBe(63.25);
      expect(day28?.mood_label).toBe('neutral');
    });

    it('should categorize mood labels correctly', () => {
      const highEnergyEntries: MoodEntry[] = [
        { id: '1', created_at: '2025-01-27T10:00:00Z', mind_energy: 90, body_energy: 95 },
        { id: '2', created_at: '2025-01-28T10:00:00Z', mind_energy: 50, body_energy: 55 },
        { id: '3', created_at: '2025-01-29T10:00:00Z', mind_energy: 20, body_energy: 25 },
      ];
      
      const result = bucketByMonthDay(highEnergyEntries);
      
      expect(result[0].mood_label).toBe('positive'); // 92.5 ≥ 67
      expect(result[1].mood_label).toBe('neutral');  // 52.5 in [33, 66]
      expect(result[2].mood_label).toBe('negative'); // 22.5 < 33
    });
  });

  describe('calcStats', () => {
    it('should calculate basic statistics correctly', () => {
      const result = calcStats(mockEntries);
      
      expect(result.avgMind).toBe(68); // (80 + 70 + 60 + 90 + 40) / 5
      expect(result.avgBody).toBe(69.6); // (75 + 85 + 65 + 88 + 35) / 5
      expect(result.deltaAvg).toBe(1.6); // |68 - 69.6|
    });

    it('should handle empty entries', () => {
      const result = calcStats([]);
      
      expect(result.avgMind).toBe(0);
      expect(result.avgBody).toBe(0);
      expect(result.deltaAvg).toBe(0);
      expect(result.mostVolatileDay).toBeNull();
      expect(result.bestDay).toBeNull();
      expect(result.streakDays).toBe(0);
    });

    it('should calculate streak correctly', () => {
      const consecutiveEntries: MoodEntry[] = [
        { id: '1', created_at: '2025-01-27T10:00:00Z', mind_energy: 80, body_energy: 75 },
        { id: '2', created_at: '2025-01-28T10:00:00Z', mind_energy: 70, body_energy: 85 },
        { id: '3', created_at: '2025-01-29T10:00:00Z', mind_energy: 60, body_energy: 65 },
      ];
      
      const result = calcStats(consecutiveEntries);
      expect(result.streakDays).toBe(3);
    });

    it('should handle non-consecutive days', () => {
      const nonConsecutiveEntries: MoodEntry[] = [
        { id: '1', created_at: '2025-01-27T10:00:00Z', mind_energy: 80, body_energy: 75 },
        { id: '2', created_at: '2025-01-29T10:00:00Z', mind_energy: 70, body_energy: 85 },
        { id: '3', created_at: '2025-01-30T10:00:00Z', mind_energy: 60, body_energy: 65 },
      ];
      
      const result = calcStats(nonConsecutiveEntries);
      expect(result.streakDays).toBe(2); // 29-30 is consecutive, 27-29 is not
    });
  });
});

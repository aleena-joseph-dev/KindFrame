# Mood Insights - KindFrame

A comprehensive mood tracking and analytics system for KindFrame that provides insights into users' mental and physical energy levels over time.

## 🎯 Overview

The Mood Insights feature allows users to:
- Track mind and body energy levels (0-100 scale)
- View trends across different time periods (Day, Week, Month)
- Analyze patterns and correlations between mental and physical wellbeing
- Get statistical insights about their mood patterns

## 🏗️ Architecture

### File Structure
```
app/(tabs)/
├── insights.tsx                    # Main Mood Insights screen
└── mood-tracker.tsx               # Enhanced with insights navigation

components/insights/
├── PeriodSwitcher.tsx             # Day/Week/Month selector
├── SeriesToggles.tsx              # Mind/Body/Both series selector
├── StatsStrip.tsx                 # Statistics cards
├── DayChart.tsx                   # Hourly bar chart
├── WeekChart.tsx                  # Weekly grouped bar chart
└── MonthHeatmap.tsx               # Monthly calendar heatmap

lib/insights/
├── types.ts                       # TypeScript type definitions
├── colors.ts                      # Chart color mapping
├── moodQuery.ts                   # Supabase data fetching
└── moodAgg.ts                     # Data aggregation and statistics

tests/
└── moodAgg.test.ts               # Unit tests for aggregation logic
```

## 🎨 UI Components

### PeriodSwitcher
- **Purpose**: Switch between Day, Week, and Month views
- **Design**: Segmented control with theme-aware colors
- **State**: Persisted in AsyncStorage

### SeriesToggles
- **Purpose**: Select which data series to display (Mind, Body, Both)
- **Design**: Chip-style buttons with legend
- **Logic**: "Both" automatically selects both Mind and Body series

### StatsStrip
- **Purpose**: Display key statistics in card format
- **Metrics**: 
  - Average Mind Energy
  - Average Body Energy
  - Mind-Body Delta (difference)
  - Most Volatile Day
  - Best Day (highest blended average)
  - Streak (consecutive days logged)

### Charts
- **DayChart**: 24-hour bar chart with Mind/Body series
- **WeekChart**: 7-day grouped bar chart with error bars
- **MonthHeatmap**: Calendar-style heatmap with mood labels

## 📊 Data Model

### MoodEntry
```typescript
type MoodEntry = {
  id: string;
  created_at: string;           // ISO timestamp
  mind_energy?: number;         // 0-100 scale
  body_energy?: number;         // 0-100 scale
  mood_label?: 'positive' | 'neutral' | 'negative';
  note?: string;
  tags?: string[];
};
```

### Aggregated Data Types
- **HourlyData**: Hour-by-hour averages for daily view
- **WeekdayData**: Day-by-day averages with min/max ranges
- **MonthDayData**: Daily averages with mood categorization

## 🔄 Data Flow

1. **Data Fetching**: `moodQuery.ts` fetches data from Supabase
2. **Aggregation**: `moodAgg.ts` processes raw entries into chart data
3. **Rendering**: Components render aggregated data with Victory Native charts
4. **Persistence**: User preferences saved to AsyncStorage

## 🎯 Key Features

### Time Period Views
- **Day**: Hourly breakdown (00:00-23:00)
- **Week**: Monday-Sunday with daily averages
- **Month**: Calendar heatmap with mood labels

### Series Selection
- **Mind Only**: Show only mental energy trends
- **Body Only**: Show only physical energy trends
- **Both**: Show both series for comparison

### Mood Categorization
- **Positive**: ≥67 (high energy)
- **Neutral**: 33-66 (moderate energy)
- **Negative**: <33 (low energy)

### Statistics
- **Averages**: Mean values for selected period
- **Volatility**: Day with highest mind-body difference
- **Streaks**: Consecutive days with entries
- **Best Days**: Days with highest combined energy

## 🚀 Performance Optimizations

- **Memoization**: Chart data computed once and cached
- **Lazy Loading**: Only fetch data for selected period
- **Efficient Aggregation**: Single-pass algorithms for statistics
- **Victory Native**: Lightweight chart rendering

## 🧪 Testing

### Unit Tests
- **Coverage**: All aggregation functions tested
- **Scenarios**: Multiple entries per hour, missing data, timezone handling
- **Edge Cases**: Empty datasets, boundary conditions

### Test Commands
```bash
# Run all tests
npm test

# Run only mood insights tests
npm test -- --testPathPattern=moodAgg

# Run with coverage
npm test -- --coverage --testPathPattern=moodAgg
```

## 🎨 Theming

### Color System
- **Mind Series**: Uses `colors.topBarBackground` from theme
- **Body Series**: Uses `colors.secondary` from theme
- **Mood Labels**: Fixed colors for consistency
- **Charts**: Theme-aware grid, axis, and background colors

### Responsive Design
- **Screen Adaptation**: Charts scale to device width
- **Touch Targets**: 44dp minimum for accessibility
- **Dark Mode**: Full support with theme colors

## 🔧 Configuration

### User Preferences
- **Period**: Last selected time view
- **Series**: Last selected data series
- **Storage**: AsyncStorage with automatic persistence

### Chart Settings
- **Animations**: Smooth transitions (500ms)
- **Grid**: Subtle dashed lines
- **Tooltips**: Contextual information on interaction

## 🚧 Future Enhancements

### Planned Features
- **Correlation Analysis**: Pearson correlation between Mind & Body
- **Export Functionality**: PNG chart downloads
- **Tag Filtering**: Filter by mood tags
- **Advanced Analytics**: Trend analysis and predictions

### Technical Improvements
- **Offline Support**: Cache data for offline viewing
- **Real-time Updates**: Live data synchronization
- **Custom Periods**: User-defined time ranges
- **Data Export**: CSV/JSON data export

## 📱 Usage

### Navigation
1. Open Mood Tracker screen
2. Click "📊 View Mood Insights" button
3. Navigate to insights screen

### Interacting with Charts
- **Tap Bars**: View detailed information
- **Switch Periods**: Change time view
- **Toggle Series**: Show/hide data series
- **Filter Options**: Access timezone and tag settings

### Understanding Data
- **Higher Values**: Better energy/wellbeing
- **Consistent Patterns**: Stable mood over time
- **Large Deltas**: Significant mind-body differences
- **Streaks**: Consistent tracking habits

## 🐛 Troubleshooting

### Common Issues
- **No Data**: Ensure mood entries exist for selected period
- **Chart Not Loading**: Check network connection and Supabase access
- **Wrong Timezone**: Verify device timezone settings
- **Performance**: Clear app cache if charts are slow

### Debug Information
- Console logs for data fetching
- Error boundaries for component failures
- Loading states for user feedback
- Retry mechanisms for failed requests

## 📚 API Reference

### Supabase Queries
```typescript
// Fetch mood entries for period
fetchMoodEntriesForPeriod({ userId, period, timezone })

// Fetch custom date range
fetchMoodEntries({ userId, from, to })
```

### Aggregation Functions
```typescript
// Process data for different views
bucketByHour(entries, timezone)
bucketByWeekday(entries, timezone)
bucketByMonthDay(entries, timezone)

// Calculate statistics
calcStats(entries)
```

## 🤝 Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Build project: `npm run build`

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Consistent code style
- **Testing**: 100% test coverage for new functions
- **Documentation**: JSDoc comments for public APIs

### Testing Guidelines
- **Unit Tests**: Test all aggregation logic
- **Integration Tests**: Test data flow end-to-end
- **Edge Cases**: Handle missing data and errors
- **Performance**: Test with large datasets

---

**Built with ❤️ for KindFrame**
*Empowering users to understand their wellbeing through data-driven insights*

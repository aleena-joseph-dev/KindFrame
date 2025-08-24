export const getChartColors = (colors: any) => {
  return {
    // Series colors - derived from design tokens
    mind: colors.topBarBackground || '#FF6B6B', // Fallback to high energy theme
    body: colors.secondary || '#0ABAB5', // Fallback to high energy theme
    
    // Neutral colors for charts
    neutral: colors.border || '#E5E7EB',
    background: colors.background || '#FFFFFF',
    surface: colors.surface || '#FFFFFF',
    text: colors.text || '#2A3D45',
    textSecondary: colors.textSecondary || '#4a5565',
    
    // Mood label colors
    positive: '#10B981', // Green
    neutral: '#6B7280', // Gray
    negative: '#EF4444', // Red
    
    // Chart elements
    grid: colors.border || '#E5E7EB',
    axis: colors.textSecondary || '#4a5565',
    tooltip: colors.surface || '#FFFFFF',
    tooltipBorder: colors.border || '#E5E7EB',
    tooltipText: colors.text || '#2A3D45',
  };
};

export const getMoodLabelColor = (label: 'positive' | 'neutral' | 'negative') => {
  const colors = {
    positive: '#10B981',
    neutral: '#6B7280',
    negative: '#EF4444',
  };
  return colors[label];
};

export const getMoodLabelThresholds = () => {
  return {
    positive: 67, // ≥ 67 → Positive
    neutral: 33,  // 33-66 → Neutral
    negative: 0,  // < 33 → Negative
  };
};

// Font configuration for KindFrame app
export const Fonts = {
  // Funnel Display font family
  funnelDisplay: {
    light: 'FunnelDisplay-Light',
    regular: 'FunnelDisplay-Regular', 
    medium: 'FunnelDisplay-Medium',
    bold: 'FunnelDisplay-Bold',
  },
  
  // Fallback fonts
  fallback: {
    light: 'System',
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
};

// Font weights mapping
export const FontWeights = {
  light: '300',
  regular: '400',
  medium: '500',
  bold: '600',
  extraBold: '700',
};

// Font sizes for different text types
export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 36,
};

// Helper function to get font family with fallback
export function getFontFamily(weight: keyof typeof Fonts.funnelDisplay = 'regular'): string {
  return `${Fonts.funnelDisplay[weight]}, ${Fonts.fallback[weight]}`;
} 
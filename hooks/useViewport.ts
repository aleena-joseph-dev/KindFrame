import { useWindowDimensions } from 'react-native';

export function useViewport() {
  const { width, height } = useWindowDimensions();
  
  // Calculate responsive sizes based on viewport
  const vw = (percentage: number) => (width * percentage) / 100;
  const vh = (percentage: number) => (height * percentage) / 100;
  
  // Responsive breakpoints
  const isSmallScreen = width < 375;
  const isMediumScreen = width >= 375 && width < 768;
  const isLargeScreen = width >= 768;
  
  // Responsive sizing functions
  const getResponsiveSize = (small: number, medium: number, large: number) => {
    if (isSmallScreen) return small;
    if (isMediumScreen) return medium;
    return large;
  };
  
  return {
    width,
    height,
    vw,
    vh,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    getResponsiveSize,
  };
} 
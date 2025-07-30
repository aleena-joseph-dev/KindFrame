import { SensoryColors } from '@/constants/Colors';
import { useSensoryMode } from '@/contexts/SensoryModeContext';

export function useThemeColors() {
  const { mode } = useSensoryMode();
  return { mode, colors: SensoryColors[mode] };
} 
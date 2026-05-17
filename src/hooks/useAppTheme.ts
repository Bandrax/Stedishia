import { useThemeStore } from '../store';
import { Colors, type ThemeColors } from '../constants';

/**
 * Hook za pristup trenutnim bojama teme.
 * Koristi se u svim komponentama za konzistentne boje.
 */
export const useAppTheme = () => {
  const { colorScheme, colors, mode, setMode } = useThemeStore();

  return {
    colors,
    colorScheme,
    isDark: colorScheme === 'dark',
    mode,
    setMode,
  };
};

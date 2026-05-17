import { create } from 'zustand';
import { Appearance } from 'react-native';
import { Colors, type ColorScheme, type ThemeColors } from '../constants/colors';

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setMode: (mode: 'light' | 'dark' | 'system') => void;
  updateSystemTheme: () => void;
}

const getSystemScheme = (): ColorScheme =>
  Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';

const resolveScheme = (mode: 'light' | 'dark' | 'system'): ColorScheme =>
  mode === 'system' ? getSystemScheme() : mode;

export const useThemeStore = create<ThemeState>((set) => {
  const initialMode = 'system' as const;
  const initialScheme = resolveScheme(initialMode);

  return {
    mode: initialMode,
    colorScheme: initialScheme,
    colors: Colors[initialScheme],

    setMode: (mode) => {
      const colorScheme = resolveScheme(mode);
      set({ mode, colorScheme, colors: Colors[colorScheme] });
    },

    updateSystemTheme: () => {
      set((state) => {
        if (state.mode !== 'system') return state;
        const colorScheme = getSystemScheme();
        return { colorScheme, colors: Colors[colorScheme] };
      });
    },
  };
});

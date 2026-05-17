// Dizajn sustav - paleta boja
export const Colors = {
  light: {
    primary: '#0F4C3A',
    primaryLight: '#1A6B52',
    primaryDark: '#0A3528',
    accent: '#D4AF37',
    accentLight: '#E8CC6E',
    accentDark: '#B8962E',

    background: '#FAFAF7',
    surface: '#FFFFFF',
    surfaceVariant: '#F2F2EF',
    card: '#FFFFFF',

    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textTertiary: '#9E9E9E',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#1A1A1A',

    border: '#E5E5E2',
    borderLight: '#F0F0ED',
    divider: '#EEEEEB',

    success: '#2E7D32',
    successLight: '#E8F5E9',
    warning: '#F57F17',
    warningLight: '#FFF8E1',
    error: '#C62828',
    errorLight: '#FFEBEE',
    info: '#1565C0',
    infoLight: '#E3F2FD',

    // Semafor boje za budget status
    budgetGood: '#2E7D32',
    budgetWarning: '#F57F17',
    budgetOver: '#C62828',

    // Kategorije - svaka ima svoju boju
    categoryColors: [
      '#0F4C3A', '#D4AF37', '#2196F3', '#FF5722',
      '#9C27B0', '#00BCD4', '#FF9800', '#795548',
      '#607D8B', '#E91E63', '#4CAF50', '#3F51B5',
    ],

    skeleton: '#E5E5E2',
    overlay: 'rgba(0, 0, 0, 0.5)',
    glass: 'rgba(255, 255, 255, 0.7)',
  },

  dark: {
    primary: '#1A6B52',
    primaryLight: '#239B76',
    primaryDark: '#0F4C3A',
    accent: '#D4AF37',
    accentLight: '#E8CC6E',
    accentDark: '#B8962E',

    background: '#1A1A1A',
    surface: '#252525',
    surfaceVariant: '#303030',
    card: '#2A2A2A',

    text: '#F5F5F5',
    textSecondary: '#B0B0B0',
    textTertiary: '#757575',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#1A1A1A',

    border: '#3A3A3A',
    borderLight: '#333333',
    divider: '#333333',

    success: '#4CAF50',
    successLight: '#1B3A1D',
    warning: '#FFB300',
    warningLight: '#3A3000',
    error: '#EF5350',
    errorLight: '#3A1A1A',
    info: '#42A5F5',
    infoLight: '#1A2A3A',

    budgetGood: '#4CAF50',
    budgetWarning: '#FFB300',
    budgetOver: '#EF5350',

    categoryColors: [
      '#1A6B52', '#D4AF37', '#42A5F5', '#FF7043',
      '#BA68C8', '#26C6DA', '#FFB74D', '#A1887F',
      '#90A4AE', '#F06292', '#66BB6A', '#7986CB',
    ],

    skeleton: '#333333',
    overlay: 'rgba(0, 0, 0, 0.7)',
    glass: 'rgba(40, 40, 40, 0.7)',
  },
};

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  textOnAccent: string;
  border: string;
  borderLight: string;
  divider: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  budgetGood: string;
  budgetWarning: string;
  budgetOver: string;
  categoryColors: string[];
  skeleton: string;
  overlay: string;
  glass: string;
}

export type ColorScheme = 'light' | 'dark';

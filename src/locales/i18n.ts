import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import hr from './hr.json';
import en from './en.json';

i18n.use(initReactI18next).init({
  resources: {
    hr: { translation: hr },
    en: { translation: en },
  },
  lng: 'hr', // Hrvatski kao default
  fallbackLng: 'hr',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

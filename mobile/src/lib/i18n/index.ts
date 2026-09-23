/**
 * i18n Configuration
 * Internationalization setup using i18next
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

// Export type for translation keys
export type TranslationKeys = keyof typeof vi;

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: {
        translation: vi,
      },
      en: {
        translation: en,
      },
    },
    lng: 'vi', // Default language
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    compatibilityJSON: 'v4', // For React Native
  });

export default i18n;

import i18n from 'i18next';
import { initReactI18next as initReact } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import pt from './locales/pt.json';

i18n
  .use(LanguageDetector)
  .use(initReact)
  .init({
    resources: {
      es: { translation: es },
      pt: { translation: pt }
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'pt'],
    detection: {
      order: ['localStorage', 'navigator'],  // localStorage first to respect manual switcher selection
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;

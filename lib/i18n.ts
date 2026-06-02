import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import it from '@/locales/it.json';
import pt from '@/locales/pt.json';
import uk from '@/locales/uk.json';
import zh from '@/locales/zh.json';

import { staticIslandConfig } from '@/config/island';

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  uk: { translation: uk },
  zh: { translation: zh },
};

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'pt';
const initialLng = staticIslandConfig.locales.includes(deviceLocale)
  ? deviceLocale
  : staticIslandConfig.defaultLocale;

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;

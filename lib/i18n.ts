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
import { saveLocale } from '@/lib/locale-prefs';

// Portuguese-first: `pt` is the source-of-truth catalog and the global fallback
// for any missing key in any other locale (see SDD 02 §7).
export const FALLBACK_LOCALE = 'pt';

// All shipped translation catalogs (shared across islands).
// Add a language: drop a `locales/<code>.json` keyed identically to `pt.json`,
// register it here + in LANGUAGE_NAMES, then add the code to an island's
// `locales` list in config/island.ts. No other code changes needed.
export const resources = {
  pt: { translation: pt },
  en: { translation: en },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  uk: { translation: uk },
  zh: { translation: zh },
} as const;

// Native display names for the language picker (Settings → language).
export const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'Português',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  uk: 'Українська',
  zh: '中文',
};

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? FALLBACK_LOCALE;
const initialLng = staticIslandConfig.locales.includes(deviceLocale)
  ? deviceLocale
  : staticIslandConfig.defaultLocale;

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: FALLBACK_LOCALE,
  interpolation: { escapeValue: false },
});

export { saveLocale };

export default i18n;

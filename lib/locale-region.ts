import { normalizeLocaleCode } from '@/lib/i18n';

/**
 * ISO 3166-1 alpha-2 region for flag display when a BCP-47 tag has no region
 * subtag (e.g. `pt` → Portugal, `uk` → Ukraine for Ukrainian).
 */
export const LANGUAGE_DEFAULT_REGION: Record<string, string> = {
  pt: 'PT',
  en: 'GB',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
  it: 'IT',
  uk: 'UA',
  zh: 'CN',
  nl: 'NL',
  pl: 'PL',
};

/**
 * Resolve which country/region flag to show for a locale tag.
 * - `pt-PT` / `pt_PT` → PT (region from tag)
 * - `pt` → PT (language default)
 * - unknown → first two letters uppercased if valid, else undefined
 */
export function localeToRegionCode(locale: string): string | undefined {
  const normalized = locale.trim().replace(/_/g, '-');
  const parts = normalized.split('-').filter(Boolean);

  if (parts.length >= 2) {
    const maybeRegion = parts[1];
    if (/^[a-z]{2}$/i.test(maybeRegion)) {
      return maybeRegion.toUpperCase();
    }
    // BCP-47 script/variant before region is rare in our API; scan for 2-letter region
    for (let i = parts.length - 1; i >= 1; i--) {
      const segment = parts[i];
      if (/^[a-z]{2}$/i.test(segment)) {
        return segment.toUpperCase();
      }
    }
  }

  const base = normalizeLocaleCode(locale);
  return LANGUAGE_DEFAULT_REGION[base];
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code (e.g. `PT` → 🇵🇹). */
export function regionCodeToFlagEmoji(regionCode: string): string {
  const code = regionCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '🌐';
  }
  const base = 0x1f1e6;
  const a = 'A'.charCodeAt(0);
  return String.fromCodePoint(
    base + (code.charCodeAt(0) - a),
    base + (code.charCodeAt(1) - a),
  );
}

export function localeToFlagEmoji(locale: string): string {
  const region = localeToRegionCode(locale);
  return region ? regionCodeToFlagEmoji(region) : '🌐';
}

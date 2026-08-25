const LOCALE_SUFFIX: Record<string, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
  uk: 'UK',
  zh: 'ZH',
};

function pickLocalizedField(
  info: Record<string, unknown>,
  base: 'title' | 'message',
  locale: string,
): string | undefined {
  const suffix = LOCALE_SUFFIX[locale] ?? LOCALE_SUFFIX.en;
  const direct = info[`${base}${suffix}`];
  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }
  const textObj = info.text ?? info[base];
  if (textObj && typeof textObj === 'object') {
    const map = textObj as Record<string, string>;
    return map[locale] ?? map.pt ?? map.en ?? Object.values(map)[0];
  }
  if (typeof textObj === 'string') {
    return textObj;
  }
  const en = info[`${base}EN`];
  if (typeof en === 'string') {
    return en;
  }
  const pt = info[`${base}PT`];
  if (typeof pt === 'string') {
    return pt;
  }
  return undefined;
}

export interface ResolvedInfo {
  title: string;
  message: string;
  source?: string;
  company?: string;
  route?: string;
}

export function resolveInfo(info: Record<string, unknown>, locale: string): ResolvedInfo {
  const code = locale.split('-')[0] ?? 'pt';
  return {
    title: pickLocalizedField(info, 'title', code) ?? '',
    message: pickLocalizedField(info, 'message', code) ?? '',
    source: typeof info.source === 'string' ? info.source : undefined,
    company: typeof info.company === 'string' ? info.company : undefined,
    route: typeof info.route === 'string' ? info.route : undefined,
  };
}

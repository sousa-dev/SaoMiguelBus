/** Visit Azores sometimes stores “missing translation” notes instead of real copy. */
const MISSING_TRANSLATION_PATTERNS = [
  /no\s+site\s+n[aã]o\s+aparece/i,
  /texto\s+em\s+ingl[eê]s/i,
  /texto\s+em\s+portugu[eê]s/i,
  /english\s+text\s+(is\s+)?not\s+available/i,
  /text\s+is\s+not\s+available\s+in\s+english/i,
  /n[aã]o\s+est[aá]\s+dispon[ií]vel\s+em\s+ingl[eê]s/i,
];

export function isMissingTranslationPlaceholder(text: string | undefined): boolean {
  const normalized = text?.trim() ?? '';
  if (!normalized) {
    return true;
  }
  if (normalized.length > 280) {
    return false;
  }
  return MISSING_TRANSLATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Prefer locale-matched description; fall back to the other language when missing or placeholder. */
export function pickTrailDescription(
  locale: string,
  descriptionPt?: string,
  descriptionEn?: string,
): string {
  const preferPt = locale.startsWith('pt');
  const primary = preferPt ? descriptionPt : descriptionEn;
  const fallback = preferPt ? descriptionEn : descriptionPt;

  const usable = (text?: string) => {
    const trimmed = text?.trim() ?? '';
    return trimmed && !isMissingTranslationPlaceholder(trimmed) ? trimmed : '';
  };

  return usable(primary) || usable(fallback) || '';
}

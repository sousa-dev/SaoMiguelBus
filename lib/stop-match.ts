/**
 * Accent-folded stop-name matching, shared by the search-result segmenter and
 * the offline search. Extracted from `lib/transit-format.ts` so that
 * `lib/trip-segment.ts` can use it without an import cycle.
 */

const ACCENT_FROM = 'áàâãäéèêëíìîïóòôõöúùûüç';
const ACCENT_TO = 'aaaaaeeeeiiiiooooouuuuc';

/** Accent-fold and lowercase for legacy stop word matching. */
export function foldStopName(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-áàâãäéèêëíìîïóòôõöúùûüç]/g, (match) => {
      if (match === '-') {
        return '';
      }
      const idx = ACCENT_FROM.indexOf(match);
      return idx >= 0 ? ACCENT_TO[idx] : match;
    });
}

export function normalizeStopWords(name: string): string[] {
  return foldStopName(name).split(' ').filter((word) => word.trim() !== '');
}

export function stopMatchesQuery(query: string, stopName: string): boolean {
  const queryWords = normalizeStopWords(query);
  const stopWords = normalizeStopWords(stopName);
  if (queryWords.length === 0) {
    return false;
  }
  return queryWords.every((word) => stopWords.includes(word));
}

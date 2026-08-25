import type { ParishWeather } from '@/lib/types';

export type WeatherViewMode = 'list' | 'grid';

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function uniqueConcelhos(parishes: ParishWeather[]): string[] {
  const set = new Set(parishes.map((p) => p.concelho));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
}

export function filterParishes(
  parishes: ParishWeather[],
  options: { query: string; concelho: string | null },
): ParishWeather[] {
  const q = normalizeSearchText(options.query);
  return parishes.filter((p) => {
    if (options.concelho && p.concelho !== options.concelho) {
      return false;
    }
    if (!q) {
      return true;
    }
    const haystack = normalizeSearchText(`${p.name} ${p.concelho}`);
    return haystack.includes(q);
  });
}

export function orderPinnedParishes(parishes: ParishWeather[], pinnedSlugs: string[]): ParishWeather[] {
  const bySlug = new Map(parishes.map((p) => [p.slug, p]));
  return pinnedSlugs.map((slug) => bySlug.get(slug)).filter((p): p is ParishWeather => p != null);
}

export type WeatherGridRow = {
  key: string;
  items: ParishWeather[];
};

export function chunkParishesIntoGridRows(
  parishes: ParishWeather[],
  columns: number,
): WeatherGridRow[] {
  const rows: WeatherGridRow[] = [];
  for (let i = 0; i < parishes.length; i += columns) {
    const items = parishes.slice(i, i + columns);
    rows.push({
      key: items.map((p) => p.slug).join('|'),
      items,
    });
  }
  return rows;
}

export function groupParishesByConcelho(parishes: ParishWeather[]): { title: string; data: ParishWeather[] }[] {
  const byConcelho = new Map<string, ParishWeather[]>();
  for (const p of parishes) {
    const list = byConcelho.get(p.concelho) ?? [];
    list.push(p);
    byConcelho.set(p.concelho, list);
  }
  return Array.from(byConcelho.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'pt'))
    .map(([title, data]) => ({
      title,
      data: [...data].sort((x, y) => x.name.localeCompare(y.name, 'pt')),
    }));
}

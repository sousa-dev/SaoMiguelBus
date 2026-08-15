/**
 * Fare TABLES, never a computed fare (03 §6).
 *
 * `fareUnitType: "km"` bands exist, but nothing in the stops, the journeys or
 * tariffs.json gives kilometres between two stops. "What will THIS ride cost?"
 * cannot ship from this data, so there is no calculate-my-fare affordance and no
 * price on a RouteCard. The honest answer is the band table.
 *
 * No price literal appears anywhere — not a fallback, not the card fee. A screen
 * with no data renders an empty state.
 */

export interface TariffPrice {
  /** A LABEL: "0 a 5", "6 a 7", "8". Never parsed into a range, never sorted. */
  band: string | null;
  price: string | number | null;
}

export interface Tariff {
  name: string;
  note: string;
  fareUnitType: string | null;
  prices: TariffPrice[];
}

export interface TariffCategory {
  name: string;
  tariffs: Tariff[];
}

/** Operator link-out, passed through verbatim from the upstream payload. */
export interface TariffInfoLink {
  text: string;
  url: string;
}

export interface TariffsResponse {
  effectiveDate: string | null;
  lastUpdatedAt: string | null;
  fetchedAt: string;
  isFuture: boolean;
  notes: string;
  infos: unknown[];
  categories: TariffCategory[];
}

export type TariffsState = 'ready' | 'empty' | 'unavailable';

/**
 * What the pricing screen should show.
 *
 * A 404 is `empty`, not an error: the endpoint exists but no snapshot has been
 * synced yet, which is exactly what production returns today. Showing a failure
 * for "we have not fetched the fares yet" would be wrong.
 */
export function resolveTariffsState(
  data: TariffsResponse | null | undefined,
  error?: unknown,
): TariffsState {
  if (error) {
    const status = (error as { status?: number } | null)?.status;
    return status === 404 ? 'empty' : 'unavailable';
  }
  if (!data || data.categories.length === 0) {
    return 'empty';
  }
  const hasAnyTariff = data.categories.some((category) => category.tariffs.length > 0);
  return hasAnyTariff ? 'ready' : 'empty';
}

export type TariffRenderer = 'banded' | 'single';

/**
 * What the band labels measure — `"km"` today (01 §7).
 *
 * The bands are DISTANCES: "0 a 5" is a journey of up to 5 km, not a zone or a
 * ticket count. A table of bare numbers next to prices is unreadable without
 * that, so the unit is surfaced as the column header.
 *
 * Read from the payload rather than assumed: the operator can restructure this,
 * and an unknown unit must still render its own name.
 */
export function fareBandUnit(tariff: Pick<Tariff, 'fareUnitType'>): string | null {
  return tariff.fareUnitType?.trim() || null;
}

/**
 * Two renderers, chosen from the data rather than a hardcoded category list.
 *
 * 01 §7: the two price shapes are distinguished by the PRESENCE of
 * `fareUnitType`, not by how many bands happen to be listed — a distance-banded
 * tariff with a single band is still a distance table.
 */
export function tariffRenderer(tariff: Pick<Tariff, 'prices' | 'fareUnitType'>): TariffRenderer {
  if (fareBandUnit(tariff)) {
    return 'banded';
  }
  return tariff.prices.filter((price) => Boolean(price.band)).length > 1 ? 'banded' : 'single';
}

/**
 * The operator's own link-outs.
 *
 * These matter more now that the bands are labelled as distances: the obvious
 * next question is "how many kilometres is my journey?", and nothing upstream
 * answers it (98 §4 gap "Fare distance"). The honest response is the band table
 * plus the operator's documentation, so it is rendered rather than dropped.
 */
export function tariffInfoLinks(infos: unknown[] | undefined): TariffInfoLink[] {
  if (!Array.isArray(infos)) {
    return [];
  }
  const links: TariffInfoLink[] = [];
  for (const info of infos) {
    if (!info || typeof info !== 'object') {
      continue;
    }
    const { text, url } = info as { text?: unknown; url?: unknown };
    if (typeof url !== 'string' || !url) {
      continue;
    }
    links.push({ text: typeof text === 'string' && text ? text : url, url });
  }
  return links;
}

/**
 * Band labels are rendered verbatim and in payload order. They are strings like
 * "0 a 5" and "8"; parsing them into numbers or sorting them numerically would
 * reorder a table the operator laid out deliberately.
 */
export function tariffRows(tariff: Tariff): { band: string | null; price: string }[] {
  return tariff.prices.map((price) => ({
    band: price.band,
    price: price.price == null ? '' : String(price.price),
  }));
}

/** True when the tariffs are published but not yet in force — same treatment as §3. */
export function isFutureTariff(data: TariffsResponse | null | undefined): boolean {
  return Boolean(data?.isFuture);
}

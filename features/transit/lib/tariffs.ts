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
 * Two renderers, chosen from the data rather than a hardcoded category list —
 * the operator will restructure the categories.
 */
export function tariffRenderer(tariff: Pick<Tariff, 'prices'>): TariffRenderer {
  const labelled = tariff.prices.filter((price) => Boolean(price.band));
  return labelled.length > 1 ? 'banded' : 'single';
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

import type { CustomerInfo, PurchasesStoreTransaction } from 'react-native-purchases';

const MS_PER_DAY = 86_400_000;

export const DEFAULT_TOURIST_PASS_PRODUCTS = '7_day_premium:7,15_days_premium:15';

/** Parse `productId:days` pairs from env, e.g. `7_day_premium:7,15_days_premium:15`. */
export function parseTouristPassProductDurations(envString: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const segment of envString.split(',')) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }
    const colon = trimmed.lastIndexOf(':');
    if (colon <= 0) {
      continue;
    }
    const productId = trimmed.slice(0, colon).trim();
    const days = Number.parseInt(trimmed.slice(colon + 1).trim(), 10);
    if (productId && Number.isFinite(days) && days > 0) {
      map[productId] = days;
    }
  }
  return map;
}

/**
 * Stack tourist pass purchases chronologically: consecutive buys while active add
 * duration; purchases after expiry start a fresh window.
 */
export function computeStackedTouristPassEndMs(
  transactions: readonly PurchasesStoreTransaction[],
  durationMap: Record<string, number>,
): number | null {
  const touristTxs = transactions
    .filter((tx) => durationMap[tx.productIdentifier] != null)
    .sort(
      (a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime(),
    );

  let endMs: number | null = null;
  for (const tx of touristTxs) {
    const purchaseMs = new Date(tx.purchaseDate).getTime();
    const durationMs = durationMap[tx.productIdentifier]! * MS_PER_DAY;

    if (endMs === null || purchaseMs >= endMs) {
      endMs = purchaseMs + durationMs;
    } else {
      endMs = endMs + durationMs;
    }
  }

  return endMs;
}

/** Product identifier → pass duration in days (tourist one-time IAP). */
export function getTouristPassProductDurations(): Record<string, number> {
  const env =
    (process.env.EXPO_PUBLIC_REVENUECAT_TOURIST_PASS_PRODUCTS ?? '').trim() ||
    DEFAULT_TOURIST_PASS_PRODUCTS;
  return parseTouristPassProductDurations(env);
}

/** ISO end timestamp for an active stacked tourist pass, or null if none / expired. */
export function resolveTouristPassExpiryIso(info: CustomerInfo, now = Date.now()): string | null {
  const durationMap = getTouristPassProductDurations();
  const endMs = computeStackedTouristPassEndMs(info.nonSubscriptionTransactions, durationMap);
  if (endMs == null || endMs <= now) {
    return null;
  }
  return new Date(endMs).toISOString();
}

export type MarketplaceSortKey = 'random' | 'distance' | 'name' | 'rating' | 'newest';

export interface MarketplaceListFilters {
  category?: string;
  sort: MarketplaceSortKey;
  nearMe: boolean;
  minRating?: number;
  hasRate?: boolean;
  verified?: boolean;
}

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceListFilters = {
  sort: 'random',
  nearMe: false,
};

export const MARKETPLACE_SORTS: MarketplaceSortKey[] = [
  'random',
  'distance',
  'name',
  'rating',
  'newest',
];

export function countActiveMarketplaceFilters(filters: MarketplaceListFilters): number {
  let count = 0;
  if (filters.category) {
    count += 1;
  }
  if (filters.nearMe) {
    count += 1;
  }
  if (filters.minRating != null && filters.minRating > 0) {
    count += 1;
  }
  if (filters.hasRate) {
    count += 1;
  }
  if (filters.verified) {
    count += 1;
  }
  return count;
}

export function hasActiveMarketplaceFilters(filters: MarketplaceListFilters): boolean {
  return countActiveMarketplaceFilters(filters) > 0;
}

export function marketplaceCtaInterval(total: number): number {
  if (total <= 0) {
    return 4;
  }
  return Math.min(10, Math.max(4, Math.floor(total / 3)));
}

export type MarketplaceListItem =
  | { type: 'provider'; provider: import('@/lib/types').MarketplaceProvider }
  | { type: 'cta'; id: string };

export function buildMarketplaceListItems(
  providers: import('@/lib/types').MarketplaceProvider[],
): MarketplaceListItem[] {
  const interval = marketplaceCtaInterval(providers.length);
  const items: MarketplaceListItem[] = [];
  providers.forEach((provider, index) => {
    if (index > 0 && (index + 1) % interval === 0) {
      items.push({ type: 'cta', id: `cta-${index}` });
    }
    items.push({ type: 'provider', provider });
  });
  return items;
}

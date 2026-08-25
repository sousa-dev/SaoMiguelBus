import type { TourSummary } from '@/lib/types';

export type TourSortKey = 'featured' | 'priceLow' | 'priceHigh' | 'rating' | 'durationShort' | 'durationLong';
export type TourRatingFilterKey = 'all' | '4' | '4.5';
export type TourPriceRangeKey = 'all' | 'budget' | 'mid' | 'premium';
export type TourDurationRangeKey = 'all' | 'short' | 'halfDay' | 'fullDay';

export type TourListFilters = {
  query: string;
  sort: TourSortKey;
  rating: TourRatingFilterKey;
  price: TourPriceRangeKey;
  duration: TourDurationRangeKey;
};

export const EMPTY_TOUR_FILTERS: TourListFilters = {
  query: '',
  sort: 'featured',
  rating: 'all',
  price: 'all',
  duration: 'all',
};

export const TOUR_SORT_OPTIONS: TourSortKey[] = [
  'featured',
  'priceLow',
  'priceHigh',
  'rating',
  'durationShort',
  'durationLong',
];

export const TOUR_RATING_OPTIONS: TourRatingFilterKey[] = ['all', '4', '4.5'];

export const TOUR_PRICE_OPTIONS: TourPriceRangeKey[] = ['all', 'budget', 'mid', 'premium'];

export const TOUR_DURATION_OPTIONS: TourDurationRangeKey[] = ['all', 'short', 'halfDay', 'fullDay'];

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function countActiveTourFilters(filters: TourListFilters): number {
  let count = 0;
  if (filters.query.trim().length > 0) {
    count += 1;
  }
  if (filters.sort !== 'featured') {
    count += 1;
  }
  if (filters.rating !== 'all') {
    count += 1;
  }
  if (filters.price !== 'all') {
    count += 1;
  }
  if (filters.duration !== 'all') {
    count += 1;
  }
  return count;
}

export function hasActiveTourFilters(filters: TourListFilters): boolean {
  return countActiveTourFilters(filters) > 0;
}

function matchesRating(tour: TourSummary, rating: TourRatingFilterKey): boolean {
  if (rating === 'all') {
    return true;
  }
  if (tour.rating == null) {
    return false;
  }
  const min = rating === '4.5' ? 4.5 : 4;
  return tour.rating >= min;
}

function matchesPrice(tour: TourSummary, price: TourPriceRangeKey): boolean {
  if (price === 'all') {
    return true;
  }
  if (tour.fromPrice == null) {
    return false;
  }
  if (price === 'budget') {
    return tour.fromPrice < 50;
  }
  if (price === 'mid') {
    return tour.fromPrice >= 50 && tour.fromPrice <= 100;
  }
  return tour.fromPrice > 100;
}

function matchesDuration(tour: TourSummary, duration: TourDurationRangeKey): boolean {
  if (duration === 'all') {
    return true;
  }
  const minutes = tour.durationMinutes;
  if (minutes == null || minutes <= 0) {
    return false;
  }
  if (duration === 'short') {
    return minutes < 180;
  }
  if (duration === 'halfDay') {
    return minutes >= 180 && minutes < 360;
  }
  return minutes >= 360;
}

export function filterTours(tours: TourSummary[], filters: TourListFilters): TourSummary[] {
  const q = normalizeSearchText(filters.query);
  return tours.filter((tour) => {
    if (!matchesRating(tour, filters.rating)) {
      return false;
    }
    if (!matchesPrice(tour, filters.price)) {
      return false;
    }
    if (!matchesDuration(tour, filters.duration)) {
      return false;
    }
    if (!q) {
      return true;
    }
    return normalizeSearchText(tour.title).includes(q);
  });
}

function compareNullableNumber(a: number | null, b: number | null, direction: 'asc' | 'desc'): number {
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return 1;
  }
  if (b == null) {
    return -1;
  }
  return direction === 'asc' ? a - b : b - a;
}

export function sortTours(
  tours: TourSummary[],
  sort: TourSortKey,
  originalOrder: TourSummary[],
): TourSummary[] {
  const list = [...tours];
  if (sort === 'featured') {
    const order = new Map(originalOrder.map((tour, index) => [tour.code, index]));
    return list.sort((a, b) => (order.get(a.code) ?? 0) - (order.get(b.code) ?? 0));
  }
  if (sort === 'priceLow') {
    return list.sort((a, b) => compareNullableNumber(a.fromPrice, b.fromPrice, 'asc'));
  }
  if (sort === 'priceHigh') {
    return list.sort((a, b) => compareNullableNumber(a.fromPrice, b.fromPrice, 'desc'));
  }
  if (sort === 'rating') {
    return list.sort((a, b) => compareNullableNumber(a.rating, b.rating, 'desc'));
  }
  if (sort === 'durationShort') {
    return list.sort((a, b) => compareNullableNumber(a.durationMinutes, b.durationMinutes, 'asc'));
  }
  return list.sort((a, b) => compareNullableNumber(a.durationMinutes, b.durationMinutes, 'desc'));
}

export function filterAndSortTours(tours: TourSummary[], filters: TourListFilters): TourSummary[] {
  const filtered = filterTours(tours, filters);
  return sortTours(filtered, filters.sort, tours);
}

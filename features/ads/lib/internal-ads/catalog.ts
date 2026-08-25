import type { ModuleKey } from '@/config/island';

import type { InternalAdCreative } from '@/features/ads/lib/internal-ads/types';

const PAYWALL_WEIGHT = 5;
const MODULE_WEIGHT = 2;
const TOURS_WEIGHT = 4;

const PAYWALL_CREATIVES: InternalAdCreative[] = [
  {
    id: 'paywall-remove-ads',
    kind: 'paywall',
    weight: PAYWALL_WEIGHT,
    backgroundColor: '#F59E0B',
    titleKey: 'removeAdsTitle',
    subtitleKey: 'clickToRemoveAds',
    hintKey: 'clickToRemoveAds',
  },
  {
    id: 'paywall-tired',
    kind: 'paywall',
    weight: PAYWALL_WEIGHT,
    backgroundColor: '#A855F7',
    titleKey: 'tiredOfAdsTitle',
    subtitleKey: 'upgradeNowButton',
    hintKey: 'clickToRemoveAds',
  },
  {
    id: 'paywall-upgrade',
    kind: 'paywall',
    weight: PAYWALL_WEIGHT,
    backgroundColor: '#218732',
    titleKey: 'upgradeForBetterTitle',
    subtitleKey: 'interstitialAdDescription',
    hintKey: 'upgradeNowButton',
  },
  {
    id: 'paywall-premium',
    kind: 'paywall',
    weight: PAYWALL_WEIGHT,
    backgroundColor: '#14B8A6',
    titleKey: 'removeAdsTitle',
    subtitleKey: 'removeAdsBannerSubtitle',
    hintKey: 'upgradeNowButton',
  },
];

const MODULE_PROMO_CONFIG: Array<{
  moduleKey: ModuleKey;
  backgroundColor: string;
  titleKey: string;
  subtitleKey: string;
}> = [
  {
    moduleKey: 'events',
    backgroundColor: '#0891b2',
    titleKey: 'internalAdModuleTitleEvents',
    subtitleKey: 'internalAdModuleSubtitleEvents',
  },
  {
    moduleKey: 'trails',
    backgroundColor: '#059669',
    titleKey: 'internalAdModuleTitleTrails',
    subtitleKey: 'internalAdModuleSubtitleTrails',
  },
  {
    moduleKey: 'weather',
    backgroundColor: '#0ea5e9',
    titleKey: 'internalAdModuleTitleWeather',
    subtitleKey: 'internalAdModuleSubtitleWeather',
  },
  {
    moduleKey: 'news',
    backgroundColor: '#2563eb',
    titleKey: 'internalAdModuleTitleNews',
    subtitleKey: 'internalAdModuleSubtitleNews',
  },
  {
    moduleKey: 'seismic',
    backgroundColor: '#dc2626',
    titleKey: 'internalAdModuleTitleSeismic',
    subtitleKey: 'internalAdModuleSubtitleSeismic',
  },
  {
    moduleKey: 'marketplace',
    backgroundColor: '#7c3aed',
    titleKey: 'internalAdModuleTitleMarketplace',
    subtitleKey: 'internalAdModuleSubtitleMarketplace',
  },
  {
    moduleKey: 'traffic',
    backgroundColor: '#ea580c',
    titleKey: 'internalAdModuleTitleTraffic',
    subtitleKey: 'internalAdModuleSubtitleTraffic',
  },
];

const MODULE_CREATIVES: InternalAdCreative[] = MODULE_PROMO_CONFIG.map((entry) => ({
  id: `module-${entry.moduleKey}`,
  kind: 'module',
  moduleKey: entry.moduleKey,
  weight: entry.moduleKey === 'events' ? TOURS_WEIGHT : MODULE_WEIGHT,
  backgroundColor: entry.backgroundColor,
  titleKey: entry.titleKey,
  subtitleKey: entry.subtitleKey,
  hintKey: 'internalAdModuleHint',
}));

export const INTERNAL_AD_CATALOG: InternalAdCreative[] = [...PAYWALL_CREATIVES, ...MODULE_CREATIVES];

export function getInternalCreativeById(id: string): InternalAdCreative | undefined {
  return INTERNAL_AD_CATALOG.find((creative) => creative.id === id);
}

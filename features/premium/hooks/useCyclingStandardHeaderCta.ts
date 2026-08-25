import { Ban, Crown, WifiOff, type LucideIcon } from 'lucide-react-native';
import { usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';

export const STANDARD_HEADER_CTA_VARIANT_COUNT = 3;

export type StandardHeaderCtaIndex = 0 | 1 | 2;

export type StandardHeaderCtaContent = {
  label: string;
  compactLabel: string;
  Icon: LucideIcon;
};

let globalCtaCycleCounter = 0;

function nextStandardHeaderCtaIndex(): number {
  const index = globalCtaCycleCounter % STANDARD_HEADER_CTA_VARIANT_COUNT;
  globalCtaCycleCounter += 1;
  return index;
}

/** Cycles Go premium → Remove ads → Offline access on mount and each navigation. */
export function useCyclingStandardHeaderCta(): StandardHeaderCtaIndex {
  const pathname = usePathname();
  const [index, setIndex] = useState(nextStandardHeaderCtaIndex);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) {
      return;
    }
    prevPathname.current = pathname;
    setIndex(nextStandardHeaderCtaIndex());
  }, [pathname]);

  return index as StandardHeaderCtaIndex;
}

export function standardHeaderCtaContent(
  t: TFunction,
  index: StandardHeaderCtaIndex,
): StandardHeaderCtaContent {
  switch (index) {
    case 0:
      return {
        label: t('premiumGoPremium'),
        compactLabel: t('premiumHeaderButton'),
        Icon: Crown,
      };
    case 1:
      return {
        label: t('removeAdsButton'),
        compactLabel: t('removeAdsButton'),
        Icon: Ban,
      };
    case 2:
      return {
        label: t('premiumHeaderCtaOfflineAccess'),
        compactLabel: t('premiumHeaderCtaOfflineAccess'),
        Icon: WifiOff,
      };
    default: {
      const _exhaustive: never = index as never;
      return _exhaustive;
    }
  }
}

export function standardHeaderCtaLabel(t: TFunction, index: StandardHeaderCtaIndex): string {
  return standardHeaderCtaContent(t, index).label;
}

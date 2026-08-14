/**
 * The single source of truth for the changeover UI (03 §1).
 *
 * Every component reads this hook — nothing reads `bootstrap.transitSchedule`
 * directly, and nothing computes a phase from a date.
 */

import { useCallback, useEffect, useMemo } from 'react';

import {
  bannerCopy,
  canTrack,
  nextPreviewDataset,
  resolveScheduleUi,
  searchDataset,
  type ScheduleUi,
} from '@/features/transit/lib/schedule-config';
import { useBootstrapCached } from '@/features/transit/hooks/useBootstrapQueries';
import { useProfileStore } from '@/lib/profile-store';
import type { TransitDataset, TransitScheduleConfig } from '@/lib/types';

export interface ScheduleConfigView extends ScheduleUi {
  config: TransitScheduleConfig | null;
  isPreviewing: boolean;
  setPreviewing: (on: boolean) => void;
  bannerText: string | null;
  badgeText: string | null;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
  canTrackTrips: boolean;
}

export function useScheduleConfig(locale = 'pt'): ScheduleConfigView {
  const { data: bootstrap } = useBootstrapCached();
  const config = bootstrap?.transitSchedule ?? null;

  const stored = useProfileStore((s) => s.transitPreviewDataset);
  const setStored = useProfileStore((s) => s.setTransitPreviewDataset);
  const dismissedId = useProfileStore((s) => s.dismissedScheduleBannerId);
  const dismiss = useProfileStore((s) => s.dismissScheduleBanner);

  // A preview toggled in August must not survive into September.
  const effective = nextPreviewDataset(config, stored);
  useEffect(() => {
    if (stored !== effective) {
      setStored(effective);
    }
  }, [stored, effective, setStored]);

  const isPreviewing = effective != null;
  const ui = useMemo(
    () => resolveScheduleUi(config, { isPreviewing }),
    [config, isPreviewing],
  );

  const setPreviewing = useCallback(
    (on: boolean) => setStored(on ? searchDataset(config, true) : null),
    [config, setStored],
  );

  const dismissBanner = useCallback(() => {
    if (config?.banner) {
      dismiss(config.banner.id);
    }
  }, [config, dismiss]);

  return {
    ...ui,
    config,
    isPreviewing,
    setPreviewing,
    bannerText: ui.showBanner ? bannerCopy(config?.banner, locale) : null,
    badgeText: ui.showBadge ? bannerCopy(config?.badge, locale) : null,
    // Dismissal is keyed on the banner id, so changing it server-side re-shows it.
    isBannerDismissed: config?.banner != null && dismissedId === config.banner.id,
    dismissBanner,
    canTrackTrips: canTrack(config, isPreviewing),
  };
}

/** The dataset to send on transit requests — null unless actively previewing. */
export function useTransitDataset(): TransitDataset | null {
  return useScheduleConfig().dataset;
}

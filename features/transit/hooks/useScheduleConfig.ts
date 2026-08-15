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
  resolveBanner,
  resolveScheduleUi,
  searchDataset,
  type ScheduleUi,
} from '@/features/transit/lib/schedule-config';
import { useBootstrapCached } from '@/features/transit/hooks/useBootstrapQueries';
import { useProfileStore } from '@/lib/profile-store';
import type {
  TransitDataset,
  TransitScheduleBanner,
  TransitScheduleConfig,
} from '@/lib/types';

export interface ScheduleConfigView extends ScheduleUi {
  config: TransitScheduleConfig | null;
  /** The banner for the current phase, with any per-phase overrides applied. */
  banner: TransitScheduleBanner | null;
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

  // The phase-resolved banner: copy and dismissal id both follow the phase, so a
  // banner dismissed during preview reappears when the changeover goes live.
  const banner = useMemo(() => resolveBanner(config), [config]);

  const dismissBanner = useCallback(() => {
    if (banner) {
      dismiss(banner.id);
    }
  }, [banner, dismiss]);

  return {
    ...ui,
    config,
    isPreviewing,
    setPreviewing,
    banner,
    bannerText: ui.showBanner ? bannerCopy(banner, locale) : null,
    badgeText: ui.showBadge ? bannerCopy(config?.badge, locale) : null,
    // Dismissal is keyed on the banner id, so changing it server-side re-shows it.
    isBannerDismissed: banner != null && dismissedId === banner.id,
    dismissBanner,
    canTrackTrips: canTrack(config, isPreviewing),
  };
}

/** The dataset to send on transit requests — null unless actively previewing. */
export function useTransitDataset(): TransitDataset | null {
  return useScheduleConfig().dataset;
}

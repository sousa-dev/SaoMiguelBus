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
  simulatedDataset,
  simulatePhase,
  type ScheduleUi,
} from '@/features/transit/lib/schedule-config';
import { useBootstrapCached } from '@/features/transit/hooks/useBootstrapQueries';
import { useSimulatedPhase } from '@/features/transit/lib/schedule-dev-store';
import { useProfileStore } from '@/lib/profile-store';
import type {
  TransitDataset,
  TransitScheduleBanner,
  TransitScheduleConfig,
} from '@/lib/types';

export interface ScheduleConfigView extends ScheduleUi {
  config: TransitScheduleConfig | null;
  /** True while a dev/admin is previewing a post-cutover phase (never in prod UI). */
  isSimulated: boolean;
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
  const served = bootstrap?.transitSchedule ?? null;

  // Substituted at the source, so every consumer of this hook — banner, badge,
  // preview toggle, tracking gate, maps gate, request dataset — sees a
  // consistent post-cutover world rather than each growing its own flag.
  // `'off'` for anyone who may not simulate, so this is identity in production.
  const simulated = useSimulatedPhase();
  const config = useMemo(
    () => simulatePhase(served, simulated, Date.now()) ?? null,
    [served, simulated],
  );

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
    // The substituted config alone would give the September UI over August
    // data: the live server keeps serving the legacy network until the real
    // cutover, so the dataset has to go on the wire explicitly.
    dataset: simulated === 'off' ? ui.dataset : simulatedDataset(simulated),
    config,
    isSimulated: simulated !== 'off',
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

/**
 * Which network is ACTUALLY being searched — the preview override if one is on,
 * otherwise whatever the server says is active.
 *
 * Distinct from `useTransitDataset`, which answers "what should I put on the
 * wire" and is deliberately null when not previewing. Map entry points need the
 * resolved answer, because only AzoresBus carries route geometry: legacy has no
 * shapes and no poles, so offering a network or line map there leads nowhere.
 */
export function useResolvedTransitDataset(): TransitDataset | null {
  const { config, dataset } = useScheduleConfig();
  return dataset ?? config?.activeDataset ?? null;
}

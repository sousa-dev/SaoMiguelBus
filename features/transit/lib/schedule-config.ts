/**
 * Every changeover decision, as pure functions over `bootstrap.transitSchedule`.
 * No date literal appears here or anywhere downstream: the only instants are the
 * ones the server sent.
 *
 * Two facts about the deployed contract drive the shape of this module:
 *
 *  1. `transitSchedule` is always present. An island with no azoresbus flags
 *     still gets `{cutoverAt: null, phase: 'preview', previewDataset: null}`, so
 *     "is this configured" is `cutoverAt != null` — not the presence of a block.
 *  2. The server sends `banner` and `badge` in every phase; it does not null
 *     them out in `settled`. Production is seeded with LIVE copy right now while
 *     the phase is `preview` and no cutover is armed, so the phase gate has to
 *     live here or the app announces a changeover that has not happened.
 */

import type {
  SchedulePhase,
  TransitDataset,
  TransitScheduleBanner,
  TransitScheduleConfig,
} from '@/lib/types';

export interface ScheduleUi {
  /** A cutover instant is armed. Nothing changeover-related renders below this. */
  isConfigured: boolean;
  phase: SchedulePhase | null;
  showBanner: boolean;
  showToggle: boolean;
  showBadge: boolean;
  /** Results carry the "not yet valid" caveat while the user is previewing. */
  showPreviewWarning: boolean;
  showTracking: boolean;
  /** The dataset to send on requests — null unless actively previewing. */
  dataset: TransitDataset | null;
  hasCrossedCutover: boolean;
}

function instant(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The preview dataset, and only ever that.
 *
 * `activeDataset` is for display — "which network am I looking at" — and must
 * never become a request parameter: a `dataset=legacy` from a 24h-old bootstrap
 * would pin a client to the dead network on 1 September, and the server treats an
 * explicit request as winning forever (98 §4 gap, "Stale bootstrap").
 */
export function searchDataset(
  config: TransitScheduleConfig | null | undefined,
  isPreviewing: boolean,
): TransitDataset | null {
  if (!isPreviewing || !config) {
    return null;
  }
  // The only value the app may ever send. `legacy` is admin/debug, never ours.
  return config.previewDataset === 'azoresbus' ? 'azoresbus' : null;
}

export function resolveScheduleUi(
  config: TransitScheduleConfig | null | undefined,
  options: { isPreviewing: boolean; now?: number },
): ScheduleUi {
  const cutover = instant(config?.cutoverAt);
  // Gates the BANNER and the BADGE, both of which announce a dated changeover.
  const isConfigured = config != null && cutover != null;
  const phase = config?.phase ?? null;
  const dataset = searchDataset(config, options.isPreviewing);
  // The TOGGLE is gated separately and deliberately. `previewDataset` is the
  // server explicitly saying "offer a preview"; requiring a cutover on top meant
  // an admin could switch previewEnabled on and see nothing happen.
  const canPreview = phase === 'preview' && config?.previewDataset != null;

  return {
    isConfigured,
    phase: isConfigured ? phase : null,
    // The server keeps sending banner and badge after they should have retired,
    // so the phase gate is ours to apply.
    showBanner: isConfigured && phase !== 'settled' && config?.banner != null,
    showToggle: canPreview,
    showBadge: isConfigured && phase === 'live' && config?.badge != null,
    showPreviewWarning: canPreview && options.isPreviewing,
    showTracking: Boolean(config?.trackingEnabled),
    dataset,
    hasCrossedCutover: cutover != null && (options.now ?? Date.now()) >= cutover,
  };
}

/**
 * Bus tracking schedules a countdown against a specific trip, so it must not run
 * against timetables that are not yet in force (03 §3). Unconfigured behaves
 * exactly as today.
 */
export function canTrack(
  config: TransitScheduleConfig | null | undefined,
  isPreviewing: boolean,
): boolean {
  return !resolveScheduleUi(config, { isPreviewing }).showPreviewWarning;
}

/**
 * The stored preview toggle, after the server has had its say. A user who turned
 * preview on in August must not be stuck in a meaningless mode in September.
 */
export function nextPreviewDataset(
  config: TransitScheduleConfig | null | undefined,
  stored: TransitDataset | null | undefined,
): TransitDataset | null {
  if (!stored) {
    return null;
  }
  const offered = searchDataset(config, true);
  if (!offered || config?.phase !== 'preview') {
    return null;
  }
  return stored === offered ? offered : null;
}

/**
 * Whether the cached config has become a lie.
 *
 * Bootstrap is persisted for 24h, `useBootstrapCached` never refetches, and app
 * foreground only flushes analytics — so without this a config cached on
 * 31 August is still being applied on 1 September (98 §4 gap).
 */
export function shouldInvalidateAt(
  config: TransitScheduleConfig | null | undefined,
  now: number,
): boolean {
  const transition = instant(config?.nextTransitionAt);
  return transition != null && now >= transition;
}

/** Milliseconds until the next transition, or null if there is nothing to wait for. */
export function msUntilTransition(
  config: TransitScheduleConfig | null | undefined,
  now: number,
): number | null {
  const transition = instant(config?.nextTransitionAt);
  if (transition == null || transition <= now) {
    return null;
  }
  return transition - now;
}

/** Banner/badge copy with a `locale → 'pt' → first value` fallback chain. */
export function bannerCopy(
  banner: TransitScheduleBanner | { text: Record<string, string> } | null | undefined,
  locale: string,
): string | null {
  const text = banner?.text;
  if (!text) {
    return null;
  }
  const base = locale.split('-')[0];
  const values = Object.values(text);
  return text[locale] ?? text[base] ?? text.pt ?? values[0] ?? null;
}

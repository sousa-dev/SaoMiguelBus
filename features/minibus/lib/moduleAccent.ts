import { getModule } from '@/lib/modules';

/**
 * PDL MiniBus's brand accent (orange) — the module's visual signature next to
 * the app-wide green the Transit module uses. Single source of truth for every
 * MiniBus-specific badge, border and pin, so the two modules share a layout
 * but never a colour.
 */
export const MINIBUS_ACCENT: string = getModule('minibus')?.accent ?? '#f47216';

import type { ModuleKey } from '@/config/island';

export type InternalAdKind = 'paywall' | 'module';

export type InternalAdSurface = 'banner' | 'interstitial' | 'app_open';

export interface InternalAdCreative {
  id: string;
  kind: InternalAdKind;
  moduleKey?: ModuleKey;
  weight: number;
  backgroundColor: string;
  titleKey: string;
  subtitleKey: string;
  hintKey?: string;
}

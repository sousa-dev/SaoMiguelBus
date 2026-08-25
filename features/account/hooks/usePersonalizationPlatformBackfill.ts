import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useConsentStore } from '@/lib/consent-store';
import { backfillPlatformIfNeeded } from '@/lib/personalization-sync';

/**
 * On app open (and foreground return), fetch the server personalization profile
 * and backfill platform when the row was created before platform tagging.
 */
export function usePersonalizationPlatformBackfill() {
  const decided = useConsentStore((s) => s.decided);
  const personalizationConsent = useConsentStore((s) => s.purposes.personalization);

  useEffect(() => {
    if (!decided || !personalizationConsent) {
      return;
    }
    void backfillPlatformIfNeeded();
  }, [decided, personalizationConsent]);

  useEffect(() => {
    if (!decided || !personalizationConsent) {
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void backfillPlatformIfNeeded();
      }
    });
    return () => sub.remove();
  }, [decided, personalizationConsent]);
}

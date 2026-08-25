import { fetchPersonalization, postPersonalization } from '@/lib/api';
import { useConsentStore } from '@/lib/consent-store';
import { getAnalyticsPlatform } from '@/lib/platform';
import { getOrCreateSessionId } from '@/lib/session';

/** Backfill platform on server profiles created before platform tagging. */
export async function backfillPlatformIfNeeded(): Promise<void> {
  const { decided, purposes } = useConsentStore.getState();
  if (!decided || !purposes.personalization) {
    return;
  }

  try {
    const sessionId = await getOrCreateSessionId();
    const remote = await fetchPersonalization(sessionId);
    if (!remote.user_type) {
      return;
    }
    if (remote.platform) {
      return;
    }

    await postPersonalization(sessionId, {
      user_type: remote.user_type,
      interests: remote.interests,
      home_municipality: remote.home_municipality,
      platform: getAnalyticsPlatform(),
    });
  } catch {
    // Offline / dev without backend — no-op.
  }
}

import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useNetwork } from '@/lib/network-provider';
import { usePremiumStore } from '@/lib/premium-store';

/**
 * One-time prompt shown when a user becomes premium without cached offline data,
 * inviting them to download it so offline route search works. Renders nothing —
 * it only drives a native alert.
 */
export function PremiumOfflinePrompt() {
  const { t } = useTranslation();
  const { isPremium, isOnline, hasOfflineBundle, syncNow } = useNetwork();
  const offlinePromptSeen = usePremiumStore((s) => s.offlinePromptSeen);
  const setOfflinePromptSeen = usePremiumStore((s) => s.setOfflinePromptSeen);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!isPremium || offlinePromptSeen || hasOfflineBundle || !isOnline || shownRef.current) {
      return;
    }
    shownRef.current = true;
    setOfflinePromptSeen(true);
    Alert.alert(t('premiumOfflinePromptTitle'), t('premiumOfflinePromptBody'), [
      { text: t('premiumOfflinePromptDismiss'), style: 'cancel' },
      { text: t('premiumOfflinePromptConfirm'), onPress: () => void syncNow() },
    ]);
  }, [isPremium, offlinePromptSeen, hasOfflineBundle, isOnline, syncNow, setOfflinePromptSeen, t]);

  return null;
}

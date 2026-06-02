import { Redirect, useSegments } from 'expo-router';
import React from 'react';

import { useConsentStore } from '@/lib/consent-store';

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const decided = useConsentStore((s) => s.decided);
  const segments = useSegments();

  const onConsentScreen = segments[0] === 'onboarding';

  if (!decided && !onConsentScreen) {
    return <Redirect href="/onboarding/consent" />;
  }

  return <>{children}</>;
}

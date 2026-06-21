import { Redirect, useSegments } from 'expo-router';
import React from 'react';

import { useConsentStore } from '@/lib/consent-store';
import { usePersonalizationStore } from '@/lib/personalization-store';

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const decided = useConsentStore((s) => s.decided);
  const seen = usePersonalizationStore((s) => s.seen);
  const segments = useSegments();

  const onOnboarding = segments[0] === 'onboarding';

  if (!decided && !onOnboarding) {
    return <Redirect href="/onboarding/consent" />;
  }

  if (decided && !seen && !onOnboarding) {
    return <Redirect href="/onboarding/personalize" />;
  }

  return <>{children}</>;
}

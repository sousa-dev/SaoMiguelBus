import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';

type Listener = () => void;

export type AdViewportValue = {
  /** Subscribe to scroll ticks. Returns an unsubscribe. */
  subscribe: (listener: Listener) => () => void;
};

const AdViewportContext = createContext<AdViewportValue | null>(null);

/**
 * Lets an ad slot wait until it is nearly on screen before requesting an ad.
 *
 * Transit results render in a plain `ScrollView` with no recycling, so every
 * inline slot mounts at once. Requesting an ad for each of them the moment a
 * search returns fires several requests for cards most riders never scroll to,
 * which is wasted inventory and a request-to-impression ratio Google reads as
 * a bad signal.
 *
 * Scroll position deliberately does NOT live in state: that would re-render
 * every journey card on every frame. Listeners are held in a ref and notified
 * imperatively, and each slot latches once and unsubscribes itself.
 */
export function useAdViewportSource() {
  const listeners = useRef(new Set<Listener>());

  const onScroll = useCallback(() => {
    for (const listener of listeners.current) {
      listener();
    }
  }, []);

  const value = useMemo<AdViewportValue>(
    () => ({
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => {
          listeners.current.delete(listener);
        };
      },
    }),
    [],
  );

  // Ad loading does not need frame precision — a few ticks a second is plenty,
  // and keeps the bridge quiet while a rider flicks through results.
  return { value, onScroll, scrollEventThrottle: 200 };
}

export function AdViewportProvider({
  value,
  children,
}: {
  value: AdViewportValue;
  children: React.ReactNode;
}) {
  return <AdViewportContext.Provider value={value}>{children}</AdViewportContext.Provider>;
}

/** Null outside a provider, which means "load immediately" — the old behaviour. */
export function useAdViewport(): AdViewportValue | null {
  return useContext(AdViewportContext);
}

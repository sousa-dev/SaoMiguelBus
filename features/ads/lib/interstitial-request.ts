export type InterstitialIntent = 'search' | 'live_entry';

type PendingRequest = {
  intent: InterstitialIntent;
  resolve: () => void;
};

let pending: PendingRequest | null = null;
const listeners = new Set<(intent: InterstitialIntent) => void>();

export function subscribeInterstitialRequests(listener: (intent: InterstitialIntent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestInterstitial(intent: InterstitialIntent): Promise<void> {
  return new Promise((resolve) => {
    pending = { intent, resolve };
    for (const listener of listeners) {
      listener(intent);
    }
  });
}

export function completeInterstitialRequest(): void {
  if (pending) {
    pending.resolve();
    pending = null;
  }
}

export function getPendingInterstitialIntent(): InterstitialIntent | null {
  return pending?.intent ?? null;
}

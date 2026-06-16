export const ADMOB_LOAD_BACKOFF_INITIAL_MS = 5_000;
export const ADMOB_LOAD_BACKOFF_MAX_MS = 120_000;

/** Exponential backoff for failed fullscreen ad loads (5s → 10s → … → 120s cap). */
export function nextAdLoadBackoffMs(currentMs: number): number {
  return Math.min(currentMs * 2, ADMOB_LOAD_BACKOFF_MAX_MS);
}

export type AdLoadSchedulerCallbacks = {
  onLoad: () => void;
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Coalesces fullscreen ad load() calls and backs off after errors so we do not
 * hit Google's "too many recently failed requests" throttle.
 */
export class AdLoadScheduler {
  private backoffMs = ADMOB_LOAD_BACKOFF_INITIAL_MS;
  private retryTimer: TimeoutHandle | null = null;
  private loading = false;

  constructor(private readonly callbacks: AdLoadSchedulerCallbacks) {}

  /** Prefetch immediately (init, or after the user closes a shown ad). */
  requestImmediateLoad(): void {
    this.clearRetryTimer();
    this.backoffMs = ADMOB_LOAD_BACKOFF_INITIAL_MS;
    this.startLoad();
  }

  /** Schedule the next prefetch after a failed load. */
  scheduleRetryAfterError(): void {
    if (this.retryTimer != null || this.loading) {
      return;
    }
    const delayMs = this.backoffMs;
    this.backoffMs = nextAdLoadBackoffMs(this.backoffMs);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.startLoad();
    }, delayMs);
  }

  markLoadSettled(): void {
    this.loading = false;
  }

  markLoadSucceeded(): void {
    this.loading = false;
    this.backoffMs = ADMOB_LOAD_BACKOFF_INITIAL_MS;
  }

  cancel(): void {
    this.clearRetryTimer();
    this.loading = false;
    this.backoffMs = ADMOB_LOAD_BACKOFF_INITIAL_MS;
  }

  private startLoad(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.callbacks.onLoad();
  }

  private clearRetryTimer(): void {
    if (this.retryTimer != null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

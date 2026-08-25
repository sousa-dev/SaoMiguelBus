export interface QueuedAnalyticsEvent {
  module: string;
  event_type: string;
  properties?: Record<string, unknown>;
  occurred_at: string;
}

export const ANALYTICS_QUEUE_KEY = 'azores_hub_analytics_queue';
export const MAX_QUEUE_SIZE = 2000;
export const BATCH_SIZE = 50;
export const FLUSH_CAP_PER_CYCLE = 500;

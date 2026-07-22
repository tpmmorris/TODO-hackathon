import type { Env } from './env';

interface AnalyticsEvent {
  name: string;
  route: string;
  status?: string;
  urgency?: string;
  language?: string;
  count?: number;
  durationMs?: number;
  hasMedicine?: boolean;
}

/** Writes operational metrics only. Never send symptoms, patient IDs, or transcripts here. */
export function recordAnalyticsEvent(env: Env, event: AnalyticsEvent): void {
  env.ANALYTICS?.writeDataPoint({
    indexes: [event.name, event.route, event.status ?? 'unknown', event.urgency ?? 'unknown', event.language ?? 'en'],
    blobs: [event.name, event.route, event.status ?? 'unknown', event.urgency ?? 'unknown', event.language ?? 'en', event.hasMedicine ? 'medicine' : 'no-medicine'],
    doubles: [event.count ?? 0, event.durationMs ?? 0]
  });
}

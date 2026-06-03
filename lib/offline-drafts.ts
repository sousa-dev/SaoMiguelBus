import AsyncStorage from '@react-native-async-storage/async-storage';

import { createTrafficReport, postSeismicFelt } from '@/lib/api';
import { logger } from '@/lib/logger';
import { getOrCreateSessionId } from '@/lib/session';
import type { SeismicFeltInput, TrafficReportWriteInput } from '@/lib/types';

const DRAFTS_KEY = 'azores_hub_offline_drafts';

interface DraftBase {
  id: string;
  createdAt: number;
}

export interface SeismicFeltDraft extends DraftBase {
  kind: 'seismic_felt';
  eventId: number;
  input: SeismicFeltInput;
}

export interface TrafficReportDraft extends DraftBase {
  kind: 'traffic_report';
  input: TrafficReportWriteInput;
}

export type OfflineDraft = SeismicFeltDraft | TrafficReportDraft;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadDrafts(): Promise<OfflineDraft[]> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as OfflineDraft[];
  } catch {
    return [];
  }
}

async function saveDrafts(drafts: OfflineDraft[]): Promise<void> {
  await AsyncStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export async function enqueueDraft(
  draft: Omit<SeismicFeltDraft, 'id' | 'createdAt'> | Omit<TrafficReportDraft, 'id' | 'createdAt'>,
): Promise<void> {
  const drafts = await loadDrafts();
  drafts.push({ ...draft, id: newId(), createdAt: Date.now() } as OfflineDraft);
  await saveDrafts(drafts);
}

async function replayDraft(draft: OfflineDraft): Promise<void> {
  const sessionId = await getOrCreateSessionId();
  if (draft.kind === 'seismic_felt') {
    await postSeismicFelt(draft.eventId, { session_id: sessionId, ...draft.input });
  } else {
    await createTrafficReport(draft.input);
  }
}

/**
 * Replay queued safety reports. Kept simple: each draft is retried once; drafts
 * that still fail stay queued for the next reconnect.
 */
export async function flushDrafts(): Promise<number> {
  const drafts = await loadDrafts();
  if (drafts.length === 0) {
    return 0;
  }
  const remaining: OfflineDraft[] = [];
  let flushed = 0;
  for (const draft of drafts) {
    try {
      await replayDraft(draft);
      flushed += 1;
    } catch (error) {
      logger.warn('offline draft replay failed, keeping queued', draft.kind, error);
      remaining.push(draft);
    }
  }
  await saveDrafts(remaining);
  return flushed;
}

export async function hasPendingDrafts(): Promise<boolean> {
  return (await loadDrafts()).length > 0;
}

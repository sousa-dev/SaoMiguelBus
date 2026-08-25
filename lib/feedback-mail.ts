import * as MailComposer from 'expo-mail-composer';
import { Linking } from 'react-native';

import { logger } from '@/lib/logger';

export const FEEDBACK_RECIPIENT = 'info@sousadev.com';

export type FeedbackCategory = 'bug' | 'feature' | 'suggestion' | 'feedback';

export type FeedbackContext = {
  /** Originating route path (e.g. `/transit/directions`). */
  from: string;
  /** Human-readable screen label. */
  label: string;
  appVersion: string;
  platform: string;
  locale: string;
};

export type ComposeFeedbackInput = {
  category: FeedbackCategory;
  subject: string;
  description: string;
  context: FeedbackContext;
  replyEmail?: string;
  /** Local file URIs of screenshots (native composer only). */
  attachments?: string[];
};

export type ComposeResult = 'sent' | 'saved' | 'cancelled' | 'fallback' | 'unavailable';

const CATEGORY_TAG: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  feature: 'Feature',
  suggestion: 'Suggestion',
  feedback: 'Feedback',
};

export function buildSubject(category: FeedbackCategory, subject: string): string {
  return `[${CATEGORY_TAG[category]}] ${subject}`.trim();
}

export function buildBody(input: ComposeFeedbackInput): string {
  const { description, context, replyEmail } = input;
  const lines = [
    description.trim(),
    '',
    '— Sent from São Miguel Bus —',
    `Screen: ${context.label} (${context.from})`,
    `App version: ${context.appVersion}`,
    `Platform: ${context.platform}`,
    `Language: ${context.locale}`,
  ];
  if (replyEmail?.trim()) {
    lines.push(`Reply to: ${replyEmail.trim()}`);
  }
  return lines.join('\n');
}

function mailtoUrl(subject: string, body: string): string {
  const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `mailto:${FEEDBACK_RECIPIENT}?${query}`;
}

/**
 * Open the OS mail client with a pre-filled draft to {@link FEEDBACK_RECIPIENT}.
 * Uses the native composer (with screenshot attachments) when available, and
 * falls back to a `mailto:` link (no attachments) otherwise — e.g. on web.
 */
export type MarketplaceEditSuggestionInput = {
  provider: { id: number; name: string; category: string };
  context: FeedbackContext;
  subject: string;
  description: string;
};

/** Pre-filled mail draft for suggesting corrections to a marketplace listing. */
export async function composeMarketplaceEditSuggestion(
  input: MarketplaceEditSuggestionInput,
): Promise<ComposeResult> {
  return composeFeedbackEmail({
    category: 'suggestion',
    subject: input.subject,
    description: input.description,
    context: input.context,
  });
}

export async function composeFeedbackEmail(input: ComposeFeedbackInput): Promise<ComposeResult> {
  const subject = buildSubject(input.category, input.subject);
  const body = buildBody(input);

  let available = false;
  try {
    available = await MailComposer.isAvailableAsync();
  } catch (error) {
    logger.debug('MailComposer.isAvailableAsync failed', error);
  }

  if (available) {
    const result = await MailComposer.composeAsync({
      recipients: [FEEDBACK_RECIPIENT],
      subject,
      body,
      attachments: input.attachments?.length ? input.attachments : undefined,
    });
    if (result.status === 'sent') {
      return 'sent';
    }
    if (result.status === 'saved') {
      return 'saved';
    }
    return 'cancelled';
  }

  const url = mailtoUrl(subject, body);
  const canOpen = await Linking.canOpenURL(url).catch(() => false);
  if (!canOpen) {
    return 'unavailable';
  }
  await Linking.openURL(url);
  return 'fallback';
}

const DOCUMENT_SLUG_PATTERN = /^[a-z0-9-]+$/;

function apiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
}

export function isValidMinibusDocumentSlug(slug: string): boolean {
  return DOCUMENT_SLUG_PATTERN.test(slug.trim());
}

/** Build the document stream URL from the app API base (avoids http/https mismatch from server absolute URLs). */
export function buildMinibusDocumentFileUrl(slug: string): string {
  const normalized = slug.trim();
  return `${apiBase()}/api/v3/minibus/documents/${encodeURIComponent(normalized)}/file`;
}

export function isAllowedMinibusDocumentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const base = new URL(apiBase());
    if (parsed.hostname !== base.hostname) {
      return false;
    }
    return parsed.pathname.startsWith('/api/v3/minibus/documents/') && parsed.pathname.endsWith('/file');
  } catch {
    return false;
  }
}

function documentSlugFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/api\/v3\/minibus\/documents\/([^/]+)\/file$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Prefer offline file URI; otherwise stream via the configured API base (HTTPS in prod). */
export function resolveMinibusImageUri(
  localUri?: string | null,
  remoteUrl?: string | null,
  documentSlug?: string,
): string | null {
  if (localUri) {
    return localUri;
  }
  if (documentSlug && isValidMinibusDocumentSlug(documentSlug)) {
    return buildMinibusDocumentFileUrl(documentSlug);
  }
  if (!remoteUrl) {
    return null;
  }
  if (isAllowedMinibusDocumentUrl(remoteUrl)) {
    const slug = documentSlugFromUrl(remoteUrl);
    if (slug) {
      return buildMinibusDocumentFileUrl(slug);
    }
  }
  return remoteUrl;
}

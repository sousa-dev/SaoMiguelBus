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

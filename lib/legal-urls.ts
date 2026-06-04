const LEGAL_BASE = (process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://saomiguelhub.com').replace(
  /\/$/,
  '',
);

export const LEGAL_URLS = {
  terms: `${LEGAL_BASE}/terms`,
  privacy: `${LEGAL_BASE}/privacy`,
} as const;

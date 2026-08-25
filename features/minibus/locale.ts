/** Mini Bus catalog is authored in PT + EN only — PT for Portuguese app, EN otherwise. */
export function resolveMinibusApiLocale(language: string | undefined): 'pt' | 'en' {
  const normalized = (language ?? 'pt').trim().toLowerCase();
  return normalized.startsWith('pt') ? 'pt' : 'en';
}

import type { AppTheme } from '@/lib/theme';

export function magnitudeColor(theme: AppTheme, magnitude: number): string {
  if (magnitude >= 5) {
    return theme.danger;
  }
  if (magnitude >= 3) {
    return theme.warning;
  }
  return theme.success;
}

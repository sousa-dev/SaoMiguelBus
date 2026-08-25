type FleetBarTitleTranslate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export function liveFleetBarTitle(
  t: FleetBarTitleTranslate,
  count: number,
  filteredLineCode: string | null,
): string {
  if (filteredLineCode) {
    return t('minibusLiveFleetBarTitleFiltered', { line: filteredLineCode, count });
  }
  return t('minibusLiveFleetBarTitle', { count });
}

type FleetBarTitleTranslate = (
  key: string,
  options?: Record<string, string | number>,
) => string;

export type FleetBarTitleKeys = {
  title: string;
  titleFiltered: string;
};

export function liveFleetBarTitle(
  t: FleetBarTitleTranslate,
  count: number,
  filteredLineCode: string | null,
  keys: FleetBarTitleKeys,
): string {
  if (filteredLineCode) {
    return t(keys.titleFiltered, { line: filteredLineCode, count });
  }
  return t(keys.title, { count });
}

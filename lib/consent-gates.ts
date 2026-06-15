/** Pure consent gates — testable without React Native / Zustand. */
export function canInitAdMobFromState(decided: boolean, isPremium: boolean): boolean {
  return decided && !isPremium;
}

export function canShowPersonalizedAdsFromState(decided: boolean, adsPurpose: boolean): boolean {
  return decided && adsPurpose;
}

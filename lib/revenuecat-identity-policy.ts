/** RevenueCat throws if `logOut()` is called while the SDK user is already anonymous. */
export function shouldCallRevenueCatLogOut(isAnonymous: boolean): boolean {
  return !isAnonymous;
}

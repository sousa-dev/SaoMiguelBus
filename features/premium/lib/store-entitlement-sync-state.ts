/** True after the first RevenueCat CustomerInfo sync attempt (success or failure). */
let storeEntitlementSyncCompleted = false;

export function markStoreEntitlementSyncCompleted(): void {
  storeEntitlementSyncCompleted = true;
}

export function hasCompletedStoreEntitlementSync(): boolean {
  return storeEntitlementSyncCompleted;
}

/** Test-only reset. */
export function resetStoreEntitlementSyncStateForTests(): void {
  storeEntitlementSyncCompleted = false;
}

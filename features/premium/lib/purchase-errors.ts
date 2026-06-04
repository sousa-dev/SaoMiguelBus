import { PURCHASES_ERROR_CODE } from 'react-native-purchases';

type RcError = { code?: string; userCancelled?: boolean };

/** User-cancelled is a normal flow, not an error to surface. */
export function isPurchaseCancelled(error: unknown): boolean {
  const e = error as RcError | null;
  return e?.userCancelled === true || e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

/** Map a RevenueCat error to a user-facing i18n key. */
export function purchaseErrorMessageKey(error: unknown): string {
  const code = (error as RcError | null)?.code;
  switch (code) {
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
      return 'premiumPurchaseNetworkError';
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'premiumPurchaseStoreError';
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return 'premiumPurchasePending';
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
      return 'premiumPurchaseAlreadyOwned';
    default:
      return 'premiumPurchaseError';
  }
}

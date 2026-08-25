import { useMutation, useQuery } from '@tanstack/react-query';
import Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import { useReconcileEntitlement } from '@/features/premium/hooks/useReconcileEntitlement';
import { useAuthStore } from '@/lib/auth-store';
import {
  bindRevenueCatIdentity,
  hasPremiumEntitlement,
  isIdentityBound,
  isRevenueCatConfigured,
} from '@/lib/revenuecat';

/** Sentinel errors surfaced to the UI for non-store failures. */
export const IDENTITY_UNBOUND = 'IDENTITY_UNBOUND';

/** The current RevenueCat offering (packages to display in a custom paywall). */
export function useOfferings() {
  return useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings.current ?? null;
    },
    enabled: isRevenueCatConfigured(),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });
}

/**
 * Purchase + restore actions. Both reconcile entitlement on success.
 *
 * Signed-in purchases are gated on the SDK identity matching the backend user so
 * a failed `logIn` can never mis-attribute a purchase to an anonymous id.
 * Signed-out purchases use the anonymous RevenueCat identity.
 */
export function usePremiumPurchases() {
  const reconcile = useReconcileEntitlement();

  const purchase = useMutation({
    mutationFn: async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
      const user = useAuthStore.getState().user;
      if (user) {
        if (!(await isIdentityBound(user))) {
          await bindRevenueCatIdentity(user);
          if (!(await isIdentityBound(user))) {
            throw new Error(IDENTITY_UNBOUND);
          }
        }
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: (info) => reconcile(info),
  });

  const restore = useMutation({
    mutationFn: async (): Promise<CustomerInfo> => {
      return Purchases.restorePurchases();
    },
    onSuccess: (info) => reconcile(info),
  });

  return { purchase, restore, hasPremiumEntitlement };
}

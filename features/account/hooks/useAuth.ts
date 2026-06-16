import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  deleteAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  socialAuth,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useEntitlementStore } from '@/lib/entitlement-store';
import type { AuthResponse } from '@/lib/types';

/** Account auth actions + reactive session state. */
export function useAuth() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const onSession = async (res: AuthResponse) => {
    await setSession(res.token, res.user);
    await queryClient.invalidateQueries({ queryKey: ['billing', 'entitlement'] });
  };

  const register = useMutation({ mutationFn: registerAccount, onSuccess: onSession });
  const login = useMutation({ mutationFn: loginAccount, onSuccess: onSession });
  const social = useMutation({ mutationFn: socialAuth, onSuccess: onSession });
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await logoutAccount();
      } finally {
        // Always drop the local session even if the server call fails.
        await clearSession();
      }
    },
    onSuccess: async () => {
      useEntitlementStore.getState().clearBackendEntitlement();
      await queryClient.invalidateQueries({ queryKey: ['billing', 'entitlement'] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      // Account is gone server-side; drop backend entitlement. Store entitlement
      // reflects whatever RevenueCat reports for the device store account.
      useEntitlementStore.getState().clearBackendEntitlement();
      await clearSession();
      await queryClient.invalidateQueries({ queryKey: ['billing', 'entitlement'] });
    },
  });

  return {
    user,
    isSignedIn: Boolean(token),
    register,
    login,
    social,
    logout,
    deleteAccount: deleteAccountMutation,
  };
}

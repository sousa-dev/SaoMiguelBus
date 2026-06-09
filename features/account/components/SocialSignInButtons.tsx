import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/account/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';
import { useAppTheme } from '@/lib/theme';
import { radius, space, typography } from '@/lib/tokens';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
const GOOGLE_ENABLED = Object.values(GOOGLE_IDS).some(Boolean);

type Props = {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
};

/**
 * Google sign-in is isolated in its own component because
 * `Google.useIdTokenAuthRequest` throws when no client IDs are configured. We
 * only mount this when `GOOGLE_ENABLED`, so the hook never runs without IDs.
 * `GOOGLE_ENABLED` is a module constant, so the mount decision is stable across
 * renders and does not violate the rules of hooks.
 */
function GoogleSignInButton({ onSuccess, onError }: Props) {
  const { social } = useAuth();
  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(GOOGLE_IDS);

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success') {
      const idToken =
        googleResponse.params?.id_token ?? googleResponse.authentication?.idToken ?? null;
      if (!idToken) {
        onError?.(new Error('google_missing_id_token'));
        return;
      }
      social
        .mutateAsync({ provider: 'google', identityToken: idToken })
        .then(() => onSuccess?.())
        .catch((err) => {
          logger.error('Google sign-in failed', err);
          onError?.(err);
        });
    } else if (googleResponse.type === 'error') {
      onError?.(new Error('google_auth_error'));
    }
  }, [googleResponse]);

  return (
    <Button
      variant="outline"
      label="Continue with Google"
      onPress={() => void promptGoogle()}
      loading={social.isPending}
      fullWidth
    />
  );
}

export function SocialSignInButtons({ onSuccess, onError }: Props) {
  const theme = useAppTheme();
  const { social } = useAuth();

  const [appleAvailable, setAppleAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const onApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError?.(new Error('apple_missing_identity_token'));
        return;
      }
      const name = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : '';
      await social.mutateAsync({
        provider: 'apple',
        identityToken: credential.identityToken,
        displayName: name,
        // Sent to the backend so it can revoke the Apple grant on account deletion.
        authorizationCode: credential.authorizationCode ?? undefined,
      });
      onSuccess?.();
    } catch (err) {
      // User-cancelled is not an error.
      if ((err as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      logger.error('Apple sign-in failed', err);
      onError?.(err);
    }
  };

  if (!appleAvailable && !GOOGLE_ENABLED) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
        <Text style={[typography.caption, { color: theme.muted }]}>·</Text>
        <View style={[styles.line, { backgroundColor: theme.border }]} />
      </View>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            theme.isDark
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={radius.md}
          style={styles.appleButton}
          onPress={onApple}
        />
      ) : null}

      {GOOGLE_ENABLED ? (
        <GoogleSignInButton onSuccess={onSuccess} onError={onError} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.xl, gap: space.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  appleButton: { height: 48, width: '100%' },
});

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/features/account/hooks/useAuth';
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

// "Sign in with Google" branding — the two approved neutral button styles.
// Colors per https://developers.google.com/identity/branding-guidelines
const GOOGLE_BRAND = {
  light: { bg: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { bg: '#131314', border: '#8E918F', text: '#E3E3E3' },
} as const;

/** Official 4-color Google "G" logo. */
function GoogleGlyph({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/**
 * Google sign-in is isolated in its own component because
 * `Google.useIdTokenAuthRequest` throws when no client IDs are configured. We
 * only mount this when `GOOGLE_ENABLED`, so the hook never runs without IDs.
 * `GOOGLE_ENABLED` is a module constant, so the mount decision is stable across
 * renders and does not violate the rules of hooks.
 */
function GoogleSignInButton({ onSuccess, onError }: Props) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { social } = useAuth();
  const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest(GOOGLE_IDS);
  const brand = theme.isDark ? GOOGLE_BRAND.dark : GOOGLE_BRAND.light;

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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('authContinueWithGoogle')}
      accessibilityState={{ disabled: social.isPending, busy: social.isPending }}
      disabled={social.isPending}
      onPress={() => void promptGoogle()}
      android_ripple={Platform.OS === 'android' ? { color: brand.border } : undefined}
      style={({ pressed }) => [
        styles.googleButton,
        {
          backgroundColor: brand.bg,
          borderColor: brand.border,
          opacity: social.isPending ? 0.6 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {social.isPending ? (
        <ActivityIndicator color={brand.text} />
      ) : (
        <View style={styles.googleContent}>
          <GoogleGlyph />
          <Text style={[styles.googleLabel, { color: brand.text }]}>
            {t('authContinueWithGoogle')}
          </Text>
        </View>
      )}
    </Pressable>
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
  googleButton: {
    height: 48,
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Google brand spec calls for Roboto Medium 14; fall back to the system medium weight.
  googleLabel: { fontSize: 14, fontWeight: '500' },
});

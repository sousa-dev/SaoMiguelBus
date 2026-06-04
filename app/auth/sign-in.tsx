import { useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SocialSignInButtons } from '@/features/account/components/SocialSignInButtons';
import {
  authErrorFromUnknown,
  formatAuthErrorMessage,
  type AuthUiError,
} from '@/features/account/lib/auth-errors';
import { useAuth } from '@/features/account/hooks/useAuth';
import { usePaywall } from '@/features/premium/hooks/usePaywall';
import { consumePendingPaywall } from '@/features/premium/lib/paywall-intent';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { useAppTheme } from '@/lib/theme';
import { space, typography } from '@/lib/tokens';

type Mode = 'login' | 'register';

export default function SignInScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const navigation = useNavigation();
  const screenOptions = useAppStackScreenOptions();
  const { login, register } = useAuth();
  const { present } = usePaywall();

  // Resume into the paywall when sign-in was triggered from an upsell.
  const finishAuth = () => {
    router.back();
    if (consumePendingPaywall()) {
      void present();
    }
  };

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<AuthUiError | null>(null);

  const errorText = error ? formatAuthErrorMessage(error, t) : undefined;
  const emailError = error?.field === 'email' ? errorText : undefined;
  const passwordError = error?.field === 'password' ? errorText : undefined;
  const generalError = error?.field === null ? errorText : undefined;

  const pending = login.isPending || register.isPending;

  useLayoutEffect(() => {
    navigation.setOptions({
      ...screenOptions,
      headerShown: true,
      title: t('authTitle'),
      presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
    });
  }, [navigation, screenOptions, t]);

  const onSubmit = async () => {
    setError(null);
    try {
      if (mode === 'register') {
        await register.mutateAsync({ email: email.trim(), password, displayName: displayName.trim() });
      } else {
        await login.mutateAsync({ email: email.trim(), password });
      }
      finishAuth();
    } catch (err) {
      setError(authErrorFromUnknown(err));
    }
  };

  const modeOptions = [
    { value: 'login' as Mode, label: t('authSignIn') },
    { value: 'register' as Mode, label: t('authCreateAccount') },
  ];

  return (
    <Screen withStackHeader collapsable={false}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[typography.body, styles.intro, { color: theme.muted }]}>
          {t('authIntro')}
        </Text>

        <SegmentedControl
          options={modeOptions}
          value={mode}
          onChange={(value) => {
            setMode(value);
            setError(null);
          }}
          accessibilityLabel={t('authTitle')}
        />

        <View style={styles.form}>
          {mode === 'register' ? (
            <Field
              label={t('authNameLabel')}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              textContentType="name"
            />
          ) : null}
          <Field
            label={t('authEmailLabel')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={emailError}
          />
          <Field
            label={t('authPasswordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={mode === 'register' ? 'newPassword' : 'password'}
            error={passwordError}
          />
          {generalError ? (
            <Text style={[typography.caption, { color: theme.danger }]}>{generalError}</Text>
          ) : null}
          <Button
            label={mode === 'register' ? t('authCreateAccount') : t('authSignIn')}
            onPress={onSubmit}
            loading={pending}
            fullWidth
          />
        </View>

        <SocialSignInButtons
          onError={(err) => setError(authErrorFromUnknown(err))}
          onSuccess={finishAuth}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  intro: { marginBottom: space.lg },
  form: { marginTop: space.xl, gap: space.sm },
});

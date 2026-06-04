import { useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SocialSignInButtons } from '@/features/account/components/SocialSignInButtons';
import { useAuth } from '@/features/account/hooks/useAuth';
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

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      router.back();
    } catch {
      setError(mode === 'register' ? t('authRegisterError') : t('authLoginError'));
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
          />
          <Field
            label={t('authPasswordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType={mode === 'register' ? 'newPassword' : 'password'}
            error={error ?? undefined}
          />
          <Button
            label={mode === 'register' ? t('authCreateAccount') : t('authSignIn')}
            onPress={onSubmit}
            loading={pending}
            fullWidth
          />
        </View>

        <SocialSignInButtons onError={() => setError(t('authSocialError'))} onSuccess={() => router.back()} />
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

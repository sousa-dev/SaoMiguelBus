import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useMarketplaceCategories } from '@/features/marketplace/hooks/useMarketplaceQueries';
import type { MarketplaceProvider, ProviderWriteInput } from '@/lib/types';
import type { AppTheme } from '@/lib/theme';

export function ProviderForm({
  theme,
  initial,
  submitting,
  error,
  onSubmit,
}: {
  theme: AppTheme;
  initial?: MarketplaceProvider;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: ProviderWriteInput) => void;
}) {
  const { t } = useTranslation();
  const categories = useMarketplaceCategories();

  const [name, setName] = useState(initial?.name ?? '');
  const [categorySlug, setCategorySlug] = useState(initial?.category.slug ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [rate, setRate] = useState(initial?.hourlyRate != null ? String(initial.hourlyRate) : '');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim() || !categorySlug) {
      setLocalError(t('marketplaceFormError'));
      return;
    }
    setLocalError(null);
    const parsedRate = rate.trim() ? Number(rate.replace(',', '.')) : null;
    onSubmit({
      name: name.trim(),
      category_slug: categorySlug,
      bio: bio.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      hourly_rate: Number.isFinite(parsedRate as number) ? parsedRate : null,
    });
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Field theme={theme} label={t('marketplaceFormName')} value={name} onChange={setName} />

      <Text style={[styles.label, { color: theme.muted }]}>{t('marketplaceFormCategory')}</Text>
      <View style={styles.chips}>
        {(categories.data ?? []).map((cat) => {
          const active = cat.slug === categorySlug;
          return (
            <Pressable
              key={cat.slug}
              onPress={() => setCategorySlug(cat.slug)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : theme.card,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={{ color: active ? '#fff' : theme.text, fontWeight: '600', fontSize: 13 }}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Field theme={theme} label={t('marketplaceFormBio')} value={bio} onChange={setBio} multiline />
      <Field theme={theme} label={t('marketplaceFormPhone')} value={phone} onChange={setPhone} keyboardType="phone-pad" />
      <Field theme={theme} label={t('marketplaceFormWhatsapp')} value={whatsapp} onChange={setWhatsapp} keyboardType="phone-pad" />
      <Field theme={theme} label={t('marketplaceFormEmail')} value={email} onChange={setEmail} keyboardType="email-address" />
      <Field theme={theme} label={t('marketplaceFormRate')} value={rate} onChange={setRate} keyboardType="numeric" />

      {(localError || error) ? (
        <Text style={{ color: '#c0392b', marginTop: 8 }}>{localError || error}</Text>
      ) : null}

      <Pressable
        onPress={submit}
        disabled={submitting}
        style={[styles.submit, { backgroundColor: theme.primary }]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>{t('marketplaceFormSubmit')}</Text>
        )}
      </Pressable>
      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 10, textAlign: 'center' }}>
        {t('marketplaceFormPendingNotice')}
      </Text>
    </ScrollView>
  );
}

function Field({
  theme,
  label,
  value,
  onChange,
  multiline,
  keyboardType,
}: {
  theme: AppTheme;
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[
          styles.input,
          { borderColor: theme.border, color: theme.text, backgroundColor: theme.card },
          multiline ? { minHeight: 70, textAlignVertical: 'top' } : null,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  submit: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontWeight: '700' },
});

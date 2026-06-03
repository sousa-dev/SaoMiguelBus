import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { useMarketplaceCategories } from '@/features/marketplace/hooks/useMarketplaceQueries';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { MarketplaceProvider, ProviderWriteInput } from '@/lib/types';

type ProviderFormProps = {
  initial?: MarketplaceProvider;
  submitting: boolean;
  error: string | null;
  onSubmit: (input: ProviderWriteInput) => void;
  onDelete?: () => void;
  deleting?: boolean;
};

export function ProviderForm({
  initial,
  submitting,
  error,
  onSubmit,
  onDelete,
  deleting,
}: ProviderFormProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const categories = useMarketplaceCategories();

  const [name, setName] = useState(initial?.name ?? '');
  const [categorySlug, setCategorySlug] = useState(initial?.category.slug ?? '');
  const [useNewCategory, setUseNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [rate, setRate] = useState(initial?.hourlyRate != null ? String(initial.hourlyRate) : '');
  const [isOwner, setIsOwner] = useState(initial?.claimedOwner ?? false);
  const [ownerEmail, setOwnerEmail] = useState(initial?.internalEmail ?? '');
  const [ownerPhone, setOwnerPhone] = useState(initial?.internalPhone ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectExistingCategory = (slug: string) => {
    setUseNewCategory(false);
    setNewCategoryName('');
    setCategorySlug(slug);
    setFieldErrors((e) => ({ ...e, category: '' }));
  };

  const enableNewCategory = () => {
    setUseNewCategory(true);
    setCategorySlug('');
  };

  const submit = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = t('marketplaceFormError');
    }
    if (!bio.trim()) {
      errors.bio = t('marketplaceFormBioRequired');
    }
    const hasContact = phone.trim() || whatsapp.trim() || email.trim();
    if (!hasContact) {
      errors.contact = t('marketplaceFormContactRequired');
    }
    if (useNewCategory) {
      if (newCategoryName.trim().length < 2) {
        errors.category = t('marketplaceFormCategoryNameError');
      }
    } else if (!categorySlug) {
      errors.category = t('marketplaceFormError');
    }
    if (isOwner && !ownerEmail.trim() && !ownerPhone.trim()) {
      errors.ownerContact = t('marketplaceFormOwnerContactRequired');
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const parsedRate = rate.trim() ? Number(rate.replace(',', '.')) : null;
    const payload: ProviderWriteInput = {
      name: name.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      email: email.trim(),
      hourly_rate: Number.isFinite(parsedRate as number) ? parsedRate : null,
    };
    if (useNewCategory) {
      payload.category_name = newCategoryName.trim();
    } else {
      payload.category_slug = categorySlug;
    }
    payload.claimed_owner = isOwner;
    if (isOwner) {
      payload.internal_email = ownerEmail.trim();
      payload.internal_phone = ownerPhone.trim();
    } else {
      payload.internal_email = '';
      payload.internal_phone = '';
    }
    onSubmit(payload);
  };

  const summaryError = error ?? (Object.keys(fieldErrors).length > 0 ? t('marketplaceFormError') : null);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {summaryError ? <Banner variant="danger" message={summaryError} /> : null}

        <Card elevated style={styles.section}>
          <Text style={[typography.overline, styles.sectionTitle, { color: theme.muted }]}>
            {t('marketplaceFormSectionBasics')}
          </Text>
          <Field
            label={t('marketplaceFormName')}
            value={name}
            onChangeText={setName}
            error={fieldErrors.name}
          />
        </Card>

        <Card elevated style={styles.section}>
          <Text style={[typography.overline, styles.sectionTitle, { color: theme.muted }]}>
            {t('marketplaceFormCategory')}
          </Text>
          <View style={styles.chips}>
            {(categories.data ?? []).map((cat) => (
              <Chip
                key={cat.slug}
                label={cat.name}
                selected={!useNewCategory && cat.slug === categorySlug}
                onPress={() => selectExistingCategory(cat.slug)}
              />
            ))}
            <Chip
              label={`+ ${t('marketplaceFormNewCategory')}`}
              selected={useNewCategory}
              onPress={enableNewCategory}
            />
          </View>
          {useNewCategory ? (
            <Field
              label={t('marketplaceFormCategoryName')}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder={t('marketplaceFormCategoryNamePlaceholder')}
              hint={t('marketplaceFormCategoryNameHint')}
              error={fieldErrors.category}
            />
          ) : fieldErrors.category ? (
            <Text style={[typography.caption, { color: theme.danger, marginTop: space.xs }]}>
              {fieldErrors.category}
            </Text>
          ) : null}
        </Card>

        <Card elevated style={styles.section}>
          <Text style={[typography.overline, styles.sectionTitle, { color: theme.muted }]}>
            {t('marketplaceFormSectionContacts')}
          </Text>
          <Field
            label={t('marketplaceFormPhone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label={t('marketplaceFormWhatsapp')}
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
          />
          <Field
            label={t('marketplaceFormEmail')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {fieldErrors.contact ? (
            <Text style={[typography.caption, { color: theme.danger, marginTop: space.xs }]}>
              {fieldErrors.contact}
            </Text>
          ) : null}
          <Field
            label={t('marketplaceFormRateOptional')}
            value={rate}
            onChangeText={setRate}
            keyboardType="decimal-pad"
          />
          <View style={styles.ownerRow}>
            <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]}>
              {t('marketplaceFormIsOwner')}
            </Text>
            <Switch
              value={isOwner}
              onValueChange={setIsOwner}
              trackColor={{ false: theme.outline, true: theme.primary }}
            />
          </View>
          {isOwner ? (
            <>
              <Text style={[typography.caption, { color: theme.muted, marginBottom: space.sm }]}>
                {t('marketplaceFormOwnerContactHint')}
              </Text>
              <Field
                label={t('marketplaceFormOwnerEmail')}
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label={t('marketplaceFormOwnerPhone')}
                value={ownerPhone}
                onChangeText={setOwnerPhone}
                keyboardType="phone-pad"
              />
              {fieldErrors.ownerContact ? (
                <Text style={[typography.caption, { color: theme.danger, marginTop: space.xs }]}>
                  {fieldErrors.ownerContact}
                </Text>
              ) : null}
            </>
          ) : null}
        </Card>

        <Card elevated style={styles.section}>
          <Text style={[typography.overline, styles.sectionTitle, { color: theme.muted }]}>
            {t('marketplaceFormSectionDescription')}
          </Text>
          <Field
            label={t('marketplaceFormBio')}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            error={fieldErrors.bio}
          />
        </Card>

        <Button label={t('marketplaceFormSubmit')} onPress={submit} loading={submitting} fullWidth />
        {onDelete ? (
          <Button
            label={t('marketplaceDeleteAction')}
            variant="danger"
            onPress={onDelete}
            loading={deleting}
            fullWidth
            style={{ marginTop: space.md }}
          />
        ) : null}
        <Text style={[typography.caption, styles.notice, { color: theme.muted }]}>
          {t('marketplaceFormPendingNotice')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  section: { marginBottom: space.lg },
  sectionTitle: { marginBottom: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
    marginBottom: space.sm,
  },
  notice: { textAlign: 'center', marginTop: space.md },
});

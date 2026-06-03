import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { SocialLink } from '@/lib/types';

export const COMMON_SOCIAL_PLATFORMS = [
  'Instagram',
  'Facebook',
  'TikTok',
  'YouTube',
  'X',
  'LinkedIn',
] as const;

type SocialRow = {
  key: string;
  platform: string;
  customLabel: string;
  url: string;
};

function rowFromLink(link: SocialLink, index: number): SocialRow {
  const isCommon = COMMON_SOCIAL_PLATFORMS.includes(
    link.label as (typeof COMMON_SOCIAL_PLATFORMS)[number],
  );
  return {
    key: `existing-${index}`,
    platform: isCommon ? link.label : 'custom',
    customLabel: isCommon ? '' : link.label,
    url: link.url,
  };
}

function emptyRow(key: string): SocialRow {
  return { key, platform: '', customLabel: '', url: '' };
}

export function buildSocialLinksFromRows(rows: SocialRow[]): SocialLink[] {
  const out: SocialLink[] = [];
  for (const row of rows) {
    const url = row.url.trim();
    if (!url) continue;
    const label =
      row.platform === 'custom'
        ? row.customLabel.trim()
        : row.platform.trim();
    if (!label) continue;
    out.push({ label, url });
  }
  return out;
}

export function validateSocialRows(
  rows: SocialRow[],
  t: (key: string) => string,
): string | null {
  for (const row of rows) {
    const url = row.url.trim();
    const hasPlatform = row.platform === 'custom'
      ? row.customLabel.trim().length > 0
      : Boolean(row.platform);
    if ((hasPlatform || url) && (!hasPlatform || !url)) {
      return t('marketplaceFormSocialUrlRequired');
    }
  }
  return null;
}

export function useSocialLinksState(initial?: SocialLink[]) {
  const [rows, setRows] = useState<SocialRow[]>(() =>
    initial?.length ? initial.map(rowFromLink) : [],
  );

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow(`new-${Date.now()}`)]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateRow = (key: string, patch: Partial<SocialRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  return { rows, addRow, removeRow, updateRow, setRows };
}

export function SocialLinksEditor({
  rows,
  addRow,
  removeRow,
  updateRow,
  error,
  onChange,
}: {
  rows: SocialRow[];
  addRow: () => void;
  removeRow: (key: string) => void;
  updateRow: (key: string, patch: Partial<SocialRow>) => void;
  error?: string | null;
  onChange?: () => void;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={[typography.label, { color: theme.text, marginBottom: space.sm }]}>
        {t('marketplaceFormSocials')}
      </Text>
      {rows.map((row) => (
        <View key={row.key} style={[styles.row, { borderColor: theme.border }]}>
          <Text style={[typography.caption, { color: theme.muted, marginBottom: space.xs }]}>
            {t('marketplaceFormSocialPlatform')}
          </Text>
          <View style={styles.chips}>
            {COMMON_SOCIAL_PLATFORMS.map((platform) => (
              <Chip
                key={platform}
                label={platform}
                selected={row.platform === platform}
                onPress={() => {
                  updateRow(row.key, { platform, customLabel: '' });
                  onChange?.();
                }}
              />
            ))}
            <Chip
              label={t('marketplaceFormSocialCustom')}
              selected={row.platform === 'custom'}
              onPress={() => {
                updateRow(row.key, { platform: 'custom' });
                onChange?.();
              }}
            />
          </View>
          {row.platform === 'custom' ? (
            <Field
              label={t('marketplaceFormSocialCustomTitle')}
              value={row.customLabel}
              onChangeText={(customLabel) => {
                updateRow(row.key, { customLabel });
                onChange?.();
              }}
            />
          ) : null}
          <Field
            label={t('marketplaceFormSocialUrl')}
            value={row.url}
            onChangeText={(url) => {
              updateRow(row.key, { url });
              onChange?.();
            }}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Button
            label={t('marketplaceFormRemoveSocial')}
            variant="ghost"
            onPress={() => {
              removeRow(row.key);
              onChange?.();
            }}
          />
        </View>
      ))}
      <Button label={t('marketplaceFormAddSocial')} variant="outline" onPress={addRow} fullWidth />
      {error ? (
        <Text style={[typography.caption, { color: theme.danger, marginTop: space.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: space.md },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.md,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm },
});

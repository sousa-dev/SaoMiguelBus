import { Check, MapPin, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { track } from '@/lib/analytics';
import { getMunicipality, MUNICIPALITIES } from '@/lib/municipalities';
import { usePersonalizationStore } from '@/lib/personalization-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { UserType } from '@/lib/types';
import { USER_TYPE_OPTIONS } from '@/lib/user-type-options';

export function ProfilePersonalizationSection() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const userType = usePersonalizationStore((s) => s.userType);
  const homeMunicipality = usePersonalizationStore((s) => s.homeMunicipality);
  const updateProfile = usePersonalizationStore((s) => s.updateProfile);
  const [busy, setBusy] = useState(false);
  const [muniSheetOpen, setMuniSheetOpen] = useState(false);

  const municipalityLabel = homeMunicipality
    ? t(getMunicipality(homeMunicipality)?.labelKey ?? homeMunicipality)
    : t('profileHomeMunicipalityNone');

  const applyPatch = async (patch: { userType?: UserType; homeMunicipality?: string | null }) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await updateProfile(patch);
      const state = usePersonalizationStore.getState();
      track('hub', 'engage', {
        action: 'personalize_profile',
        user_type: state.userType,
        home_municipality: state.homeMunicipality,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Sparkles size={iconSize.md} color={theme.muted} strokeWidth={2} />
        <Text style={[typography.overline, { color: theme.muted, flex: 1 }]}>
          {t('profilePersonalizationTitle')}
        </Text>
      </View>

      <Card style={styles.group}>
        {USER_TYPE_OPTIONS.map(({ value, labelKey, Icon }, index) => {
          const selected = userType === value;
          return (
            <ListRow
              key={value}
              icon={Icon}
              title={t(labelKey)}
              showChevron={false}
              disabled={busy}
              onPress={() => {
                if (selected) {
                  return;
                }
                void applyPatch({ userType: value });
              }}
              divider={index < USER_TYPE_OPTIONS.length - 1}
              trailing={
                selected ? (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <Check size={14} color={theme.onPrimary} strokeWidth={3} />
                  </View>
                ) : null
              }
            />
          );
        })}
      </Card>

      <Card style={styles.group}>
        <ListRow
          icon={MapPin}
          title={t('profileHomeMunicipality')}
          subtitle={municipalityLabel}
          disabled={busy}
          onPress={() => setMuniSheetOpen(true)}
          divider={false}
        />
      </Card>

      <Sheet
        visible={muniSheetOpen}
        onClose={() => setMuniSheetOpen(false)}
        title={t('profileHomeMunicipality')}
      >
        <View style={styles.sheetBody}>
          <Card style={styles.group}>
            <ListRow
              title={t('profileHomeMunicipalityNone')}
              showChevron={false}
              disabled={busy}
              onPress={() => {
                void applyPatch({ homeMunicipality: null }).then(() => setMuniSheetOpen(false));
              }}
              trailing={
                homeMunicipality === null ? (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <Check size={14} color={theme.onPrimary} strokeWidth={3} />
                  </View>
                ) : null
              }
            />
            {MUNICIPALITIES.map((municipality, index) => {
              const selected = homeMunicipality === municipality.key;
              return (
                <ListRow
                  key={municipality.key}
                  title={t(municipality.labelKey)}
                  showChevron={false}
                  disabled={busy}
                  onPress={() => {
                    void applyPatch({ homeMunicipality: municipality.key }).then(() =>
                      setMuniSheetOpen(false),
                    );
                  }}
                  divider={index < MUNICIPALITIES.length - 1}
                  trailing={
                    selected ? (
                      <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                        <Check size={14} color={theme.onPrimary} strokeWidth={3} />
                      </View>
                    ) : null
                  }
                />
              );
            })}
          </Card>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  group: { padding: 0, borderRadius: radius.lg, overflow: 'hidden' },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: { paddingHorizontal: space.lg },
});

import type { LucideIcon } from 'lucide-react-native';
import {
  Briefcase,
  Check,
  ChevronLeft,
  Compass,
  Home,
  Languages,
  LayoutGrid,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LanguagePicker } from '@/components/LanguagePicker';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ListRow } from '@/components/ui/ListRow';
import { resolveEnabledModules } from '@/config/island';
import type { ModuleKey } from '@/config/island';
import { useBootstrapCached } from '@/features/transit/hooks/useTransitQueries';
import { track } from '@/lib/analytics';
import { useHubStore } from '@/lib/hub-store';
import { resolvePickerLocales } from '@/lib/i18n';
import { saveLocale } from '@/lib/locale-prefs';
import { getModule } from '@/lib/modules';
import { MUNICIPALITIES } from '@/lib/municipalities';
import { personaHubDefaults, PERSONALIZABLE_INTERESTS } from '@/lib/persona-defaults';
import {
  PERSONALIZE_STEP_COUNT,
  PERSONALIZE_USER_TYPE_STEP,
  canAdvancePersonalizeStep,
} from '@/lib/personalize-steps';
import { usePersonalizationStore } from '@/lib/personalization-store';
import { hitSlop, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { UserType } from '@/lib/types';

const USER_TYPE_OPTIONS: { value: UserType; labelKey: string; Icon: LucideIcon }[] = [
  { value: 'tourist', labelKey: 'personalizeUserTypeTourist', Icon: Compass },
  { value: 'resident', labelKey: 'personalizeUserTypeResident', Icon: Home },
  { value: 'newcomer', labelKey: 'personalizeUserTypeNewcomer', Icon: Briefcase },
];

const STEP_HERO_ICONS: LucideIcon[] = [Languages, Sparkles, LayoutGrid, MapPin];

const STEP_HINT_KEYS = [
  'personalizeLanguageHint',
  'personalizeUserTypeHint',
  'personalizeInterestsHint',
  'personalizeMunicipalityHint',
] as const;

export default function PersonalizeScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const isEdit = params.edit === '1';

  const { data: bootstrap } = useBootstrapCached();
  const locales = resolvePickerLocales(bootstrap?.island?.locales);
  const enabledKeys = resolveEnabledModules(bootstrap?.island?.enabledModules);

  const storedUserType = usePersonalizationStore((s) => s.userType);
  const storedInterests = usePersonalizationStore((s) => s.interests);
  const storedMunicipality = usePersonalizationStore((s) => s.homeMunicipality);
  const setUserType = usePersonalizationStore((s) => s.setUserType);
  const toggleInterest = usePersonalizationStore((s) => s.toggleInterest);
  const setHomeMunicipality = usePersonalizationStore((s) => s.setHomeMunicipality);
  const complete = usePersonalizationStore((s) => s.complete);
  const skip = usePersonalizationStore((s) => s.skip);
  const applyPersonaLayout = useHubStore((s) => s.applyPersonaLayout);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(() =>
    usePersonalizationStore.persist.hasHydrated(),
  );
  const [draftUserType, setDraftUserType] = useState<UserType | null>(null);
  const draftInitializedRef = useRef(false);
  const [languagePickerForceClosed, setLanguagePickerForceClosed] = useState(false);

  useEffect(() => {
    if (usePersonalizationStore.persist.hasHydrated()) {
      setStoreHydrated(true);
      return;
    }
    return usePersonalizationStore.persist.onFinishHydration(() => {
      setStoreHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!storeHydrated || draftInitializedRef.current) {
      return;
    }
    draftInitializedRef.current = true;
    if (storedUserType !== null) {
      setDraftUserType(storedUserType);
    }
  }, [storeHydrated, storedUserType]);

  const selectableInterests = useMemo(
    () => PERSONALIZABLE_INTERESTS.filter((key) => enabledKeys.includes(key)),
    [enabledKeys],
  );

  const stepLabels = [
    t('personalizeStepLanguage'),
    t('personalizeStepUserType'),
    t('personalizeStepInterests'),
    t('personalizeStepMunicipality'),
  ];

  const HeroIcon = STEP_HERO_ICONS[step] ?? Sparkles;

  /**
   * Where onboarding lets go of the user.
   *
   * The bus search, not the hub: it is the app's home screen and the reason
   * almost everyone installs this. Landing on the hub made a first-time user
   * find the thing they came for before they could use it.
   *
   * Re-entered from Settings this is an EDIT, so it goes back where it was
   * opened from rather than throwing the user onto a tab they did not ask for.
   */
  const exitOnboarding = () => {
    if (isEdit) {
      router.back();
      return;
    }
    router.replace('/(tabs)/transit');
  };

  const onSkip = () => {
    skip();
    exitOnboarding();
  };

  const onFinish = async () => {
    setBusy(true);
    try {
      const userType = storedUserType;
      const filteredInterests = storedInterests.filter((key) => enabledKeys.includes(key));
      if (userType) {
        const layout = personaHubDefaults(userType, filteredInterests);
        applyPersonaLayout(layout);
      }
      await complete();
      track('hub', 'engage', {
        action: 'personalize',
        user_type: userType,
        interests: filteredInterests.join(','),
        home_municipality: storedMunicipality,
        edit: isEdit,
      });
      exitOnboarding();
    } finally {
      setBusy(false);
    }
  };

  const advanceUserType =
    step === PERSONALIZE_USER_TYPE_STEP ? draftUserType : storedUserType;

  const canAdvance = () => canAdvancePersonalizeStep(step, advanceUserType);

  const proceedAdvance = () => {
    if (step < PERSONALIZE_STEP_COUNT - 1) {
      setStep((current) => current + 1);
      return;
    }
    void onFinish();
  };

  const onSelectUserType = (value: UserType) => {
    if (busy || !storeHydrated) {
      return;
    }
    setDraftUserType(value);
    setUserType(value);
    setStep(2);
  };

  const onNext = () => {
    if (step === 0 && !languagePickerForceClosed) {
      setLanguagePickerForceClosed(true);
      queueMicrotask(() => {
        setStep(1);
      });
      return;
    }
    proceedAdvance();
  };

  const onBack = () => {
    if (step > 0) {
      if (step === 1) {
        setLanguagePickerForceClosed(false);
      }
      setStep((current) => current - 1);
    }
  };

  const onSelectLocale = async (code: string) => {
    await saveLocale(code);
    await i18n.changeLanguage(code);
  };

  return (
    <Screen collapsable={false} edges={['top']} style={{ backgroundColor: theme.primary }}>
      <View style={styles.layout}>
        <View style={[styles.hero, { paddingTop: space.md }]}>
          <View style={styles.heroTopBar}>
            {isEdit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('personalizeBack')}
                hitSlop={8}
                onPress={() => router.back()}
                style={styles.heroIconBtn}
              >
                <ChevronLeft size={28} color={theme.onPrimary} strokeWidth={2} />
              </Pressable>
            ) : (
              <View style={styles.heroIconBtn} />
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('personalizeSkip')}
              hitSlop={8}
              disabled={busy}
              onPress={onSkip}
              style={styles.skipBtn}
            >
              <Text style={[typography.label, styles.skipLabel, { color: theme.onPrimary }]}>
                {t('personalizeSkip')}
              </Text>
            </Pressable>
          </View>

          <View style={styles.heroCenter}>
            <View style={[styles.heroRing, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <View style={[styles.heroIconCircle, { backgroundColor: theme.onPrimary }]}>
                <HeroIcon size={44} color={theme.primary} strokeWidth={2} />
              </View>
            </View>
            <Text style={[typography.display, styles.heroTitle, { color: theme.onPrimary }]}>
              {t('personalizeTitle')}
            </Text>
            <Text style={[typography.body, styles.heroSubtitle, { color: 'rgba(255,255,255,0.88)' }]}>
              {t(STEP_HINT_KEYS[step])}
            </Text>
          </View>

          <View style={styles.progressRow}>
            {stepLabels.map((label, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <View key={label} style={styles.progressItem}>
                  <View
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor: active || done ? theme.onPrimary : 'rgba(255,255,255,0.35)',
                        borderColor: active || done ? theme.onPrimary : 'rgba(255,255,255,0.5)',
                      },
                    ]}
                  />
                  <Text
                    style={[
                      typography.caption,
                      styles.progressLabel,
                      { color: active ? theme.onPrimary : 'rgba(255,255,255,0.75)' },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          {!storeHydrated ? (
            <View style={styles.hydrationLoading}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <>
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[typography.overline, styles.stepHeading, { color: theme.muted }]}>
              {stepLabels[step]}
            </Text>

            {step === 0 ? (
              <LanguagePicker
                locales={locales}
                activeLocale={i18n.language}
                onSelect={onSelectLocale}
                forceClosed={languagePickerForceClosed}
              />
            ) : null}

            {step === PERSONALIZE_USER_TYPE_STEP ? (
              <View style={[styles.group, { borderColor: theme.border, backgroundColor: theme.card }]}>
                {USER_TYPE_OPTIONS.map(({ value, labelKey, Icon }) => {
                  const selected = draftUserType === value || storedUserType === value;
                  return (
                    <ListRow
                      key={value}
                      icon={Icon}
                      title={t(labelKey)}
                      showChevron={false}
                      disabled={busy}
                      onPress={() => onSelectUserType(value)}
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
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.chipWrap}>
                {selectableInterests.map((key) => {
                  const module = getModule(key as ModuleKey);
                  const selected = storedInterests.includes(key);
                  return (
                    <Chip
                      key={key}
                      label={module ? t(module.labelKey) : key}
                      selected={selected}
                      onPress={() => toggleInterest(key)}
                    />
                  );
                })}
              </View>
            ) : null}

            {step === 3 ? (
              <View style={[styles.group, { borderColor: theme.border, backgroundColor: theme.card }]}>
                {MUNICIPALITIES.map((municipality) => {
                  const selected = storedMunicipality === municipality.key;
                  return (
                    <ListRow
                      key={municipality.key}
                      title={t(municipality.labelKey)}
                      showChevron={false}
                      onPress={() => setHomeMunicipality(municipality.key)}
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
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.actions,
              {
                borderTopColor: theme.border,
                paddingBottom: Math.max(insets.bottom, space.lg),
              },
            ]}
          >
            {step > 0 ? (
              <Button
                label={t('personalizeBack')}
                variant="outline"
                onPress={onBack}
                disabled={busy}
                fullWidth
              />
            ) : null}
            {step !== PERSONALIZE_USER_TYPE_STEP ? (
              <Button
                label={step === PERSONALIZE_STEP_COUNT - 1 ? t('personalizeFinish') : t('personalizeNext')}
                onPress={onNext}
                disabled={busy || !canAdvance()}
                fullWidth
                style={{ marginTop: step > 0 ? space.md : 0 }}
              />
            ) : null}
          </View>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: hitSlop.minTouch,
    marginBottom: space.sm,
  },
  heroIconBtn: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  skipLabel: {
    opacity: 0.95,
  },
  heroCenter: {
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  heroRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    textAlign: 'center',
    marginTop: space.lg,
  },
  heroSubtitle: {
    textAlign: 'center',
    marginTop: space.md,
    maxWidth: 320,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xl,
    gap: space.xs,
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressLabel: {
    marginTop: space.xs,
    textAlign: 'center',
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 12,
      },
      default: {},
    }),
  },
  hydrationLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space['4xl'],
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.md,
    flexGrow: 1,
  },
  stepHeading: {
    marginBottom: space.md,
    letterSpacing: 0.6,
  },
  group: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

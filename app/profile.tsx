import * as Linking from 'expo-linking';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Bus,
  BusFront,
  ChevronDown,
  ChevronRight,
  Clock,
  HelpCircle,
  Info,
  MapPin,
  Navigation,
  Pin,
  Star,
  ThumbsDown,
  ThumbsUp,
  Ticket,
  User,
  X,
} from 'lucide-react-native';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { ScreenTopAdBanner } from '@/features/ads/components/ScreenTopAdBanner';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { resolveEnabledModules } from '@/config/island';
import { useBootstrap } from '@/features/transit/hooks/useTransitQueries';
import { BUS_COMPANIES, type BusCompany } from '@/lib/bus-companies';
import { formatLocalTime } from '@/lib/format-time';
import { useProfileStore, type TripVoteEntry } from '@/lib/profile-store';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type InfoSheetKey = 'disclaimer' | 'companies' | 'charter' | 'tickets' | 'monetization' | null;

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const router = useRouter();
  const { data: bootstrap } = useBootstrap();
  const showMinibus = resolveEnabledModules(bootstrap?.island?.enabledModules).includes('minibus');
  const screenOptions = useAppStackScreenOptions();
  const favoriteRoutes = useProfileStore((s) => s.favoriteRoutes);
  const favoriteStops = useProfileStore((s) => s.favoriteStops);
  const recentSearches = useProfileStore((s) => s.recentSearches);
  const votes = useProfileStore((s) => s.votes);
  const tracking = useProfileStore((s) => s.tracking);
  const clearRecentSearches = useProfileStore((s) => s.clearRecentSearches);
  const clearVotes = useProfileStore((s) => s.clearVotes);
  const removeFavoriteRoute = useProfileStore((s) => s.removeFavoriteRoute);
  const removeFavoriteStop = useProfileStore((s) => s.removeFavoriteStop);
  const stopTracking = useProfileStore((s) => s.stopTracking);
  const unpinRoute = useProfileStore((s) => s.unpinRoute);
  const [infoSheet, setInfoSheet] = useState<InfoSheetKey>(null);
  const [selectedCompany, setSelectedCompany] = useState<BusCompany | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...screenOptions,
      headerShown: true,
    });
  }, [navigation, screenOptions, t]);

  const voteEntries = useMemo(
    () =>
      Object.entries(votes).sort(
        ([, a], [, b]) => new Date(b.votedAt).getTime() - new Date(a.votedAt).getTime(),
      ),
    [votes],
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTopAdBanner embedded />
        <Section title={t('profileNameTitle')} icon={User}>
          <Card>
            <ProfileNameInput />
          </Card>
        </Section>

        <Section title={t('favoriteSearches')} icon={Star}>
          {favoriteRoutes.length === 0 ? (
            <EmptyState label={t('noFavoriteSearches')} />
          ) : (
            <GroupList>
              {favoriteRoutes.map((r, i) => (
                <ListRow
                  key={`${r.origin}-${r.destination}-${r.createdAt}`}
                  title={`${r.origin} → ${r.destination}`}
                  divider={i < favoriteRoutes.length - 1}
                  trailing={
                    <RemoveButton
                      label={t('removeFavorites')}
                      onPress={() => removeFavoriteRoute(r.origin, r.destination)}
                    />
                  }
                />
              ))}
            </GroupList>
          )}
        </Section>

        <Section title={t('transitFavoriteStops')} icon={MapPin}>
          {favoriteStops.length === 0 ? (
            <EmptyState label={t('transitNoFavoriteStops')} />
          ) : (
            <GroupList>
              {favoriteStops.map((s, i) => (
                <ListRow
                  key={s.id}
                  title={s.name}
                  divider={i < favoriteStops.length - 1}
                  trailing={
                    <RemoveButton label={t('removeFavorites')} onPress={() => removeFavoriteStop(s.id)} />
                  }
                />
              ))}
            </GroupList>
          )}
        </Section>

        <Section
          title={t('transitRecentSearches')}
          icon={Clock}
          collapsible={recentSearches.length > 0}
          defaultOpen={false}
          count={recentSearches.length}
        >
          {recentSearches.length === 0 ? (
            <EmptyState label={t('transitNoRecents')} />
          ) : (
            <>
              <GroupList>
                {recentSearches.map((r, i) => (
                  <ListRow
                    key={r.at}
                    title={`${r.origin} → ${r.destination}`}
                    subtitle={`${t(r.day as 'weekday' | 'saturday' | 'sunday')} · ${r.time}`}
                    divider={i < recentSearches.length - 1}
                  />
                ))}
              </GroupList>
              <Button label={t('transitClearRecents')} variant="outline" onPress={clearRecentSearches} />
            </>
          )}
        </Section>

        <Section title={t('transitActiveTracking')} icon={Navigation}>
          {tracking.active.length === 0 ? (
            <EmptyState label={t('transitNoActiveTracking')} />
          ) : (
            <GroupList>
              {tracking.active.map((tr, i) => (
                <ListRow
                  key={tr.id}
                  title={tr.routeNumber}
                  subtitle={`${tr.origin} → ${tr.destination}`}
                  divider={i < tracking.active.length - 1}
                  trailing={
                    <RemoveButton label={t('transitStopTrack')} onPress={() => stopTracking(tr.id)} />
                  }
                />
              ))}
            </GroupList>
          )}
        </Section>

        <Section title={t('transitPinnedRoutes')} icon={Pin}>
          {tracking.pinned.length === 0 ? (
            <EmptyState label={t('transitNoPinned')} />
          ) : (
            <GroupList>
              {tracking.pinned.map((p, i) => (
                <ListRow
                  key={p.id}
                  title={p.routeNumber}
                  subtitle={`${p.origin} → ${p.destination}`}
                  divider={i < tracking.pinned.length - 1}
                  trailing={
                    <RemoveButton label={t('transitUnpinRoute')} onPress={() => unpinRoute(p.id)} />
                  }
                />
              ))}
            </GroupList>
          )}
        </Section>

        <Section
          title={t('transitMyVotes')}
          icon={ThumbsUp}
          collapsible={voteEntries.length > 0}
          defaultOpen={false}
          count={voteEntries.length}
        >
          {voteEntries.length === 0 ? (
            <EmptyState label={t('transitNoVotes')} />
          ) : (
            <>
              <GroupList>
                {voteEntries.map(([id, entry], i) => {
                  const { title, subtitle } = voteRowLabels(id, entry, i18n.language);
                  const VoteIcon = entry.vote === 'like' ? ThumbsUp : ThumbsDown;
                  const voteColor = entry.vote === 'like' ? theme.success : theme.danger;
                  return (
                    <ListRow
                      key={id}
                      title={title}
                      subtitle={subtitle}
                      divider={i < voteEntries.length - 1}
                      leading={<VoteIcon size={iconSize.md} color={voteColor} strokeWidth={2} />}
                    />
                  );
                })}
              </GroupList>
              <Button label={t('transitClearVotes')} variant="outline" onPress={clearVotes} />
            </>
          )}
        </Section>

        <Section title={t('transitInfoTitle')} icon={Info}>
          <GroupList>
            {showMinibus ? (
              <ListRow
                icon={BusFront}
                title={t('minibusProfileRow')}
                onPress={() => router.push('/minibus')}
              />
            ) : null}
            <ListRow
              icon={Info}
              title={t('infoModalTitle')}
              onPress={() => setInfoSheet('disclaimer')}
            />
            <ListRow
              icon={Bus}
              title={t('contactBusCompanies')}
              onPress={() => setInfoSheet('companies')}
            />
            <ListRow
              icon={BusFront}
              title={t('aluguerTitle')}
              onPress={() => setInfoSheet('charter')}
            />
            <ListRow
              icon={Ticket}
              title={t('priceApp')}
              onPress={() => setInfoSheet('tickets')}
            />
            <ListRow
              icon={HelpCircle}
              title={t('appMonetizationButton')}
              onPress={() => setInfoSheet('monetization')}
              divider={false}
            />
          </GroupList>
          <ProfileFooter />
        </Section>
      </ScrollView>

      <Sheet visible={infoSheet === 'disclaimer'} onClose={() => setInfoSheet(null)} title={t('infoModalTitle')}>
        <SheetBody>
          <Text style={[typography.body, { color: theme.text }]}>{t('infoModalDescription')}</Text>
          <Text style={[typography.body, { color: theme.muted, marginTop: space.md, fontStyle: 'italic' }]}>
            {t('infoModalEnd')}
          </Text>
        </SheetBody>
      </Sheet>

      <Sheet
        visible={infoSheet === 'companies'}
        onClose={() => {
          setInfoSheet(null);
          setSelectedCompany(null);
        }}
        title={selectedCompany?.name ?? t('contactBusCompaniesTitle')}
      >
        <SheetBody>
          {selectedCompany ? (
            <View style={{ gap: space.sm }}>
              <Button
                label={t('marketplaceContactCall')}
                variant="outline"
                fullWidth
                onPress={() => void Linking.openURL(`tel:${selectedCompany.phone}`)}
              />
              <Button
                label={t('marketplaceContactEmail')}
                variant="outline"
                fullWidth
                onPress={() => void Linking.openURL(`mailto:${selectedCompany.email}`)}
              />
              <Button
                label={t('marketplaceFormWebsite')}
                variant="outline"
                fullWidth
                onPress={() => void Linking.openURL(selectedCompany.url)}
              />
              <Pressable
                onPress={() => setSelectedCompany(null)}
                style={{ alignSelf: 'center', paddingVertical: space.sm }}
                accessibilityRole="button"
                accessibilityLabel={t('contactBusCompanies')}
              >
                <Text style={[typography.label, { color: theme.primary }]}>
                  ← {t('contactBusCompanies')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[typography.body, { color: theme.text, marginBottom: space.md }]}>
                {t('contactBusCompaniesDescription')}
              </Text>
              <Card style={styles.group}>
                {BUS_COMPANIES.map((company, index) => (
                  <ListRow
                    key={company.name}
                    title={company.name}
                    divider={index < BUS_COMPANIES.length - 1}
                    onPress={() => setSelectedCompany(company)}
                  />
                ))}
              </Card>
            </>
          )}
        </SheetBody>
      </Sheet>

      <Sheet visible={infoSheet === 'charter'} onClose={() => setInfoSheet(null)} title={t('aluguerTitle')}>
        <SheetBody>
          <Text style={[typography.body, { color: theme.text }]}>{t('aluguerDescription')}</Text>
        </SheetBody>
      </Sheet>

      <Sheet visible={infoSheet === 'tickets'} onClose={() => setInfoSheet(null)} title={t('priceApp')}>
        <SheetBody>
          <Text style={[typography.body, { color: theme.text }]}>{t('priceAppDescription')}</Text>
          <Text style={[typography.body, { color: theme.muted, marginTop: space.md, fontStyle: 'italic' }]}>
            {t('priceAppEnd')}
          </Text>
        </SheetBody>
      </Sheet>

      <Sheet
        visible={infoSheet === 'monetization'}
        onClose={() => setInfoSheet(null)}
        title={t('aboutAdsTitle')}
      >
        <SheetBody>
          <Text style={[typography.body, { color: theme.text }]}>{t('aboutAdsParagraph1')}</Text>
          <View style={{ marginTop: space.md, gap: space.sm }}>
            <Text style={[typography.body, { color: theme.text }]}>• {t('aboutAdsList1')}</Text>
            <Text style={[typography.body, { color: theme.text }]}>• {t('aboutAdsList2')}</Text>
            <Text style={[typography.body, { color: theme.text }]}>• {t('aboutAdsList3')}</Text>
          </View>
          <Text style={[typography.body, { color: theme.muted, marginTop: space.md, fontStyle: 'italic' }]}>
            {t('supportThankYou')}
          </Text>
        </SheetBody>
      </Sheet>
    </Screen>
  );
}

/** Local draft only — persisted when the user finishes editing (not on blur from header updates). */
function ProfileNameInput() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const displayName = useProfileStore((s) => s.displayName);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);
  const [draft, setDraft] = useState(() => displayName ?? '');
  const isEditingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isEditingRef.current) {
        setDraft(displayName ?? '');
      }
    }, [displayName]),
  );

  const commit = () => {
    isEditingRef.current = false;
    setDisplayName(draft);
  };

  return (
    <TextInput
      value={draft}
      onChangeText={(text) => {
        isEditingRef.current = true;
        setDraft(text);
      }}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onSubmitEditing={commit}
      onEndEditing={commit}
      placeholder={t('profileNamePlaceholder')}
      placeholderTextColor={theme.muted}
      style={[typography.body, { color: theme.text, paddingVertical: space.xs }]}
      maxLength={40}
      returnKeyType="done"
      autoCapitalize="words"
    />
  );
}

function voteRowLabels(tripId: string, entry: TripVoteEntry, locale: string) {
  const time = formatLocalTime(entry.votedAt, locale);
  const pair =
    entry.origin && entry.destination ? `${entry.origin} → ${entry.destination}` : '';

  if (entry.routeNumber) {
    return { title: entry.routeNumber, subtitle: pair ? `${pair} · ${time}` : time || undefined };
  }
  if (pair) {
    return { title: pair, subtitle: time || undefined };
  }
  return { title: `#${tripId}`, subtitle: time || undefined };
}

function Section({
  title,
  icon: Icon,
  children,
  collapsible,
  defaultOpen = true,
  count,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  count?: number;
}) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(defaultOpen);
  const canToggle = Boolean(collapsible && (count ?? 0) > 0);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={canToggle ? () => setOpen((v) => !v) : undefined}
        disabled={!canToggle}
        style={styles.sectionHeader}
        accessibilityRole={canToggle ? 'button' : undefined}
        accessibilityState={canToggle ? { expanded: open } : undefined}
        accessibilityLabel={title}
      >
        {Icon ? <Icon size={iconSize.md} color={theme.muted} strokeWidth={2} /> : null}
        <Text style={[typography.overline, { color: theme.muted, flex: 1 }]}>{title}</Text>
        {(count ?? 0) > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[typography.caption, { color: theme.muted, fontWeight: '700' }]}>{count}</Text>
          </View>
        ) : null}
        {canToggle ? <Chevron size={iconSize.md} color={theme.muted} /> : null}
      </Pressable>
      {(!collapsible || open) && children}
    </View>
  );
}

function ProfileFooter() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <View style={styles.footer}>
      <Text style={[typography.caption, styles.footerText, { color: theme.muted }]}>
        {t('infoDevelopedBy')}
        <Text
          style={{ color: theme.primary, fontWeight: '600' }}
          onPress={() => void Linking.openURL('https://www.sousadev.com')}
        >
          Sousa Dev
        </Text>
      </Text>
      <Pressable onPress={() => void Linking.openURL('mailto:info@saomiguelbus.com')}>
        <Text style={[typography.caption, styles.footerLink, { color: theme.primary }]}>info@saomiguelbus.com</Text>
      </Pressable>
      <Text style={[typography.caption, styles.footerText, { color: theme.muted, marginTop: space.sm }]}>
        © {year} Sousa Dev
      </Text>
    </View>
  );
}

/** Wraps `ListRow`s in a single rounded, clipped card for a grouped-list look. */
function GroupList({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Card style={[styles.group, style]}>{children}</Card>;
}

function EmptyState({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.empty}>
      <Text style={[typography.body, { color: theme.muted, textAlign: 'center' }]}>{label}</Text>
    </Card>
  );
}

function RemoveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={space.sm}
      style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.5 : 1 }]}
    >
      <X size={iconSize.md} color={theme.muted} strokeWidth={2} />
    </Pressable>
  );
}

function SheetBody({ children }: { children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: space.lg }}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'], gap: space['2xl'] },
  section: { gap: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  group: { padding: 0, borderRadius: radius.lg, overflow: 'hidden' },
  empty: { paddingVertical: space.xl, alignItems: 'center' },
  removeBtn: { padding: space.xs, borderRadius: radius.full },
  countBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  footer: {
    marginTop: space['2xl'],
    alignItems: 'center',
    gap: space.xs,
    paddingBottom: space.md,
  },
  footerText: { textAlign: 'center' },
  footerLink: { textAlign: 'center', fontWeight: '600' },
});

import * as Linking from 'expo-linking';
import { useNavigation } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { useProfileStore } from '@/lib/profile-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export default function ProfileScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const screenOptions = useAppStackScreenOptions();
  const displayName = useProfileStore((s) => s.displayName);
  const setDisplayName = useProfileStore((s) => s.setDisplayName);
  const [nameInput, setNameInput] = useState(displayName ?? '');
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

  useLayoutEffect(() => {
    navigation.setOptions({
      ...screenOptions,
      title: t('transitProfileTitle'),
      headerShown: true,
    });
  }, [navigation, screenOptions, t]);

  const voteEntries = Object.entries(votes);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={t('profileNameTitle')}>
          <Card>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              onBlur={() => setDisplayName(nameInput)}
              onEndEditing={() => setDisplayName(nameInput)}
              placeholder={t('profileNamePlaceholder')}
              placeholderTextColor={theme.muted}
              style={[typography.body, { color: theme.text, paddingVertical: space.xs }]}
              maxLength={40}
              returnKeyType="done"
              autoCapitalize="words"
            />
          </Card>
        </Section>

        <Section title={t('favoriteSearches')}>
          {favoriteRoutes.length === 0 ? (
            <Text style={[typography.body, { color: theme.muted }]}>{t('noFavoriteSearches')}</Text>
          ) : (
            favoriteRoutes.map((r) => (
              <ListRow
                key={`${r.origin}-${r.destination}-${r.createdAt}`}
                title={`${r.origin} → ${r.destination}`}
                subtitle={t('removeFavorites')}
                onPress={() => removeFavoriteRoute(r.origin, r.destination)}
              />
            ))
          )}
        </Section>

        <Section title={t('transitFavoriteStops')}>
          {favoriteStops.length === 0 ? (
            <Text style={[typography.body, { color: theme.muted }]}>{t('transitNoFavoriteStops')}</Text>
          ) : (
            favoriteStops.map((s) => (
              <ListRow
                key={s.id}
                title={s.name}
                subtitle={t('removeFavorites')}
                onPress={() => removeFavoriteStop(s.id)}
              />
            ))
          )}
        </Section>

        <Section title={t('transitRecentSearches')}>
          {recentSearches.length === 0 ? (
            <Text style={[typography.body, { color: theme.muted }]}>{t('transitNoRecents')}</Text>
          ) : (
            recentSearches.map((r) => (
              <ListRow
                key={r.at}
                title={`${r.origin} → ${r.destination}`}
                subtitle={`${t(r.day as 'weekday' | 'saturday' | 'sunday')} · ${r.time}`}
              />
            ))
          )}
          {recentSearches.length > 0 ? (
            <Button label={t('transitClearRecents')} variant="outline" onPress={clearRecentSearches} />
          ) : null}
        </Section>

        <Section title={t('transitActiveTracking')}>
          {tracking.active.length === 0 ? (
            <Text style={[typography.body, { color: theme.muted }]}>{t('transitNoActiveTracking')}</Text>
          ) : (
            tracking.active.map((tr) => (
              <ListRow
                key={tr.id}
                title={tr.routeNumber}
                subtitle={`${tr.origin} → ${tr.destination} · ${t('transitStopTrack')}`}
                onPress={() => stopTracking(tr.id)}
              />
            ))
          )}
        </Section>

        <Section title={t('transitPinnedRoutes')}>
          {tracking.pinned.length === 0 ? (
            <Text style={[typography.body, { color: theme.muted }]}>{t('transitNoPinned')}</Text>
          ) : (
            tracking.pinned.map((p) => (
              <ListRow
                key={p.id}
                title={p.routeNumber}
                subtitle={`${p.origin} → ${p.destination} · ${t('transitUnpinRoute')}`}
                onPress={() => unpinRoute(p.id)}
              />
            ))
          )}
        </Section>

        <Section title={t('transitMyVotes')}>
          {voteEntries.length === 0 ? (
            <Text style={[typography.body, { color: theme.muted }]}>{t('transitNoVotes')}</Text>
          ) : (
            voteEntries.map(([id, vote]) => (
              <ListRow key={id} title={`Trip #${id}`} subtitle={vote} />
            ))
          )}
          {voteEntries.length > 0 ? (
            <Button label={t('transitClearVotes')} variant="outline" onPress={clearVotes} />
          ) : null}
        </Section>

        <Section title={t('transitInfoTitle')}>
          <Card>
            <Text style={[typography.headline, { color: theme.text }]}>{t('transitInfoCompanies')}</Text>
            <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>
              {t('transitInfoCompaniesBody')}
            </Text>
            <Button
              label={t('transitInfoContact')}
              variant="ghost"
              onPress={() => void Linking.openURL('mailto:info@saomiguelbus.com')}
              style={{ marginTop: space.sm }}
            />
          </Card>
          <Card style={{ marginTop: space.md }}>
            <Text style={[typography.headline, { color: theme.text }]}>{t('transitInfoCharter')}</Text>
            <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>
              {t('transitInfoCharterBody')}
            </Text>
          </Card>
          <Card style={{ marginTop: space.md }}>
            <Text style={[typography.headline, { color: theme.text }]}>{t('transitInfoDisclaimer')}</Text>
            <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]}>
              {t('transitInfoDisclaimerBody')}
            </Text>
          </Card>
          {Platform.OS !== 'web' ? (
            <Button
              label={t('transitInfoDeveloper')}
              variant="outline"
              onPress={() => void Linking.openURL('https://saomiguelbus.com')}
              fullWidth
              style={{ marginTop: space.md }}
            />
          ) : null}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[typography.headline, { color: theme.text, marginBottom: space.sm }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'], gap: space.lg },
  section: { gap: space.sm },
});

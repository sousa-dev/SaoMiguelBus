import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTripVote } from '@/features/transit/hooks/useTransitQueries';
import { useAppTheme } from '@/lib/theme';
import type { TransitSearchResult } from '@/lib/types';

type Props = {
  results: TransitSearchResult[];
  onSelect: (trip: TransitSearchResult) => void;
  selectedId?: number;
};

export function RouteResults({ results, onSelect, selectedId }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const vote = useTripVote();
  const router = useRouter();

  if (results.length === 0) {
    return (
      <Text style={{ color: theme.muted, marginTop: 16 }}>
        {t('noRoutesMessage', { origin: '—', destination: '—' })}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {results.map((trip) => (
        <Pressable
          key={trip.id}
          onPress={() => {
            onSelect(trip);
            router.push({
              pathname: '/(tabs)/transit/[tripId]',
              params: { tripId: String(trip.id) },
            });
          }}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: selectedId === trip.id ? theme.primary : theme.border,
            },
          ]}
        >
          <Text style={[styles.route, { color: theme.primary }]}>{trip.route}</Text>
          <Text style={{ color: theme.text }}>
            {trip.start} → {trip.end}
          </Text>
          <Text style={{ color: theme.muted, marginTop: 4 }}>
            👍 {trip.likesPercent}% · 👎 {trip.dislikesPercent}%
          </Text>
          <View style={styles.voteRow}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                vote.mutate({ tripId: trip.id, vote: 'like' });
              }}
              style={[styles.voteBtn, { borderColor: theme.primary }]}
            >
              <Text style={{ color: theme.primary }}>👍</Text>
            </Pressable>
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                vote.mutate({ tripId: trip.id, vote: 'dislike' });
              }}
              style={[styles.voteBtn, { borderColor: theme.secondary }]}
            >
              <Text style={{ color: theme.secondary }}>👎</Text>
            </Pressable>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  route: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  voteRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  voteBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
});

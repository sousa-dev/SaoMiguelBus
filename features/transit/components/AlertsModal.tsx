import * as Linking from 'expo-linking';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { resolveInfo } from '@/lib/infos';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type Props = {
  visible: boolean;
  infos: Record<string, unknown>[];
  onClose: () => void;
};

const TRUNCATE = 250;

export function AlertsModal({ visible, infos, onClose }: Props) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.shell, { backgroundColor: theme.background }]}>
        <Text style={[typography.title, { color: theme.text, marginBottom: space.lg }]}>
          {t('transitAlertsTitle')}
        </Text>
        <ScrollView contentContainerStyle={styles.scroll}>
          {infos.map((info, index) => {
            const resolved = resolveInfo(info, i18n.language);
            const isExpanded = expanded[index];
            const long = resolved.message.length > TRUNCATE;
            const shown =
              long && !isExpanded ? `${resolved.message.slice(0, TRUNCATE)}…` : resolved.message;
            return (
              <Card key={`${resolved.title}-${index}`} style={styles.card}>
                <Text style={[typography.headline, { color: theme.text }]}>{resolved.title}</Text>
                <Text style={[typography.body, { color: theme.text, marginTop: space.sm }]}>{shown}</Text>
                {long ? (
                  <Pressable onPress={() => setExpanded((e) => ({ ...e, [index]: !e[index] }))}>
                    <Text style={[typography.label, { color: theme.primary, marginTop: space.xs }]}>
                      {isExpanded ? t('showLess') : t('showMore')}
                    </Text>
                  </Pressable>
                ) : null}
                {resolved.source ? (
                  <Pressable
                    onPress={() => void Linking.openURL(resolved.source!)}
                    style={{ marginTop: space.sm, alignSelf: 'flex-end' }}
                  >
                    <Text style={[typography.caption, { color: theme.muted }]}>
                      {resolved.company ?? t('transitAlertSource')}
                    </Text>
                  </Pressable>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
        <Button label={t('settingsBack')} onPress={onClose} fullWidth />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, padding: space.lg, paddingTop: space['2xl'] },
  scroll: { gap: space.md, paddingBottom: space.lg },
  card: { marginBottom: 0 },
});

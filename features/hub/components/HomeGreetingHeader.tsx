import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { hubGreetingEmoji, hubGreetingKey } from '@/lib/hub-greeting';
import { useProfileStore } from '@/lib/profile-store';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

/** Time-of-day greeting (Azores TZ) with the user's name when set. */
export function HomeGreetingHeader() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const displayName = useProfileStore((s) => s.displayName);
  const emoji = hubGreetingEmoji();
  const greeting = t(hubGreetingKey());
  const text = displayName ? t('hubGreetingNamed', { greeting, name: displayName }) : greeting;

  return (
    <View style={styles.wrap}>
      <Text style={[typography.title, styles.line, { color: theme.onSurface }]}>
        <Text style={styles.emoji}>{emoji} </Text>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  line: {
    textAlign: 'center',
  },
  emoji: {
    fontSize: 28,
  },
});

import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { hubGreetingKey } from '@/lib/hub-greeting';
import { space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

type HubHeroProps = {
  islandName: string;
  logoUri?: string | null;
};

export function HubHero({ islandName, logoUri }: HubHeroProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const greeting = t(hubGreetingKey());

  return (
    <View style={styles.wrap}>
      {logoUri ? (
        <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : null}
      <Text style={[typography.caption, { color: theme.onSurfaceMuted }]}>{greeting}</Text>
      <Text style={[typography.display, { color: theme.onSurface, marginTop: space.xs }]}>{islandName}</Text>
      <Text style={[typography.body, { color: theme.onSurfaceMuted, marginTop: space.sm }]}>{t('hubSubtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: space.md,
  },
});

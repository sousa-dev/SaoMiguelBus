import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { NewsCard } from '@/features/news/components/NewsCard';
import type { HomeData } from '@/features/hub/hooks/useHomeData';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';

export function HomeNewsList({ data }: { data: HomeData['news'] }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const articles = data.articles;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.header}
        onPress={() => router.push('/news')}
        accessibilityRole="button"
        accessibilityLabel={t('homeNewsTitle')}
      >
        <Text style={[typography.headline, { color: theme.onSurface }]}>{t('homeNewsTitle')}</Text>
        <View style={styles.seeAll}>
          <Text style={[typography.caption, { color: theme.primary }]}>{t('homeSeeAll')}</Text>
          <ChevronRight size={iconSize.sm} color={theme.primary} />
        </View>
      </Pressable>
      {articles.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: theme.onSurfaceMuted }]}>{t('homeNewsEmpty')}</Text>
        </Card>
      ) : (
        articles.map((a) => (
          <NewsCard key={a.id} article={a} onPress={() => router.push(`/news/${a.id}`)} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});

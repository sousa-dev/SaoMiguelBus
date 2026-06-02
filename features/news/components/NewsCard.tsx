import { Clock, Newspaper } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { iconSize, radius, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { NewsArticle } from '@/lib/types';

export function NewsCard({
  article,
  onPress,
  featured = false,
}: {
  article: NewsArticle;
  onPress: () => void;
  featured?: boolean;
}) {
  const theme = useAppTheme();
  const date = new Date(article.publishedAt).toLocaleDateString();
  return (
    <Card onPress={onPress} elevated style={[styles.card, featured && styles.featured]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          {article.category ? <Badge label={article.category} tone="primary" /> : null}
          <Text
            style={[featured ? typography.title : typography.headline, { color: theme.text, marginTop: space.sm }]}
            numberOfLines={featured ? 3 : 2}
          >
            {article.title}
          </Text>
          {article.summary ? (
            <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]} numberOfLines={featured ? 4 : 2}>
              {article.summary}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <Newspaper size={iconSize.sm} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted }]}>{article.source.name}</Text>
            <Clock size={iconSize.sm} color={theme.muted} />
            <Text style={[typography.caption, { color: theme.muted }]}>{date}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: space.md },
  featured: { padding: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  textCol: { flex: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, marginTop: space.md },
});

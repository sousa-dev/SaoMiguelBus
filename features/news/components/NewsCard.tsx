import { Clock, Newspaper } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { iconSize, space, typography } from '@/lib/tokens';
import { useAppTheme } from '@/lib/theme';
import type { NewsArticle } from '@/lib/types';

export function NewsCard({
  article,
  onPress,
  showSummary = false,
}: {
  article: NewsArticle;
  onPress: () => void;
  showSummary?: boolean;
}) {
  const theme = useAppTheme();
  const date = new Date(article.publishedAt).toLocaleDateString();
  return (
    <Card onPress={onPress} elevated style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[typography.headline, { color: theme.text }]}>{article.title}</Text>
          {showSummary && article.summary ? (
            <Text style={[typography.body, { color: theme.muted, marginTop: space.sm }]} numberOfLines={2}>
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
  row: { flexDirection: 'row', gap: space.md },
  textCol: { flex: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, marginTop: space.md },
});

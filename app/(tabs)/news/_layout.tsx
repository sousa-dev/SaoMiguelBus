import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/lib/theme';

export default function NewsLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('navBarNewsLabel') }} />
      <Stack.Screen name="[articleId]" options={{ title: t('newsArticleTitle') }} />
    </Stack>
  );
}

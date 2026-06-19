import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { ModuleStackScreenLayout } from '@/features/ads/components/ModuleStackScreenLayout';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function NewsLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions} screenLayout={ModuleStackScreenLayout}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarNewsLabel'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => <SettingsHeaderButton />,
        }}
      />
      <Stack.Screen name="[articleId]" options={{ title: t('newsArticleTitle') }} />
    </Stack>
  );
}

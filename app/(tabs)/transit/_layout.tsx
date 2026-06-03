import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProfileHeaderButton } from '@/components/ProfileHeaderButton';
import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { StackBackButton } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TransitLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('navBarSearchLabel'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ProfileHeaderButton />
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="directions"
        options={{
          title: t('directionsButton'),
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)/transit" />,
        }}
      />
      <Stack.Screen
        name="[tripId]"
        options={{
          title: t('routeDetails'),
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)/transit" />,
        }}
      />
    </Stack>
  );
}

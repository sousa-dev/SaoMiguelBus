import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { space } from '@/lib/tokens';

import { PremiumHeaderButton } from '@/components/PremiumHeaderButton';
import { ProfileHeaderButton } from '@/components/ProfileHeaderButton';
import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { stackBackScreenOptions } from '@/components/StackBackButton';
import { useAppStackScreenOptions } from '@/lib/navigation';

export default function TransitLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: '',
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <ProfileHeaderButton />
              <SettingsHeaderButton />
              <PremiumHeaderButton />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="directions"
        options={{
          title: t('directionsButton'),
          ...stackBackScreenOptions('/(tabs)/transit'),
        }}
      />
      <Stack.Screen
        name="[tripId]"
        options={{
          title: t('routeDetails'),
          ...stackBackScreenOptions('/(tabs)/transit'),
        }}
      />
    </Stack>
  );
}

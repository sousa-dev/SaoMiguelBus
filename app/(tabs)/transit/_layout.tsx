import { Stack } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';
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
  const { width: windowWidth } = useWindowDimensions();
  const screenOptions = useAppStackScreenOptions();
  const headerRightMaxWidth = Math.min(windowWidth * 0.62, 248);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: '',
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexShrink: 1,
                maxWidth: headerRightMaxWidth,
              }}
            >
              <ProfileHeaderButton compact />
              <SettingsHeaderButton compact />
              <PremiumHeaderButton />
            </View>
          ),
          headerRightContainerStyle: { paddingRight: space.xs, maxWidth: headerRightMaxWidth },
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

import { Stack } from 'expo-router';
import { Check, Pencil } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { SidebarHeaderButton } from '@/components/SidebarHeaderButton';
import { IconButton } from '@/components/ui/IconButton';
import { useHubStore } from '@/lib/hub-store';
import { useAppStackScreenOptions } from '@/lib/navigation';
import { useAppTheme } from '@/lib/theme';

function HubEditHeaderButton() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const editMode = useHubStore((s) => s.editMode);
  const setEditMode = useHubStore((s) => s.setEditMode);

  return (
    <IconButton
      icon={editMode ? Check : Pencil}
      accessibilityLabel={editMode ? t('hubDone') : t('hubEdit')}
      color={theme.onSurface}
      onPress={() => setEditMode(!editMode)}
    />
  );
}

export default function HubLayout() {
  const { t } = useTranslation();
  const screenOptions = useAppStackScreenOptions();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: t('hubTitle'),
          headerLeft: () => <SidebarHeaderButton />,
          headerRight: () => (
            <View style={styles.headerRight}>
              <HubEditHeaderButton />
              <SettingsHeaderButton />
            </View>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center' },
});

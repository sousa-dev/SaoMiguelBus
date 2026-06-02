import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SettingsHeaderButton } from '@/components/SettingsHeaderButton';
import { useHubStore } from '@/lib/hub-store';
import { useAppStackScreenOptions } from '@/lib/navigation';

function HubEditHeaderButton() {
  const { t } = useTranslation();
  const editMode = useHubStore((s) => s.editMode);
  const setEditMode = useHubStore((s) => s.setEditMode);

  return (
    <Pressable
      onPress={() => setEditMode(!editMode)}
      style={styles.editBtn}
      accessibilityLabel={editMode ? t('hubDone') : t('hubEdit')}
      hitSlop={8}
    >
      <Text style={styles.editText}>{editMode ? t('hubDone') : t('hubEdit')}</Text>
    </Pressable>
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
  editBtn: { marginRight: 8, paddingVertical: 6, paddingHorizontal: 4 },
  editText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

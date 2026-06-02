import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

/** Gear icon for stack headerRight — opens settings modal. */
export function SettingsHeaderButton() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/settings')}
      style={[styles.btn, { borderColor: 'rgba(255,255,255,0.35)' }]}
      accessibilityLabel={t('settingsTitle')}
      hitSlop={8}
    >
      <Settings color="#fff" size={20} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});

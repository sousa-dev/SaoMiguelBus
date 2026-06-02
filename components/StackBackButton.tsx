import { useNavigation, useRouter, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

/**
 * Stack header back control. After a Tabs remount (bootstrap module change), a
 * pushed screen can become the stack root — `canGoBack()` is false and the
 * default back affordance disappears. Falls back to the tab index route.
 */
export function StackBackButton({ fallbackHref }: { fallbackHref: Href }) {
  const router = useRouter();
  const navigation = useNavigation();

  const onPress = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.hit}
      accessibilityRole="button"
      accessibilityLabel="Back"
    >
      <Text style={styles.glyph}>{Platform.OS === 'ios' ? '‹' : '←'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    marginLeft: Platform.OS === 'ios' ? -4 : 4,
    paddingRight: 8,
    justifyContent: 'center',
  },
  glyph: {
    color: '#fff',
    fontSize: Platform.OS === 'ios' ? 36 : 24,
    lineHeight: Platform.OS === 'ios' ? 38 : 28,
    fontWeight: '600',
  },
});

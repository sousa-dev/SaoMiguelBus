import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useNavigation, type Href } from 'expo-router';

import { ViewAllListHeaderButton } from '@/components/ViewAllListHeaderButton';
import { space } from '@/lib/tokens';

function isHubSuggestionEntry(fromHub: string | string[] | undefined): boolean {
  if (fromHub == null) {
    return false;
  }
  const value = typeof fromHub === 'string' ? fromHub : fromHub[0];
  return value === '1' || value === 'true';
}

/** Header "browse all" action when detail was opened from a hub home suggestion tile. */
export function useHubSuggestionListHeader(listHref: Href) {
  const navigation = useNavigation();
  const { fromHub } = useLocalSearchParams<{ fromHub?: string | string[] }>();
  const show = isHubSuggestionEntry(fromHub);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: show ? () => <ViewAllListHeaderButton href={listHref} /> : undefined,
      headerRightContainerStyle: show
        ? {
            justifyContent: 'center',
            alignItems: 'center',
            paddingRight: Platform.OS === 'ios' ? space.xs : space.sm,
          }
        : undefined,
    });
  }, [navigation, show, listHref]);
}

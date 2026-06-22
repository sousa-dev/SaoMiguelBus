import { MapPinOff } from 'lucide-react-native';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/ui/StateView';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: true }} />
      <Screen>
        <EmptyState
          icon={MapPinOff}
          title={t('notFoundTitle')}
          description={t('notFoundDescription')}
          actionLabel={t('notFoundCta')}
          onAction={() => router.replace('/(tabs)/hub')}
        />
      </Screen>
    </>
  );
}

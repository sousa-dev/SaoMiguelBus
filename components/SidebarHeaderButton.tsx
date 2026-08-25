import { Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { IconButton } from '@/components/ui/IconButton';
import { useSidebarStore } from '@/lib/sidebar-store';
import { useAppTheme } from '@/lib/theme';

/** Opens the module sidebar from a stack header (tab roots). */
export function SidebarHeaderButton() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const toggleSidebar = useSidebarStore((s) => s.toggleSidebar);

  return (
    <IconButton
      icon={Menu}
      variant="ghost"
      color={theme.onSurface}
      accessibilityLabel={t('sidebarOpen')}
      onPress={toggleSidebar}
    />
  );
}

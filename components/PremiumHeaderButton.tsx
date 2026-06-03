import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { PremiumLaunchModal } from '@/features/transit/components/PremiumLaunchModal';

export function PremiumHeaderButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        label={t('premiumHeaderButton')}
        variant="outline"
        size="sm"
        accessibilityLabel={t('premiumHeaderButton')}
        onPress={() => setOpen(true)}
      />
      <PremiumLaunchModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

import { isHopOnHopOffVisible } from '@/features/hop-on-hop-off/lib/visibility';
import { usePersonalizationStore } from '@/lib/personalization-store';

export function useHopOnHopOffPromo() {
  const userType = usePersonalizationStore((s) => s.userType);
  const visible = isHopOnHopOffVisible(userType);

  return { visible };
}

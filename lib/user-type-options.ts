import type { LucideIcon } from 'lucide-react-native';
import { Briefcase, Compass, Home } from 'lucide-react-native';

import type { UserType } from '@/lib/types';

export const USER_TYPE_OPTIONS: { value: UserType; labelKey: string; Icon: LucideIcon }[] = [
  { value: 'tourist', labelKey: 'personalizeUserTypeTourist', Icon: Compass },
  { value: 'resident', labelKey: 'personalizeUserTypeResident', Icon: Home },
  { value: 'newcomer', labelKey: 'personalizeUserTypeNewcomer', Icon: Briefcase },
];

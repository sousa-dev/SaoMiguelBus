import type { UserType } from '@/lib/types';

export function isHopOnHopOffVisible(userType: UserType | null): boolean {
  return userType === 'tourist' || userType === null;
}

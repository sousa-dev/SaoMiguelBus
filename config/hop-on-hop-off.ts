/** Default GetYourGuide affiliate link for São Miguel hop-on-hop-off bus. */
export const HOP_ON_OFF_DEFAULT_URL =
  'https://www.getyourguide.com/ponta-delgada-sao-miguel-l1664/sao-miguel-sightseeing-hop-on-hop-off-bus-t1077274/?partner_id=R8NRH08&utm_medium=online_publisher&cmp=hop_on_off_bus';

export function resolveHopOnOffUrl(): string {
  return process.env.EXPO_PUBLIC_HOP_ON_OFF_URL ?? HOP_ON_OFF_DEFAULT_URL;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_FULL_SCREEN_AD_AT_KEY = 'azores_hub_last_full_screen_ad_at';

export async function loadLastFullScreenAdAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_FULL_SCREEN_AD_AT_KEY);
  const value = raw ? Number(raw) : null;
  return Number.isFinite(value) ? value : null;
}

export async function markFullScreenAdShown(nowMs: number): Promise<void> {
  await AsyncStorage.setItem(LAST_FULL_SCREEN_AD_AT_KEY, String(nowMs));
}

/** Test helper — reset persisted full-screen ad timestamp. */
export async function resetFullScreenAdStorageForTests(): Promise<void> {
  await AsyncStorage.removeItem(LAST_FULL_SCREEN_AD_AT_KEY);
}

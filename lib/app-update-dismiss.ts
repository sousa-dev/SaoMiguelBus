import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_VERSION_KEY = 'app_update_dismissed_version';

type DismissStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

let dismissStorage: DismissStorage = AsyncStorage;

/** Test hook — reset to default AsyncStorage when passed null. */
export function setAppUpdateDismissStorage(storage: DismissStorage | null): void {
  dismissStorage = storage ?? AsyncStorage;
}

export async function getDismissedAppUpdateVersion(): Promise<string | null> {
  const value = await dismissStorage.getItem(DISMISSED_VERSION_KEY);
  return value?.trim() || null;
}

export async function setDismissedAppUpdateVersion(version: string): Promise<void> {
  await dismissStorage.setItem(DISMISSED_VERSION_KEY, version);
}

export async function clearDismissedAppUpdateVersion(): Promise<void> {
  await dismissStorage.removeItem(DISMISSED_VERSION_KEY);
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCALE_KEY = 'azores_hub_locale';

export async function loadSavedLocale(): Promise<string | null> {
  return AsyncStorage.getItem(LOCALE_KEY);
}

export async function saveLocale(code: string): Promise<void> {
  await AsyncStorage.setItem(LOCALE_KEY, code);
}

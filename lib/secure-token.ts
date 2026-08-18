import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Auth token persistence. Uses the OS keychain/keystore via expo-secure-store on
 * native; falls back to AsyncStorage on web (SecureStore is native-only).
 */
const TOKEN_KEY = 'azores_hub_auth_token';
const isWeb = Platform.OS === 'web';
// AsyncStorage's web backend reads window.localStorage directly. Expo Router's
// server-side render pass for web runs this module in Node, where window is
// undefined, so guard against that instead of letting it reject.
const hasWindow = typeof window !== 'undefined';

export async function saveAuthToken(token: string): Promise<void> {
  if (isWeb) {
    if (!hasWindow) return;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null> {
  if (isWeb) {
    if (!hasWindow) return null;
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteAuthToken(): Promise<void> {
  if (isWeb) {
    if (!hasWindow) return;
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

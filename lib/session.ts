import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const SESSION_KEY = 'azores_hub_session_id';

export async function getOrCreateSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(SESSION_KEY, id);
  return id;
}

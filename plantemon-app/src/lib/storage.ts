/**
 * Offline cache of the garden. Server is source of truth — this exists so
 * the app shows something instantly on cold start before /me returns.
 *
 * AsyncStorage transparently maps to localStorage on web and the native
 * key-value store on iOS/Android, so the same calls work everywhere.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Me } from "./api";

const KEY = "plantemon.cache.me.v1";

export async function loadCachedMe(): Promise<Me | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Me) : null;
}

export async function saveCachedMe(me: Me): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(me));
}

export async function clearCache(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

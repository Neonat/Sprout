/**
 * SecureStore-backed token cache for Clerk on iOS/Android.
 * On web Clerk uses its own cookie storage, so this is a no-op there.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { TokenCache } from "@clerk/clerk-expo";

export const tokenCache: TokenCache | undefined =
  Platform.OS === "web"
    ? undefined
    : {
        async getToken(key) {
          try {
            return await SecureStore.getItemAsync(key);
          } catch {
            return null;
          }
        },
        async saveToken(key, value) {
          try {
            await SecureStore.setItemAsync(key, value);
          } catch {
            /* ignore */
          }
        },
      };

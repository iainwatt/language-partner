import * as SecureStore from "expo-secure-store";
import * as FirebaseAuth from "firebase/auth";
import type { Persistence } from "firebase/auth";
import { secureChunks } from "../storage/secureChunks";

const storage = secureChunks({
  get: (key) => SecureStore.getItemAsync(key),
  set: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
});
// Firebase exports this at runtime under its react-native condition, but the
// shared TypeScript declaration selects the browser API before that condition.
const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence(adapter: typeof storage): Persistence;
};
export const authPersistence = nativeAuth.getReactNativePersistence(storage);

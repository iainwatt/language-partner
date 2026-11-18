import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, initializeAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { authPersistence } from "./authPersistence";

const options = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = !!(
  options.apiKey &&
  options.projectId &&
  options.appId
);
export const emulatorHost =
  process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? "";
// A build connected to emulators must never also address a production project.
if (emulatorHost && !options.projectId?.startsWith("demo-"))
  throw new Error("Local Firebase testing requires a demo- project ID.");
export const firebaseScope = `${options.projectId ?? "unconfigured"}:${emulatorHost ? "emulator" : "cloud"}`;

function initialize() {
  const existed = getApps().length > 0;
  const app = existed ? getApp() : initializeApp(options);
  const auth = existed
    ? getAuth(app)
    : initializeAuth(app, { persistence: authPersistence });
  // Dictionary documents are held in memory only, never persisted to the phone.
  const db = existed
    ? getFirestore(app)
    : initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
      });
  const functions = getFunctions(
    app,
    process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION ?? "europe-west2",
  );
  if (emulatorHost && !existed) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, emulatorHost, 8180);
    connectFunctionsEmulator(functions, emulatorHost, 5001);
  }
  return { app, auth, db, functions };
}

type FirebaseServices = ReturnType<typeof initialize>;

// Firebase Auth restores its persisted session through Expo SecureStore. Keep
// initialization behind the first React mount so native promise callbacks
// cannot race React Native's event-module registration during bundle startup.
export let firebase: FirebaseServices | null = null;
export function initializeFirebase(): FirebaseServices | null {
  if (!firebaseConfigured) return null;
  if (!firebase) firebase = initialize();
  return firebase;
}

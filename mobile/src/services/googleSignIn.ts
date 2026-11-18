import { Platform } from "react-native";
import { GoogleAuthProvider, linkWithCredential, signInWithCredential } from "firebase/auth";
import { firebase } from "./firebase";
import { assertGoogleIdentity } from "../core/googleIdentity";

export const googleSignInConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && (Platform.OS !== "ios" || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID));
export async function signInWithGoogle() {
  if (!firebase) throw new Error("Sign-in is unavailable in this build.");
  if (!googleSignInConfigured) throw new Error("Google sign-in is not available in this build yet. You can use email and password.");
  const auth = firebase.auth;
  const expected = auth.currentUser;
  const { GoogleSignin, isSuccessResponse } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return;
  assertGoogleIdentity(expected?.uid ?? null, auth.currentUser?.uid ?? null, expected?.email ?? null, response.data.user.email);
  if (!response.data.idToken) throw new Error("Google did not return a sign-in token. Please try again.");
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  if (expected) await linkWithCredential(expected, credential);
  else await signInWithCredential(auth, credential);
}

export async function clearGoogleSession() {
  // Firebase sign-out remains successful even on a build without this module.
  try { const { GoogleSignin } = await import("@react-native-google-signin/google-signin"); await GoogleSignin.signOut(); } catch {}
}

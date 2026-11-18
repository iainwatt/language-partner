import { GoogleAuthProvider, linkWithPopup, signInWithPopup } from "firebase/auth";
import { firebase } from "./firebase";

export const googleSignInConfigured = true;
export async function signInWithGoogle() {
  if (!firebase) throw new Error("Sign-in is unavailable in this build.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const current = firebase.auth.currentUser;
  // Linking preserves the existing Firebase UID and its dictionary.
  if (current) await linkWithPopup(current, provider);
  else await signInWithPopup(firebase.auth, provider);
}

export async function clearGoogleSession() {}

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  firebase,
  firebaseConfigured,
  initializeFirebase,
} from "./firebase";

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  guest: boolean;
  setGuest(value: boolean): void;
  refresh(): Promise<void>;
}>({
  user: null,
  loading: true,
  guest: false,
  setGuest() {},
  async refresh() {},
});
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [guest, setGuest] = useState(false);
  const [, redraw] = useState(0);
  useEffect(() => {
    const client = initializeFirebase();
    if (!client) {
      setLoading(false);
      return;
    }
    return onIdTokenChanged(client.auth, (value) => {
      setUser(value);
      setLoading(false);
      if (value) setGuest(false);
    });
  }, []);
  async function refresh() {
    if (!firebase?.auth.currentUser) return;
    await firebase.auth.currentUser.reload();
    await firebase.auth.currentUser.getIdToken(true);
    setUser(firebase.auth.currentUser);
    redraw((n) => n + 1);
  }
  return (
    <AuthContext.Provider value={{ user, loading, guest, setGuest, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
export async function signIn(
  email: string,
  password: string,
  register: boolean,
) {
  if (!firebase)
    throw new Error("Firebase is not configured for this build yet.");
  const credentials = await (
    register ? createUserWithEmailAndPassword : signInWithEmailAndPassword
  )(firebase.auth, email.trim(), password);
  if (register) await sendEmailVerification(credentials.user);
}
export async function resetPassword(email: string) {
  if (!firebase)
    throw new Error("Firebase is not configured for this build yet.");
  await sendPasswordResetEmail(firebase.auth, email.trim());
}
export async function verifyEmail() {
  if (firebase?.auth.currentUser)
    await sendEmailVerification(firebase.auth.currentUser);
}
export async function signOut() {
  if (firebase) await firebaseSignOut(firebase.auth);
  const { clearGoogleSession } = await import("./googleSignIn");
  await clearGoogleSession();
}
export function authError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/account-exists-with-different-credential": "An account already uses this email. Sign in with your password, then link Google in Settings to keep your saved data.",
    "auth/credential-already-in-use": "This Google account is already linked to another account. Sign out and use Continue with Google.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled. You can try again.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled. You can try again.",
    "auth/popup-blocked": "Allow the Google sign-in popup, then try again.",
    "auth/operation-not-allowed": "Google sign-in is not enabled yet. Please use email and password for now.",
    "SIGN_IN_CANCELLED": "Google sign-in was cancelled.",
    "IN_PROGRESS": "Google sign-in is already in progress.",
    "PLAY_SERVICES_NOT_AVAILABLE": "Google Play services are unavailable. Please use email and password.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/email-already-in-use":
      "That email already has an account. Sign in or reset your password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password":
      "Choose a stronger password with at least 12 characters.",
    "auth/network-request-failed":
      "Cannot reach the sign-in service. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  };
  return (
    messages[code ?? ""] ??
    (error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.")
  );
}

import { googleSignInConfigured, signInWithGoogle } from "../services/googleSignIn";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Leaf } from "lucide-react-native";
import {
  authError,
  resetPassword,
  signIn,
  signOut,
  useAuth,
  verifyEmail,
} from "../services/auth";
import { emulatorHost, firebaseConfigured } from "../services/firebase";
import { Button, c, Field, fonts, Label, s } from "./components";
import { DisplayText } from "./DisplayText";

export function AuthScreen() {
  const { user, refresh, setGuest } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(work: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setMessage("");
    try {
      await work();
      if (success) setMessage(success);
    } catch (error) {
      setMessage(authError(error));
    } finally {
      setBusy(false);
    }
  }
  const title = user
    ? "Check your email"
    : mode === "signup"
      ? "Make yourself at home."
      : mode === "reset"
        ? "Reset your password"
        : "A little practice,\nevery day.";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 28,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 430,
              alignSelf: "center",
              gap: 20,
            }}
          >
            <Leaf size={36} color={c.accent} />
            <Text style={s.eyebrow}>Language Partner</Text>
            <DisplayText
              style={{
                fontFamily: fonts.serif,
                fontSize: 36,
                lineHeight: 43,
                color: c.ink,
              }}
            >
              {title}
            </DisplayText>
            {!!emulatorHost && (
              <Label muted>Local test · Firebase emulators</Label>
            )}
            {user ? (
              <>
                <Label>
                  Open the verification link sent to {user.email}, then
                  continue.
                </Label>
                <Button
                  primary
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await refresh();
                      if (!user.emailVerified)
                        throw new Error(
                          "Your email is not verified yet. Open the link in your email first.",
                        );
                    })
                  }
                >
                  I’ve verified my email
                </Button>
                <Button
                  disabled={busy}
                  onPress={() =>
                    void run(
                      verifyEmail,
                      "A new verification email has been sent.",
                    )
                  }
                >
                  Resend email
                </Button>
                <Button small disabled={busy} onPress={() => void run(signOut)}>
                  Sign out
                </Button>
              </>
            ) : firebaseConfigured ? (
              <>
                <Label muted>
                  {mode === "reset"
                    ? "We’ll email you a link to choose a new password."
                    : "Sign in to keep your words and translations in your own dictionary."}
                </Label>
                {mode !== "reset" && <>
                  <Button primary disabled={busy || !googleSignInConfigured} onPress={() => void run(signInWithGoogle)}>Continue with Google</Button>
                  <Label muted>Or use your email and password</Label>
                </>}
                <Field
                  accessibilityLabel="Email"
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  editable={!busy}
                />
                {mode !== "reset" && (
                  <Field
                    accessibilityLabel="Password"
                    placeholder={
                      mode === "signup"
                        ? "Password · at least 12 characters"
                        : "Password"
                    }
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    editable={!busy}
                  />
                )}
                <Button
                  primary
                  disabled={
                    busy ||
                    !email.trim() ||
                    (mode !== "reset" &&
                      password.length < (mode === "signup" ? 12 : 1))
                  }
                  onPress={() =>
                    void run(async () => {
                      if (mode === "reset") {
                        await resetPassword(email);
                        setMessage(
                          "If an account exists for that email, a reset link is on its way.",
                        );
                      } else {
                        await signIn(email, password, mode === "signup");
                        setPassword("");
                      }
                    })
                  }
                >
                  {mode === "signup"
                    ? "Create account"
                    : mode === "reset"
                      ? "Send reset link"
                      : "Sign in"}
                </Button>
                <Button
                  small
                  disabled={busy}
                  onPress={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setMessage("");
                  }}
                >
                  {mode === "signin" ? "Create an account" : "Back to sign in"}
                </Button>
                {mode === "signin" && (
                  <Button
                    small
                    disabled={busy}
                    onPress={() => {
                      setMode("reset");
                      setMessage("");
                    }}
                  >
                    Forgot password?
                  </Button>
                )}
              </>
            ) : (
              <Label muted>
                Account setup is being completed. You can explore the sample
                conversation in the meantime.
              </Label>
            )}
            {busy && <ActivityIndicator color={c.accent} />}
            {!!message && (
              <Text
                accessibilityRole="alert"
                style={{ color: c.danger, lineHeight: 22 }}
              >
                {message}
              </Text>
            )}
            {!user && (
              <Button small disabled={busy} onPress={() => setGuest(true)}>
                Explore demo
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

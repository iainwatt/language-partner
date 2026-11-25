import React, { useState } from "react";
import { levels, type Level } from "../core/domain";
import { Platform, Switch, Text, View } from "react-native";
import Constants from "expo-constants";
import { c, fonts, Label } from "./components";
import { SettingsModal, SettingsPageContent, SettingsRow, SettingsSection } from "./SettingsPage";
import { Tutorial } from "./Tutorial";
import { displayFontLicense } from "./fontLicense";
import appConfig from "../../app.json";

// These are intentionally local destinations until the Help content and public
// links are ready. Keep the unfinished state visible rather than using dummy URLs.
const helpTopics = {
  welcome: { title: "Onboarding welcome", description: "A short introduction to Language Partner will be available here." },
  share: { title: "Share Language Partner", description: "You’ll be able to share a download link when Language Partner is publicly available." },
  terms: { title: "Terms of Use", description: "The terms for using Language Partner will be published here." },
  privacy: { title: "Privacy Policy", description: "Your dictionary and saved topic summaries are stored in your Firebase account. Chat transcripts stay on this device. Messages and translations are processed by our managed AI service. Feedback stores only the text you submit and an English translation for Iain to review; no feedback audio is saved or uploaded as a recording. Device speech recognition may process speech through Apple or Google. A full privacy policy will be published before public release." },
} as const;
type HelpTopic = keyof typeof helpTopics;

export function SettingsScreen({ email, nativeLanguage, targetLanguage, targetLanguageCode = "ru-RU", autoSpeak, translateReplies, speaker, onSpeaker, level, onLevel, entryCount, conversationCount, dictionaryConnected, busy, notice, localTest, subscriptionLabel, onSubscription, onClose, onFeedback, onGoogle, googleLinked = false, onLanguages, onAutoSpeak, onTranslateReplies, onSignOut, onSignIn }: {
  email?: string;
  nativeLanguage: string;
  targetLanguage: string;
  targetLanguageCode?: string;
  autoSpeak: boolean;
  translateReplies: boolean;
  speaker?: "male" | "female";
  onSpeaker: (speaker?: "male" | "female") => void;
  // How well the learner speaks the language being practised, as they judge it.
  level?: Level;
  onLevel: (level?: Level) => void;
  entryCount: number;
  conversationCount: number;
  dictionaryConnected: boolean;
  busy: boolean;
  notice: string;
  localTest: boolean;
  subscriptionLabel?: string;
  onSubscription?: () => void;
  onClose: () => void;
  onLanguages: () => void;
  onFeedback: () => void;
  onGoogle?: () => void;
  googleLinked?: boolean;
  onAutoSpeak: (enabled: boolean) => void;
  onTranslateReplies: (enabled: boolean) => void;
  onSignOut: () => void;
  onSignIn: () => void;
}) {
  const [page, setPage] = useState<HelpTopic | "licence" | "tutorial" | null>(null);
  const help = page && page !== "licence" && page !== "tutorial" ? helpTopics[page] : null;
  const version = Constants.expoConfig?.version ?? appConfig.expo.version;
  const build = Platform.OS === "ios" ? Constants.platform?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode;
  return (
    <SettingsModal onClose={onClose} onBack={page ? () => setPage(null) : undefined}>
      {page === "tutorial" ? <Tutorial targetLanguage={targetLanguageCode} onExit={() => setPage(null)} onFinish={onClose} /> : <SettingsPageContent title={help?.title ?? (page === "licence" ? "Font licence" : "Settings")} onClose={onClose} onBack={page ? () => setPage(null) : undefined}>
      {help ? (
        <SettingsSection title="Coming soon">
          <Label style={{ paddingTop: 12 }}>{help.description}</Label>
        </SettingsSection>
      ) : page === "licence" ? (
        <Text selectable style={{ color: c.ink, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 }}>{displayFontLicense}</Text>
      ) : (
        <>
          {onSubscription && <SettingsSection title="Subscription"><SettingsRow title="Language Partner Plus" value={subscriptionLabel} onPress={onSubscription} /></SettingsSection>}
          {email && onGoogle && <SettingsSection title="Sign-in">
            <SettingsRow title="Google sign-in" value={googleLinked ? "Linked" : "Link account"} onPress={googleLinked ? undefined : onGoogle} />
          </SettingsSection>}
          <SettingsSection title="General" footer="Your partner pitches what it says to your level; tap to change it. Many languages use different word forms for men and women, so your partner needs to know which to use for you.">
            <SettingsRow title="Languages" value={`${nativeLanguage} → ${targetLanguage}`} onPress={onLanguages} />
            <SettingsRow title="I speak as" value={speaker === "male" ? "A man" : speaker === "female" ? "A woman" : "Not set"}
              onPress={busy ? undefined : () => onSpeaker(speaker === "male" ? "female" : speaker === "female" ? undefined : "male")} />
            <SettingsRow title={`My level in ${targetLanguage}`} value={level ? level[0].toUpperCase() + level.slice(1) : "Not set"}
              onPress={busy ? undefined : () => onLevel(level ? levels[levels.indexOf(level) + 1] : levels[0])} />
          </SettingsSection>
          <SettingsSection title="Voice" footer="Read your partner’s replies aloud after you speak.">
            <SettingsRow title="Read replies aloud" trailing={
              <SettingsSwitch label="Read replies aloud after voice input" disabled={busy} value={autoSpeak} onChange={onAutoSpeak} />
            } />
          </SettingsSection>
          <SettingsSection title="Translations" footer={`Adds a translation into ${nativeLanguage} under your partner’s questions and exercises in ${targetLanguage} lessons and roleplays. You can still translate any message yourself.`}>
            <SettingsRow title="Translate partner’s lines" trailing={
              <SettingsSwitch label={`Translate your partner’s ${targetLanguage} lines`} disabled={busy} value={translateReplies} onChange={onTranslateReplies} />
            } />
          </SettingsSection>
          <SettingsSection title="Your data" footer={email
            ? dictionaryConnected ? "Your dictionary is connected and up to date." : "Waiting for a connection. Connect to the internet to load and save words."
            : "Sign in to save your words and conversations to your account."}>
            <SettingsRow title="Saved words" value={String(entryCount)} />
            <SettingsRow title="Saved conversations" value={String(conversationCount)} />
          </SettingsSection>
          <SettingsSection title="Help">
            <SettingsRow title="Send feedback" onPress={onFeedback} />
            <SettingsRow title={helpTopics.welcome.title} value="Soon" onPress={() => setPage("welcome")} />
            <SettingsRow title="Take the tutorial" onPress={() => setPage("tutorial")} />
            {(Object.entries(helpTopics) as [HelpTopic, typeof helpTopics[HelpTopic]][]).filter(([key]) => key !== "welcome").map(([key, topic]) => (
              <SettingsRow key={key} title={topic.title} value="Soon" onPress={() => setPage(key)} />
            ))}
            <SettingsRow title="Font licence" value="Playfair Display" onPress={() => setPage("licence")} />
            <SettingsRow title="Version" value={`${version}${build ? ` (${build})` : ""}`} />
          </SettingsSection>
          <SettingsSection title="Account">
            {email ? <>
              <Text selectable style={{ paddingVertical: 12, color: c.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 }}>{email}</Text>
              <SettingsRow title="Sign out" danger disabled={busy} onPress={onSignOut} />
            </> : <SettingsRow title="Sign in or create account" onPress={onSignIn} />}
            {localTest && <Label muted style={{ fontSize: 12 }}>Local test · Firebase emulators</Label>}
          </SettingsSection>
          {!!notice && <View accessibilityLiveRegion="polite"><Label style={{ color: c.danger }}>{notice}</Label></View>}
        </>
      )}
      </SettingsPageContent>}
    </SettingsModal>
  );
}

function SettingsSwitch({ label, value, disabled, onChange }: { label: string; value: boolean; disabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <Switch
      accessibilityLabel={label}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: c.line, true: c.accent }}
      thumbColor={c.paper}
      ios_backgroundColor={c.line}
      // React Native Web uses a separate colour for the checked thumb.
      {...(Platform.OS === "web" ? { activeThumbColor: c.paper } : {})}
    />
  );
}

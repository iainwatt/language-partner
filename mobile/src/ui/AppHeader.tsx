import React from "react";
import { StyleSheet, View } from "react-native";
import { Menu, Settings } from "lucide-react-native";
import { Button, c } from "./components";
import { DisplayText } from "./DisplayText";

export function AppHeader({
  title,
  prominent = false,
  busy,
  settingsLabel,
  onOpenMenu,
  onSettings,
  onFeedback,
}: {
  title: string;
  prominent?: boolean;
  busy: boolean;
  settingsLabel: string;
  onOpenMenu: () => void;
  onSettings: () => void;
  onFeedback?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.controls}>
        <Button icon={Menu} label="Open menu" disabled={busy} style={styles.button} onPress={onOpenMenu} />
        <View style={styles.spacer} />
        {onFeedback && <Button small disabled={busy} style={styles.feedbackButton} onPress={onFeedback}>Feedback</Button>}
        <View style={styles.spacer} />
        <Button icon={Settings} label={settingsLabel} disabled={busy} style={styles.button} onPress={onSettings} />
      </View>
      <DisplayText
        accessibilityRole="header"
        numberOfLines={2}
        adjustsFontSizeToFit={prominent}
        minimumFontScale={0.75}
        medium={prominent}
        style={[styles.title, prominent && styles.conversationTitle]}
      >
        {title}
      </DisplayText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 2, paddingBottom: 8, flexShrink: 0 },
  controls: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 },
  spacer: { flex: 1 },
  feedbackButton: { minHeight: 32, paddingHorizontal: 10, paddingVertical: 4 },
  title: { textAlign: "center", fontSize: 18, lineHeight: 25, color: c.ink, paddingHorizontal: 12 },
  conversationTitle: { fontSize: 36, lineHeight: 44, letterSpacing: -0.6 },
  button: { width: 44, minHeight: 44, borderWidth: 0, borderRadius: 22, backgroundColor: "transparent", paddingHorizontal: 10 },
});

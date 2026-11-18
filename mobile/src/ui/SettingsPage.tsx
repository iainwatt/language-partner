import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { c, fonts, Label } from "./components";
import { DisplayText } from "./DisplayText";

/** A shared, quieter layout for Settings and its child pages. */
export function SettingsPage({ title, subtitle, children, onClose, onBack }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
}) {
  return <SettingsModal onClose={onClose} onBack={onBack}>
    <SettingsPageContent title={title} subtitle={subtitle} onClose={onClose} onBack={onBack}>{children}</SettingsPageContent>
  </SettingsModal>;
}

/** Keep the same native modal mounted when moving between Help and its tutorial. */
export function SettingsModal({ children, onClose, onBack }: {
  children: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onBack ?? onClose}>
      <KeyboardAvoidingView style={[styles.overlay, { paddingTop: Math.max(insets.top, 16) + 12 }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close settings" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal onAccessibilityEscape={onBack ?? onClose} style={[styles.page, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SettingsPageContent({ title, subtitle, children, onClose, onBack }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  onBack?: () => void;
}) {
  return <>
          <View style={styles.navigation}>
            {onBack && (
              <Pressable accessibilityRole="button" accessibilityLabel="Back to settings" onPress={onBack} style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed]}>
                <ChevronLeft size={21} color={c.accent} strokeWidth={1.8} />
                <Text style={styles.navigationText}>Settings</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={onClose} style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed]}>
              <Text style={styles.navigationText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView key={title} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.heading}>
              <DisplayText accessibilityRole="header" style={styles.title}>{title}</DisplayText>
              {!!subtitle && <Label muted>{subtitle}</Label>}
            </View>
            {children}
          </ScrollView>
  </>;
}

export function SettingsSection({ title, children, footer }: {
  title: string; children: React.ReactNode; footer?: string;
}) {
  return (
    <View>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={{ paddingTop: 5 }}>{children}</View>
      {!!footer && <Label muted style={styles.footer}>{footer}</Label>}
    </View>
  );
}

export function SettingsRow({ title, value, onPress, trailing, disabled = false, danger = false }: {
  title: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  const content = <>
    <Text style={[styles.rowTitle, danger && { color: c.danger }]}>{title}</Text>
    {!!value && <Text style={styles.rowValue}>{value}</Text>}
    {trailing ?? (onPress ? <ChevronRight size={18} strokeWidth={1.6} color={c.muted} /> : null)}
  </>;
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, disabled && { opacity: 0.45 }, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: c.settingsOverlay },
  page: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center", backgroundColor: c.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden" },
  navigation: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 7, minHeight: 52 },
  navigationButton: { minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 2 },
  navigationText: { fontFamily: fonts.sans, color: c.accentText, fontSize: 16, lineHeight: 22 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 26 },
  heading: { gap: 8, paddingBottom: 4 },
  title: { fontSize: 38, lineHeight: 46, letterSpacing: -0.8, color: c.ink },
  sectionTitle: { fontFamily: fonts.sans, color: c.muted, fontSize: 11, lineHeight: 17, textTransform: "uppercase", letterSpacing: 1.8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.accent },
  row: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  rowTitle: { flex: 1, fontFamily: fonts.sans, color: c.ink, fontSize: 15, lineHeight: 21 },
  rowValue: { maxWidth: "45%", flexShrink: 1, fontFamily: fonts.sans, color: c.muted, fontSize: 13, lineHeight: 19, textAlign: "right" },
  footer: { fontSize: 12, lineHeight: 18, paddingTop: 5 },
  pressed: { opacity: 0.55 },
});

import React, { createContext, useState } from "react";
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { X, type LucideIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts } from "./fonts";
import { DisplayText } from "./DisplayText";
export { fonts } from "./fonts";
// Warm paper and charcoal, with two gold tones: accent for controls/graphics,
// accentText for readable small text on the light surfaces.
export const c = {
  bg: "#F7F5EF",
  paper: "#FFFDFA",
  ink: "#26241F",
  muted: "#6A655C",
  accent: "#A58A24",
  accentText: "#796114",
  pale: "#EFE8D5",
  bubble: "#EEEAE1",
  line: "#D8D2C6",
  yellow: "#F4EBCF",
  handle: "#C9C3B6",
  shadow: "#28251E",
  overlay: "#28251E38",
  settingsOverlay: "#28251E60",
  grammar: "#A8443D",
  danger: "#9D4039",
};
export function Label({
  children,
  muted = false,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: any;
}) {
  return (
    <Text
      style={[
        {
          color: muted ? c.muted : c.ink,
          fontFamily: fonts.sans,
          fontSize: 14,
          lineHeight: 21,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  icon: Icon,
  primary,
  disabled,
  small,
  danger,
  style,
  label,
  iconColor,
}: {
  children?: React.ReactNode;
  onPress: () => void;
  icon?: LucideIcon;
  primary?: boolean;
  disabled?: boolean;
  small?: boolean;
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
  iconColor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        label ?? (typeof children === "string" ? children : undefined)
      }
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        small && { minHeight: 38, paddingVertical: 7 },
        primary && { backgroundColor: c.ink, borderColor: c.ink },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.65 },
        style,
      ]}
    >
      {Icon && (
        <Icon
          size={small ? 16 : 20}
          color={iconColor ?? (primary ? c.paper : danger ? c.danger : c.accent)}
          strokeWidth={1.8}
        />
      )}
      {children && (
        <Text
          style={{
            color: primary ? c.paper : danger ? c.danger : c.ink,
            fontFamily: fonts.sans,
            fontWeight: "500",
            fontSize: small ? 13 : 15,
          }}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}
export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={c.muted}
      selectionColor={c.accentText}
      {...props}
      style={[
        s.field,
        props.multiline && { minHeight: 95, textAlignVertical: "top" },
        props.style,
      ]}
    />
  );
}
// Lets something deep inside a sheet pin a panel to the sheet's bottom edge,
// where it stays in view however far the content is scrolled.
export const SheetFooter = createContext<(panel: React.ReactNode) => void>(() => {});
export function Sheet({
  title,
  subtitle,
  children,
  onClose,
  height = "78%",
  recentText,
  displayTitle = false,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  height?: any;
  recentText?: string;
  displayTitle?: boolean;
  compact?: boolean;
}) {
  const [footer, setFooter] = useState<React.ReactNode>(null);
  return (
    <Modal
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close panel"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        {!!recentText && (
          <View
            style={{
              width: "90%",
              maxWidth: 716,
              alignSelf: "center",
              padding: 14,
              marginBottom: 12,
              borderRadius: 16,
              backgroundColor: c.paper,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Text style={[s.eyebrow, { marginBottom: 5 }]}>
              Recent conversation
            </Text>
            <Text
              numberOfLines={2}
              style={{ color: c.ink, fontSize: 14, lineHeight: 20 }}
            >
              {recentText}
            </Text>
          </View>
        )}
        <SafeAreaView
          edges={["bottom"]}
          style={[s.sheet, compact && { paddingHorizontal: 18, paddingTop: 6 }, { maxHeight: height }]}
        >
          <View style={[s.handle, compact && { marginBottom: 4 }]} />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              {displayTitle ? <DisplayText style={s.title}>{title}</DisplayText> : <Text style={[s.title, compact && { fontSize: 19 }]}>{title}</Text>}
              {subtitle && <Label muted>{subtitle}</Label>}
            </View>
            <Button
              icon={X}
              label="Close"
              onPress={onClose}
              style={{
                borderWidth: 0,
                backgroundColor: c.bubble,
                borderRadius: 24,
                paddingHorizontal: 12,
              }}
            />
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: compact ? 6 : 16,
              paddingTop: compact ? 4 : 18,
              // Keeps the last control clear of the bottom edge in every sheet.
              paddingBottom: 28,
            }}
          >
            <SheetFooter.Provider value={setFooter}>{children}</SheetFooter.Provider>
          </ScrollView>
          {footer && <View style={{ paddingTop: 10, paddingBottom: 30, borderTopWidth: 1, borderColor: c.line }}>{footer}</View>}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 21,
    fontWeight: "600",
    color: c.ink,
    letterSpacing: -0.4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: c.muted,
    fontFamily: fonts.sans,
  },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    gap: 12,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },
  field: {
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.paper,
    borderRadius: 13,
    padding: 14,
    color: c.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: c.bg,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: c.line,
  },
  handle: {
    height: 4,
    width: 36,
    borderRadius: 10,
    backgroundColor: c.handle,
    alignSelf: "center",
    marginBottom: 18,
  },
});

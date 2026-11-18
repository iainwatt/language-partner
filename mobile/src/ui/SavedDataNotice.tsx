import React from "react";
import { StyleSheet, View } from "react-native";
import { CloudOff } from "lucide-react-native";
import { c, Label } from "./components";

export function SavedDataNotice({ loaded }: { loaded: boolean }) {
  return (
    <View accessible accessibilityRole="alert" style={styles.notice}>
      <CloudOff color={c.accent} size={20} />
      <View style={{ flex: 1, gap: 3 }}>
        <Label style={{ fontWeight: "600" }}>
          {loaded ? "Connection interrupted" : "Waiting for your saved data"}
        </Label>
        <Label style={{ fontSize: 13, lineHeight: 19 }}>
          Check your Wi-Fi or mobile data connection. Your saved words and
          conversations will load automatically when connected.
        </Label>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: c.yellow,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Entry } from "../core/domain";
import { c, fonts, Label, Sheet } from "./components";

export function ConversationLexiconSheet({
  title,
  words,
  onClose,
}: {
  title: string;
  words: Entry[];
  onClose: () => void;
}) {
  return (
    <Sheet
      title="Saved words"
      subtitle={title}
      height="76%"
      onClose={onClose}
    >
      {!words.length ? (
        <Label muted>
          Words saved during this conversation will appear here.
        </Label>
      ) : (
        <View style={styles.list}>
          {words.map((entry, index) => (
            <View
              key={entry.id}
              style={[styles.row, index === words.length - 1 && styles.lastRow]}
            >
              <Text selectable style={styles.phrase}>
                {entry.phrase}
              </Text>
              <Text selectable style={styles.meaning}>
                {entry.meaning}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    backgroundColor: c.paper,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line,
  },
  lastRow: { borderBottomWidth: 0 },
  phrase: {
    flex: 1,
    color: c.ink,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  meaning: {
    flex: 1,
    color: c.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
  },
});

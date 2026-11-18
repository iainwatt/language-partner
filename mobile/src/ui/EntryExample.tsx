import React from "react";
import { Text, View } from "react-native";
import type { Entry } from "../core/domain";
import { c, fonts, Label } from "./components";

export function EntryExample({ entry, compact = false }: { entry: Entry; compact?: boolean }) {
  if (!entry.example) return null;
  const text = entry.example.text;
  const start = text
    .toLocaleLowerCase()
    .indexOf(entry.phrase.trim().toLocaleLowerCase());
  return (
    <View
      style={{
        gap: compact ? 3 : 4,
        marginTop: compact ? 4 : 8,
        paddingLeft: compact ? 8 : 12,
        borderLeftWidth: 2,
        borderLeftColor: c.line,
      }}
    >
      <Label muted style={{ fontSize: 11 }}>
        EXAMPLE
      </Label>
      <Text
        style={{
          fontFamily: fonts.serif,
          color: c.ink,
          fontSize: 16,
          lineHeight: 23,
        }}
      >
        {start < 0 ? (
          text
        ) : (
          <>
            {text.slice(0, start)}
            <Text style={{ fontWeight: "700" }}>
              {text.slice(start, start + entry.phrase.trim().length)}
            </Text>
            {text.slice(start + entry.phrase.trim().length)}
          </>
        )}
      </Text>
      <Label muted>{entry.example.translation}</Label>
    </View>
  );
}

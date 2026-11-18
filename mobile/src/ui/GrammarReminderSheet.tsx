import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { GrammarPractice } from "../core/grammar";
import { grammarAccentRanges } from "../core/grammarAccent";
import { c, fonts, Label, Sheet } from "./components";

function highlightedReminder(text: string, topicId: string) {
  const ranges = grammarAccentRanges(text, topicId);
  const content: React.ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) content.push(text.slice(cursor, range.start));
    content.push(
      <Text key={`${range.start}-${range.end}`} style={styles.accent}>
        {text.slice(range.start, range.end)}
      </Text>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) content.push(text.slice(cursor));
  return content;
}

export function GrammarReminderSheet({
  grammar,
  onClose,
}: {
  grammar: GrammarPractice;
  onClose: () => void;
}) {
  return (
    <Sheet
      title="Grammar reminder"
      subtitle={grammar.title}
      height="85%"
      onClose={onClose}
    >
      <GrammarPracticeCard grammar={grammar} showOpening />
    </Sheet>
  );
}

// The authored reference has four short lines. Allow wrapping and font scaling;
// never truncate the grammar a learner needs to practise.
export function GrammarPracticeCard({ grammar, showOpening = false }: {
  grammar: GrammarPractice;
  showOpening?: boolean;
}) {
  const hasAccents = !grammar.openingPrompt && grammarAccentRanges(grammar.reminder, grammar.id).length > 0;
  return (
    <View style={styles.reminder}>
      <Label muted style={styles.caption}>Quick reference · you know this, now practise it</Label>
      <Text selectable style={styles.text}>
        {grammar.openingPrompt ? grammar.reminder : highlightedReminder(grammar.reminder, grammar.id)}
      </Text>
      {showOpening && grammar.openingPrompt && (
        <View style={styles.opening}>
          <Label muted style={styles.caption}>Start the conversation</Label>
          <Text selectable style={styles.text}>{grammar.openingPrompt}</Text>
          {grammar.openingTranslation !== grammar.openingPrompt && (
            <Text selectable style={styles.translation}>{grammar.openingTranslation}</Text>
          )}
        </View>
      )}
      {hasAccents && <Label muted style={styles.caption}>Highlighted forms show the pattern.</Label>}
    </View>
  );
}

const styles = StyleSheet.create({
  reminder: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 14,
    backgroundColor: c.paper,
  },
  text: {
    color: c.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  accent: {
    color: c.grammar,
    fontWeight: "600",
  },
  opening: { borderTopWidth: 1, borderTopColor: c.line, marginTop: 10, paddingTop: 8, gap: 4 },
  translation: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: c.muted },
  caption: {
    fontSize: 11,
    lineHeight: 15,
  },
});

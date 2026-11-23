import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Pencil, Volume2 } from "lucide-react-native";
import type { Entry, SavedConversation } from "../core/domain";
import { Button, c, Label, s } from "./components";

export function DictionaryEntryCard({
  entry,
  contexts,
  onPronounce,
  onEdit,
  onContext,
  onSuggestion,
}: {
  entry: Entry;
  contexts: SavedConversation[];
  onPronounce: () => void;
  onEdit: () => void;
  onContext: (context: SavedConversation) => void;
  // Accept the more natural phrase the review suggested, or keep the original.
  onSuggestion: (accept: boolean) => void;
}) {
  return (
    <View style={[s.card, styles.card]}>
      <View style={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${entry.phrase}`}
          accessibilityHint="View phrase details and any saved example"
          onPress={onEdit}
          style={({ pressed }) => [styles.preview, pressed && { opacity: 0.65 }]}
        >
          <Text style={styles.phrase}>{entry.phrase}</Text>
          <Label muted style={styles.meaning}>{entry.meaning}</Label>
        </Pressable>
        {entry.suggestion && (
          <View style={styles.suggestion}>
            <Label muted style={{ fontSize: 12 }}>More natural</Label>
            <Text style={styles.suggested}>{entry.suggestion.phrase}</Text>
            {!!entry.suggestion.reason && <Label muted style={{ fontSize: 13, lineHeight: 18 }}>{entry.suggestion.reason}</Label>}
            <View style={s.wrap}>
              <Button small primary onPress={() => onSuggestion(true)}>Use this</Button>
              <Button small onPress={() => onSuggestion(false)}>Keep mine</Button>
            </View>
          </View>
        )}
        {contexts.map((context) => (
          <Pressable
            key={context.id}
            accessibilityRole="button"
            accessibilityLabel={`Context: ${context.title}`}
            onPress={() => onContext(context)}
            hitSlop={4}
            style={styles.context}
          >
            <Label style={styles.contextLabel}>{context.title} →</Label>
          </Pressable>
        ))}
      </View>
      <View>
        <Button small icon={Volume2} label={`Pronounce ${entry.phrase}`} style={styles.action} onPress={onPronounce} />
        <Button small icon={Pencil} label={`Edit ${entry.phrase}`} style={styles.action} onPress={onEdit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8, borderRadius: 14 },
  content: { flex: 1, gap: 3 },
  preview: { minHeight: 44, justifyContent: "center", gap: 3 },
  phrase: { fontSize: 18, lineHeight: 24, color: c.ink, fontWeight: "500" },
  meaning: { lineHeight: 20 },
  context: { minHeight: 36, justifyContent: "center" },
  suggestion: { gap: 4, marginVertical: 4, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: c.accent },
  suggested: { fontSize: 17, lineHeight: 23, color: c.ink, fontWeight: "500" },
  contextLabel: { color: c.accentText, fontSize: 12, lineHeight: 18 },
  action: { width: 44, minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 0, backgroundColor: "transparent" },
});

import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import {
  languageName,
  type Entry,
  type SavedConversation,
} from "../core/domain";
import { c, fonts, Label, s } from "./components";
import { DisplayText } from "./DisplayText";

export function PracticeIntroduction({
  context,
  words,
  onToggleTranslations,
}: {
  context: SavedConversation;
  words: Entry[];
  onToggleTranslations: () => void;
}) {
  const [showTranslations, setShowTranslations] = useState(false);
  const ToggleIcon = showTranslations ? ChevronUp : ChevronDown;
  return (
    <View style={{ gap: 16 }}>
      <DisplayText
        style={{
          fontFamily: fonts.serif,
          color: c.ink,
          fontSize: 27,
          lineHeight: 35,
        }}
      >
        Let’s revisit our conversation.
      </DisplayText>
      <Label>
        {context.summary ||
          context.description ||
          "Think back to this topic and what you would like to say about it."}
      </Label>
      {!!words.length && (
        <>
          <Text style={s.eyebrow}>Can you remember how to say…</Text>
          {words.map((entry) => (
            <Label key={entry.id} style={{ fontSize: 17, lineHeight: 25 }}>
              • {entry.meaning}
            </Label>
          ))}
          <Label muted>
            Try these in {languageName(context.target)}. Ask your partner for a
            hint whenever you need one.
          </Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showTranslations ? "Hide translation" : "Show translation"
            }
            accessibilityState={{ expanded: showTranslations }}
            onPress={() => {
              onToggleTranslations();
              setShowTranslations((visible) => !visible);
            }}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              minHeight: 44,
              paddingVertical: 8,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.sans,
                color: c.accentText,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              {showTranslations ? "Hide translation" : "Show translation"}
            </Text>
            <ToggleIcon size={18} color={c.accent} />
          </Pressable>
          {showTranslations && (
            <View style={{ gap: 22 }}>
              {words.map((entry) => (
                <View key={entry.id} style={{ gap: 5 }}>
                  <Text
                    style={{
                      fontFamily: fonts.serif,
                      color: c.ink,
                      fontSize: 19,
                      lineHeight: 27,
                    }}
                  >
                    {entry.phrase}
                  </Text>
                  <Label muted style={{ fontSize: 16, lineHeight: 24 }}>
                    {entry.meaning}
                  </Label>
                  {entry.example && (
                    <View style={{ gap: 3, marginTop: 5 }}>
                      <Label
                        style={{
                          fontStyle: "italic",
                          fontSize: 15,
                          lineHeight: 23,
                        }}
                      >
                        {entry.example.text}
                      </Label>
                      <Label muted>{entry.example.translation}</Label>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

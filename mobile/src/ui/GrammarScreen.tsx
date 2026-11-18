import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ArrowRight, BookOpenText } from "lucide-react-native";
import { languageName } from "../core/domain";
import type { GrammarTopic } from "../core/grammar";
import { Button, c, fonts, Label, s } from "./components";
import { DisplayText } from "./DisplayText";

export function GrammarScreen({
  language,
  topics,
  ready,
  account,
  onSignIn,
  onStart,
}: {
  language: string;
  topics: GrammarTopic[];
  ready: boolean;
  account: boolean;
  onSignIn: () => void;
  onStart: (topic: GrammarTopic) => void;
}) {
  return (
    <>
      <Text style={s.eyebrow}>{languageName(language)}</Text>
      <DisplayText
        style={{
          color: c.ink,
          fontFamily: fonts.serif,
          fontSize: 33,
          lineHeight: 40,
          letterSpacing: -0.8,
        }}
      >
        Grammar practice.
      </DisplayText>
      <Label muted>
        Choose a topic you’ve studied. Use a compact reminder, then practise
        it in conversation with focused corrections.
      </Label>
      {!account && (
        <View style={s.card}>
          <Label>Sign in to practise a grammar topic with your AI partner.</Label>
          <Button primary onPress={onSignIn}>
            Sign in
          </Button>
        </View>
      )}
      {!ready && <ActivityIndicator color={c.accent} />}
      {ready && !topics.length && (
        <Label muted>No grammar topics are available for this language yet.</Label>
      )}
      {topics.map((topic) => (
        <View key={topic.id} style={s.card}>
          <View style={s.row}>
            <BookOpenText color={c.accent} size={21} strokeWidth={1.8} />
            <Text style={[s.title, { flex: 1 }]}>{topic.title}</Text>
          </View>
          <Label muted>{topic.description}</Label>
          <Button
            icon={ArrowRight}
            primary
            disabled={!account}
            onPress={() => onStart(topic)}
          >
            Start practice
          </Button>
        </View>
      ))}
    </>
  );
}

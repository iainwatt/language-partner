import React, { useEffect, useRef, useState } from "react";
import { View, TextInput } from "react-native";
import { BookmarkPlus, Pencil, Volume2 } from "lucide-react-native";
import {
  selectedSpan,
  type Conversation,
  type Message,
  type Settings,
  type DictionaryInput,
} from "../core/domain";
import { translate } from "../services/api";
import type { PhraseRange } from "../core/selection";
import { isSelectionExample, selectionExample } from "../core/examples";
import { audio } from "../services/nativeAudio";
import { Button, Field, Label, Sheet, c, s } from "./components";
export function SelectionSheet({
  message,
  range,
  conversation,
  settings,
  onClose,
  onSave,
  onCorrect,
  source = "chat",
  knownTranslation = "",
  report: reportOutside,
}: {
  message: Message;
  range: PhraseRange;
  conversation: Conversation;
  settings: Settings;
  onClose: () => void;
  onSave: (entry: DictionaryInput) => Promise<void>;
  // Absent where the text is not the learner's to correct, as with a video's subtitles.
  onCorrect?: (text: string) => Promise<void>;
  // "video": the phrase was highlighted in a video's subtitles, and the whole line is its example.
  source?: "chat" | "video";
  // A translation of the suggested example that is already known.
  knownTranslation?: string;
  report: (text: string) => void;
}) {
  const [issue, setIssue] = useState("");
  const report = (value: string) => {
    setIssue(value);
    reportOutside(value);
  };
  const [text, setText] = useState(message.text);
  const [editing, setEditing] = useState(false);
  const [meaning, setMeaning] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  let phrase = "";
  let suggestedExample = "";
  try {
    phrase = selectedSpan(message, range.start, range.end);
    suggestedExample = source === "video" ? (message.text.trim() === phrase.trim() ? "" : message.text.trim().slice(0, 600)) : selectionExample(message, range);
  } catch {}
  const [example, setExample] = useState(suggestedExample);
  const [exampleTranslation, setExampleTranslation] = useState(knownTranslation);
  const validExample = !example || isSelectionExample(message, range, example);
  useEffect(() => {
    generation.current++;
    setMeaning("");
    setExample(suggestedExample);
    setExampleTranslation(knownTranslation);
    setIssue("");
  }, [message.text, range.start, range.end]);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function lookup() {
    setIssue("");
    const token = ++generation.current;
    setBusy(true);
    try {
      const lookups = await Promise.allSettled(
        [phrase, ...(example ? [example] : [])].map((text) =>
          translate(
            text,
            conversation.target,
            conversation.native,
            [{ ...message, text: example || suggestedExample || phrase }],
            settings,
          ),
        ),
      );
      if (token === generation.current) {
        const word = lookups[0],
          context = lookups[1];
        if (word.status === "fulfilled") setMeaning(word.value ?? "");
        if (context?.status === "fulfilled")
          setExampleTranslation(context.value ?? "");
        const failure = lookups.find((result) => result.status === "rejected");
        if (failure?.status === "rejected")
          report(
            failure.reason?.message ??
              "Translation unavailable. Please try again.",
          );
        else if (
          lookups.some(
            (result) => result.status === "fulfilled" && !result.value,
          )
        )
          report(
            "Enter any missing translation below. You can also remove the example and save just the phrase.",
          );
      }
    } catch (e: any) {
      if (token === generation.current) report(e.message);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  return (
    <Sheet
      title={editing ? "Correct transcript" : "Save your phrase"}
      subtitle={
        editing
          ? "Edit the message, then highlight your phrase again."
          : source === "video" ? "Your phrase, with the line it came from." : "Your phrase, with a little context from the chat."
      }
      onClose={onClose}
      height="88%"
      compact
    >
      {editing ? (
        <>
          <TextInput
            accessibilityLabel="Correct transcript"
            value={text}
            multiline
            onChangeText={setText}
            style={[
              s.field,
              { minHeight: 140, maxHeight: 250, textAlignVertical: "top" },
            ]}
          />
          <Button
            primary
            onPress={() => {
              onCorrect?.(text)
                .then(() => {
                  report(
                    "Transcript corrected. Highlight the words you want to save in the updated message.",
                  );
                  onClose();
                })
                .catch((e) => report(e.message));
            }}
            disabled={!text.trim()}
          >
            Keep correction
          </Button>
        </>
      ) : (
        <>
          <View style={[s.card, { backgroundColor: c.pale, paddingHorizontal: 12, paddingVertical: 8, gap: 0 }]}>
            <Label muted style={{ fontSize: 12 }}>SELECTED PHRASE</Label>
            <Label style={{ fontSize: 20, lineHeight: 27 }}>{phrase}</Label>
          </View>
          <View style={s.wrap}>
            <Button
              small
              disabled={!phrase || busy || !validExample}
              onPress={lookup}
            >
              {busy ? "Finding translation…" : "Find translation"}
            </Button>
            <Button
              small
              icon={Volume2}
              disabled={!phrase}
              onPress={() =>
                void audio.play("translator", phrase, conversation.target)
              }
            >
              Listen
            </Button>
          </View>
          <Field
            accessibilityLabel="Translation"
            style={{ minHeight: 44, padding: 10 }}
            placeholder="Translation · editable"
            value={meaning}
            editable={!busy}
            onChangeText={setMeaning}
            multiline
          />
          {!!example && (
            <View style={[s.card, { backgroundColor: c.bubble, paddingHorizontal: 12, paddingVertical: 8, gap: 6 }]}>
              <Label muted style={{ fontSize: 12 }}>{source === "video" ? "EXAMPLE FROM THIS VIDEO" : "EXAMPLE FROM THIS CHAT"} · shorten it if you like</Label>
              <Field
                accessibilityLabel="Example from chat"
                style={{ minHeight: 44, padding: 10 }}
                value={example}
                editable={!busy}
                multiline
                maxLength={600}
                onChangeText={(value) => {
                  setExample(value);
                  setExampleTranslation("");
                  setIssue("");
                }}
              />
              {!validExample && (
                <Label style={{ color: c.danger }}>
                  Keep an exact excerpt from this {source === "video" ? "line" : "chat"} that includes your
                  highlighted phrase.
                </Label>
              )}
              <Field
                accessibilityLabel="Example translation"
                style={{ minHeight: 44, padding: 10 }}
                placeholder="Example translation · editable"
                value={exampleTranslation}
                editable={!busy}
                multiline
                maxLength={2000}
                onChangeText={setExampleTranslation}
              />
              <Button
                small
                disabled={busy}
                onPress={() => {
                  setExample("");
                  setExampleTranslation("");
                }}
              >
                Remove example
              </Button>
            </View>
          )}
          {!example && !!suggestedExample && (
            <Button
              small
              disabled={busy}
              onPress={() => setExample(suggestedExample)}
            >
              {source === "video" ? "Add the line as an example" : "Add example from chat"}
            </Button>
          )}
          <Button
            primary
            icon={BookmarkPlus}
            disabled={
              !phrase ||
              !meaning.trim() ||
              busy ||
              !validExample ||
              (!!example && !exampleTranslation.trim())
            }
            onPress={() => {
              setBusy(true);
              onSave({
                phrase,
                meaning: meaning.trim(),
                native: conversation.native,
                target: conversation.target,
                ...(example
                  ? {
                      example: {
                        text: example.trim(),
                        translation: exampleTranslation.trim(),
                      },
                    }
                  : {}),
              })
                .then(onClose)
                .catch((e) => report(e.message))
                .finally(() => setBusy(false));
            }}
          >
            Save to dictionary
          </Button>
          {!!onCorrect && (
            <Button
              small
              icon={Pencil}
              disabled={busy}
              onPress={() => setEditing(true)}
            >
              Correct transcript
            </Button>
          )}
        </>
      )}
      {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
    </Sheet>
  );
}

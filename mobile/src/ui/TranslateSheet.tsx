import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  ArrowLeftRight,
  ArrowUpRight,
  BookmarkPlus,
  Mic,
  Square,
  Volume2,
} from "lucide-react-native";
import {
  languageName,
  type Conversation,
  type DictionaryInput,
  type Settings,
} from "../core/domain";
import { translateNatural } from "../services/api";
import { audio } from "../services/nativeAudio";
import { Button, Field, fonts, Label, Sheet, c, s } from "./components";
export function TranslateSheet({
  conversation,
  settings,
  onClose,
  onInsert,
  onSave,
  report: reportOutside,
  audioState,
}: {
  conversation: Conversation;
  settings: Settings;
  onClose: () => void;
  onInsert: (text: string) => void;
  onSave: (entry: DictionaryInput) => Promise<void>;
  report: (s: string) => void;
  audioState: string;
}) {
  const [issue, setIssue] = useState("");
  const report = (value: string) => {
    setIssue(value);
    reportOutside(value);
  };
  const [source, setSource] = useState(conversation.native);
  const [target, setTarget] = useState(conversation.target);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const [manual, setManual] = useState(false);
  // A word-for-word version, offered when it differs from the natural one.
  const [literal, setLiteral] = useState("");
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  function edit(value: string) {
    setIssue("");
    version.current++;
    setText(value);
    setResult("");
    setLiteral("");
    setManual(false);
  }
  async function lookup() {
    setIssue("");
    const token = ++version.current;
    setBusy(true);
    try {
      if (audio.owner === "translator") await audio.pause();
      const { text: translated, literal: close } = await translateNatural(
        text,
        source,
        target,
        conversation.messages.slice(-8),
        settings,
      );
      if (token === version.current) {
        setLiteral(close ?? "");
        setResult(translated ?? "");
        setManual(!translated);
        if (!translated)
          report(
            "Demo phrasebook has no translation for that text. You can add your own below.",
          );
      }
    } catch (e: any) {
      report(e.message);
    } finally {
      setBusy(false);
    }
  }
  const listening =
    audio.owner === "translator" &&
    (audioState === "listening" || audioState === "connecting");
  const iconButton = { width: 40, minHeight: 40, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: "transparent" } as const;
  const save = () => {
    setBusy(true);
    const targetIsLearning = target === conversation.target;
    onSave({
      phrase: targetIsLearning ? result : text,
      meaning: targetIsLearning ? text : result,
      native: conversation.native,
      target: conversation.target,
    })
      // The chat shows the saved notice once this sheet has closed.
      .then(onClose)
      .catch((e) => {
        report(e.message);
        setBusy(false);
      });
  };
  return (
    <Sheet title="Translate" onClose={onClose} height="76%" compact>
      {/* One card: what you say on top, its translation underneath, each with its own row of actions. */}
      <View style={[s.card, { padding: 0, gap: 0, borderRadius: 16 }]}>
        <View style={[s.row, { paddingHorizontal: 12, borderBottomWidth: 1, borderColor: c.line }]}>
          <Label style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600" }}>
            {languageName(source)}
          </Label>
          <Button
            icon={ArrowLeftRight}
            label="Swap translation languages"
            style={iconButton}
            disabled={busy}
            onPress={() => {
              if (audio.owner === "translator") void audio.pause();
              const old = source;
              setSource(target);
              setTarget(old);
              edit(result || text);
            }}
          />
          <Label style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600" }}>
            {languageName(target)}
          </Label>
        </View>
        <Field
          accessibilityLabel="Translation source"
          placeholder={
            settings.mode === "demo"
              ? "Try: I'm looking forward to it."
              : "What would you like to say?"
          }
          value={text}
          onChangeText={edit}
          multiline
          style={{ minHeight: 48, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, borderWidth: 0, backgroundColor: "transparent", fontSize: 18, lineHeight: 25 }}
        />
        <View style={[s.row, { paddingHorizontal: 8, paddingBottom: 6 }]}>
          <Button
            primary
            small
            style={{ borderRadius: 20, paddingHorizontal: 18, marginLeft: 6 }}
            disabled={!text.trim() || busy}
            onPress={lookup}
          >
            {busy ? "Translating…" : "Translate"}
          </Button>
          {settings.mode === "demo" && <Label muted style={{ fontSize: 12 }}>Demo phrasebook</Label>}
          <View style={{ flex: 1 }} />
          <Button
            icon={listening ? Square : Mic}
            label={listening ? "Finish speaking" : "Speak source"}
            style={iconButton}
            onPress={() => {
              if (listening) void audio.pause();
              else {
                const base = text;
                void audio.listen("translator", source, (draft) =>
                  edit(`${base}${base ? " " : ""}${draft}`),
                );
              }
            }}
          />
        </View>
        {(result || manual) && (
          <View style={{ borderTopWidth: 1, borderColor: c.line }}>
            <Field
              accessibilityLabel={manual ? "Your translation" : "Translation result"}
              value={result}
              onChangeText={setResult}
              placeholder="Enter translation"
              multiline
              style={{
                minHeight: 44,
                paddingHorizontal: 14,
                paddingTop: 12,
                paddingBottom: 4,
                borderWidth: 0,
                backgroundColor: "transparent",
                fontFamily: fonts.serif,
                fontSize: 21,
                lineHeight: 28,
              }}
            />
            {!!literal && literal !== result && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 6, gap: 2 }}>
                <Label muted style={{ fontSize: 12 }}>That is how it is usually said. Word for word it would be:</Label>
                <View style={s.row}>
                  <Label style={{ flex: 1 }}>{literal}</Label>
                  <Button small style={{ borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 6 }}
                    onPress={() => { const natural = result; setResult(literal); setLiteral(natural); }}>
                    Use this
                  </Button>
                </View>
              </View>
            )}
            <View style={[s.row, { paddingHorizontal: 8, paddingBottom: 6, gap: 2 }]}>
              <Button
                icon={Volume2}
                label="Listen to the translation"
                disabled={!result.trim()}
                style={iconButton}
                onPress={() => void audio.play("translator", result, target)}
              />
              <View style={{ flex: 1 }} />
              <Button
                small
                icon={ArrowUpRight}
                disabled={!result.trim()}
                style={{ borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 8 }}
                onPress={() => onInsert(result)}
              >
                Use in reply
              </Button>
              <Button
                icon={BookmarkPlus}
                label="Save phrase"
                disabled={busy || !result.trim()}
                style={iconButton}
                onPress={save}
              />
            </View>
          </View>
        )}
      </View>
      {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
    </Sheet>
  );
}

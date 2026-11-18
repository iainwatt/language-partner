import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
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
import { translate } from "../services/api";
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
    setManual(false);
  }
  async function lookup() {
    setIssue("");
    const token = ++version.current;
    setBusy(true);
    try {
      if (audio.owner === "translator") await audio.pause();
      const translated = await translate(
        text,
        source,
        target,
        conversation.messages.slice(-8),
        settings,
      );
      if (token === version.current) {
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
  return (
    <Sheet title="Translate" onClose={onClose} height="76%" compact>
      <View style={s.row}>
        <Label style={{ flex: 1, fontSize: 15, fontWeight: "500" }}>
          {languageName(source)}
        </Label>
        <Button
          icon={ArrowLeftRight}
          label="Swap translation languages"
          style={{ width: 44, paddingHorizontal: 10, borderWidth: 0, backgroundColor: "transparent" }}
          disabled={busy}
          onPress={() => {
            if (audio.owner === "translator") void audio.pause();
            const old = source;
            setSource(target);
            setTarget(old);
            edit(result || text);
          }}
        />
        <Label style={{ flex: 1, textAlign: "right", fontSize: 15, fontWeight: "500" }}>
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
        style={{ minHeight: 48, padding: 10, borderRadius: 14, fontSize: 16, lineHeight: 22 }}
      />
      <View style={s.row}>
        <Button
          icon={listening ? Square : Mic}
          label={listening ? "Finish speaking" : "Speak source"}
          style={{ borderRadius: 24, width: 48 }}
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
        <Button
          primary
          style={{ flex: 1, borderRadius: 24 }}
          disabled={!text.trim() || busy}
          onPress={lookup}
        >
          {busy ? "Translating…" : "Translate"}
        </Button>
      </View>
      {settings.mode === "demo" && (
        <Label muted style={{ fontSize: 12 }}>
          Demo phrasebook
        </Label>
      )}
      {(result || manual) && (
        <View
          style={[
            s.card,
            { backgroundColor: c.bubble, borderWidth: 0, paddingHorizontal: 12, paddingVertical: 4, gap: 0 },
          ]}
        >
          <View style={s.row}>
            <Text
              style={{ flex: 1, fontFamily: fonts.sans, color: c.muted, fontSize: 13 }}
            >
              {manual ? "Your translation" : languageName(target)}
            </Text>
            <Button
              small
              icon={Volume2}
              disabled={!result.trim()}
              style={{ backgroundColor: "transparent", borderWidth: 0, paddingHorizontal: 0 }}
              onPress={() => void audio.play("translator", result, target)}
            >
              Listen
            </Button>
          </View>
          <Field
            accessibilityLabel="Translation result"
            value={result}
            onChangeText={setResult}
            placeholder="Enter translation"
            multiline
            style={{
              backgroundColor: "transparent",
              fontFamily: fonts.serif,
              fontSize: 20,
              lineHeight: 27,
              borderWidth: 0,
              padding: 0,
              minHeight: 27,
            }}
          />
        </View>
      )}
      {!!result.trim() && (
        <>
          <View style={s.row}>
            <Button
              primary
              style={{ flex: 1, borderRadius: 24 }}
              icon={BookmarkPlus}
              disabled={busy}
              onPress={() => {
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
              }}
            >
              Save phrase
            </Button>
            <Button
              icon={ArrowUpRight}
              style={{ borderRadius: 24 }}
              onPress={() => onInsert(result)}
            >
              Use in reply
            </Button>
          </View>
        </>
      )}
      {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
    </Sheet>
  );
}

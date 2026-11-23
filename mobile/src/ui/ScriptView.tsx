import React, { useContext, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowUp, Mic, Pencil, Play, RotateCcw, Square, Trash2, Video, Volume2, X } from "lucide-react-native";
import { languageName, type SavedConversation } from "../core/domain";
import { paragraphs, scriptCases, scriptPieces, scriptText, withoutStress } from "../core/script";
import { audio } from "../services/nativeAudio";
import { Button, c, fonts, Label, s, SheetFooter } from "./components";

// One colour per case. Words from the learner's dictionary are bold, and those
// saved in this conversation are highlighted too; both can sit on a case colour.
const caseColours: Record<string, string> = {
  gen: "#A8443D",
  dat: "#2F6F8F",
  acc: "#3E7D4E",
  ins: "#7A4E9E",
  pre: "#B5651D",
};

// Looks up a word or sentence from the script: `sentence` is where it came from.
export type ScriptLookup = (text: string, sentence: string) => Promise<string | undefined>;

export function ScriptView({ script, language, onTranslate }: { script: string; language: string; onTranslate?: ScriptLookup }) {
  const { pieces, sentences } = scriptPieces(script);
  const used = new Set(pieces.flatMap((piece) => piece.marks));
  const cases = (scriptCases[language] ?? []).filter((item) => used.has(item.mark));
  // The word the learner tapped, and whether they widened it to its sentence.
  const [picked, setPicked] = useState<{ word: number; sentence: number; whole: boolean } | null>(null);
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  // Scripts from the short time stress marks were on are shown without them.
  const shown = withoutStress;
  // A word can be several pieces: its stem, then its coloured ending.
  const pickedWord = picked ? pieces.filter((piece) => piece.word === picked.word).map((piece) => piece.text).join("") : "";
  // Accents are for the eye: translation and speech get the plain spelling.
  const marked = !picked || !pickedWord ? "" : picked.whole ? sentences[picked.sentence] : pickedWord;
  const text = withoutStress(marked);
  useEffect(() => { setPicked(null); }, [script]);
  useEffect(() => {
    if (!text || !onTranslate || text in meanings) return;
    let current = true;
    onTranslate(text, withoutStress(sentences[picked!.sentence]))
      .then((meaning) => { if (current) setMeanings((old) => ({ ...old, [text]: meaning?.trim() || "No translation found." })); })
      .catch((error) => { if (current) setMeanings((old) => ({ ...old, [text]: `Could not translate: ${error.message ?? String(error)}` })); });
    return () => { current = false; };
  }, [text]);
  // The meaning is pinned to the bottom of the sheet, so it is on screen
  // wherever in a long script the tapped word is.
  const setFooter = useContext(SheetFooter);
  const meaning = meanings[text];
  useEffect(() => {
    setFooter(text ? (
        <View style={styles.lookup}>
          <View style={s.row}>
            <Text selectable style={[styles.lookupText, { flex: 1 }]}>{shown(marked)}</Text>
            <Button icon={Volume2} label={`Listen to ${picked!.whole ? "this sentence" : text}`}
              style={{ width: 40, minHeight: 40, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: "transparent" }}
              onPress={() => void audio.play("chat", text, language)} />
          </View>
          {onTranslate && <Label muted={!meaning}>{meaning ?? "Translating…"}</Label>}
          <View style={s.wrap}>
            <Button small onPress={() => setPicked({ ...picked!, whole: !picked!.whole })}>
              {picked!.whole ? "Just the word" : "Whole sentence"}
            </Button>
            <Button small onPress={() => setPicked(null)}>Close</Button>
          </View>
        </View>
    ) : null);
  }, [text, meaning, picked?.whole]);
  useEffect(() => () => setFooter(null), []);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.script}>
        {pieces.map((piece, index) => {
          const colour = piece.marks.map((mark) => caseColours[mark]).find(Boolean);
          const chosen = !!picked && (picked.whole ? piece.sentence === picked.sentence : piece.word === picked.word);
          return (
            <Text
              key={index}
              accessibilityRole={piece.word === undefined ? undefined : "button"}
              onPress={piece.word === undefined ? undefined : () => {
                void audio.pause();
                setPicked(picked && picked.word === piece.word && !picked.whole ? null : { word: piece.word!, sentence: piece.sentence, whole: false });
              }}
              style={[
                colour && { color: colour },
                piece.marks.includes("s") && styles.saved,
                piece.marks.includes("d") && styles.dictionary,
                chosen && styles.picked,
              ]}
            >
              {shown(piece.text)}
            </Text>
          );
        })}
      </Text>
      {(
        <Label muted style={{ fontSize: 12 }}>Tap a word to translate it and hear it.</Label>
      )}
      {used.size > 0 && (
        <View accessible accessibilityLabel="Colour key" style={styles.legend}>
          {used.has("s") && <Text style={[styles.key, styles.saved]}>Saved in this conversation</Text>}
          {used.has("d") && <Text style={[styles.key, styles.dictionary]}>From your dictionary</Text>}
          {cases.map((item) => (
            <Text key={item.mark} style={[styles.key, { color: caseColours[item.mark] }]}>
              {item.name}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  script: { color: c.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 30 },
  saved: { backgroundColor: c.yellow, fontWeight: "700" },
  dictionary: { fontWeight: "700" },
  paragraph: { paddingVertical: 6, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: 10 },
  selected: { backgroundColor: c.pale },
  changeBox: { padding: 8, paddingLeft: 12, gap: 2, borderRadius: 18, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper },
  changeInput: { minHeight: 40, maxHeight: 110, paddingVertical: 6, color: c.ink, fontFamily: fonts.sans, fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  picked: { backgroundColor: c.bubble, textDecorationLine: "underline" },
  lookup: { padding: 12, gap: 6, borderRadius: 14, backgroundColor: c.bubble },
  lookupText: { color: c.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 26 },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
  key: { color: c.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18 },
});

// The script card in a saved conversation. Step one shows the outline in the
// learner's own language and takes their changes; step two shows the script.
// How the learner changes the summary: start again (no argument), ask for a
// change to the whole piece or to one paragraph, or take a paragraph out.
export type OutlineChange = (change?: { feedback: string; paragraph?: number } | { remove: number }) => Promise<void>;
// A compact box for saying or typing a change: the text, with the microphone
// and send button inside it, and an optional remove button on the left.
function ChangeBox({ native, placeholder, busy, sendLabel, onSend, onRemove }: {
  native: string;
  placeholder: string;
  busy: boolean;
  sendLabel: string;
  onSend: (text: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const [text, setValue] = useState("");
  // The newest text, including words dictation delivers as it is being stopped.
  const latest = useRef("");
  const setText = (value: string) => { latest.current = value; setValue(value); };
  const [recording, setRecording] = useState(false);
  const [issue, setIssue] = useState("");
  useEffect(() => {
    const unsubscribe = audio.subscribe(() =>
      setRecording(audio.owner === "feedback" && ["listening", "connecting"].includes(audio.state)));
    return () => { unsubscribe(); if (audio.owner === "feedback") void audio.stop(); };
  }, []);
  const run = (action: () => Promise<void>, after?: () => void) => {
    setIssue("");
    void audio.pause();
    action().then(after).catch((error) => setIssue(error.message ?? String(error)));
  };
  async function dictate() {
    if (recording) return audio.pause();
    const prefix = text.trim();
    await audio.listen("feedback", native, (spoken) => setText(`${prefix}${prefix ? " " : ""}${spoken}`.slice(0, 2000)));
  }
  // Sending while dictating stops the dictation first, then sends what was said.
  async function send() {
    if (recording) {
      await audio.pause();
      // The recogniser's last words can arrive just after it stops.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const said = latest.current.trim();
    if (said) await onSend(said);
  }
  const icon = { width: 38, minHeight: 38, paddingHorizontal: 0, paddingVertical: 0, borderRadius: 19 } as const;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.changeBox}>
        <TextInput
          accessibilityLabel={placeholder}
          multiline
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          selectionColor={c.accentText}
          value={text}
          maxLength={2000}
          editable={!busy && !recording}
          onChangeText={setText}
          style={styles.changeInput}
        />
        <View style={[s.row, { gap: 6 }]}>
          {onRemove && (
            <Button small danger icon={Trash2} disabled={busy} style={{ borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 4 }}
              onPress={() => run(onRemove)}>
              Remove paragraph
            </Button>
          )}
          <View style={{ flex: 1 }} />
          <Button icon={recording ? Square : Mic} disabled={busy}
            label={recording ? "Stop dictation" : `Speak your changes in ${languageName(native)}`}
            style={[icon, { borderWidth: 0, backgroundColor: "transparent" }]}
            onPress={() => void dictate().catch((error) => setIssue(error.message))} />
          <Button primary icon={ArrowUp} label={busy ? "Changing…" : sendLabel} disabled={busy || !text.trim()}
            style={icon} onPress={() => run(send, () => setText(""))} />
        </View>
      </View>
      {busy && <Label muted style={{ fontSize: 12 }}>Changing…</Label>}
      {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
    </View>
  );
}

export function ScriptCard({ context, step, chatMovedOn, canRestart, onOutline, onScript, onTranslate, onPractise, onRecord, onRead }: {
  context: SavedConversation;
  step: "outline" | "script" | null;
  chatMovedOn: boolean;
  canRestart: boolean;
  onOutline?: OutlineChange;
  onScript?: () => Promise<void>;
  onTranslate?: ScriptLookup;
  // Opens the full-screen practice view for this script.
  onPractise: (script: string) => void;
  // Opens the camera with the script as a small prompt, to record a video.
  onRecord: (script: string) => void;
  // Opens a live reading: read from start to finish, transcribed and logged.
  onRead: (script: string) => void;
}) {
  // The paragraph the learner tapped; changes then apply to it alone.
  const [selected, setSelected] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [issue, setIssue] = useState("");
  const setFooter = useContext(SheetFooter);
  const busy = !!step;
  const showScript = !!context.script && !reviewing;
  const parts = paragraphs(context.outline ?? "");
  const canChange = !!context.outline && !showScript && !!onOutline;
  // With a paragraph selected, its controls are pinned to the bottom of the
  // sheet, so they are on screen wherever that paragraph is.
  useEffect(() => {
    if (!canChange || selected === null || selected >= parts.length) return;
    setFooter(
      <View style={{ gap: 6 }}>
        <View style={s.row}>
          <Label muted style={{ flex: 1, fontSize: 12 }}>Changing the highlighted paragraph</Label>
          <Button small icon={X} label="Stop changing this paragraph" disabled={busy}
            style={{ minHeight: 28, width: 32, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 0, backgroundColor: "transparent" }}
            onPress={() => setSelected(null)} />
        </View>
        <ChangeBox
          key={selected}
          native={context.native}
          placeholder="What should change in this paragraph?"
          busy={busy}
          sendLabel="Change this paragraph"
          onSend={(feedback) => onOutline!({ feedback, paragraph: selected })}
          onRemove={parts.length > 1 ? () => onOutline!({ remove: selected }).then(() => setSelected(null)) : undefined}
        />
      </View>,
    );
    return () => setFooter(null);
  }, [canChange, selected, busy, parts.length, context.outline]);
  if (!context.outline && !step) return null;
  const run = (action: () => Promise<void>, after?: () => void) => {
    setIssue("");
    void audio.pause();
    action().then(after).catch((error) => setIssue(error.message ?? String(error)));
  };
  return (
    <View style={[s.card, { gap: 12 }]}>
      <Text style={s.eyebrow}>{showScript ? "Your script · read it aloud" : "Your script · step 1 of 2"}</Text>
      {!context.outline ? (
        <Label muted>Gathering what you said in this conversation…</Label>
      ) : showScript ? (
        <>
          <ScriptView script={context.script!} language={context.target} onTranslate={onTranslate} />
          <View style={s.row}>
            <Button primary icon={Play} style={{ flex: 1 }} onPress={() => { void audio.pause(); onPractise(context.script!); }}>Practise</Button>
            <Button icon={Video} style={{ flex: 1 }} onPress={() => { void audio.pause(); onRecord(context.script!); }}>Record</Button>
          </View>
          <Button icon={Mic} onPress={() => { void audio.pause(); onRead(context.script!); }}>Live reading</Button>
          <View style={s.wrap}>
            <Button small icon={Volume2} onPress={() => void audio.play("chat", scriptText(context.script!), context.target)}>Listen</Button>
            {onScript && <Button small icon={RotateCcw} disabled={busy} onPress={() => run(onScript)}>{step === "script" ? "Rewriting…" : "Rewrite"}</Button>}
            {onOutline && <Button small icon={Pencil} disabled={busy} onPress={() => setReviewing(true)}>Change what it says</Button>}
          </View>
        </>
      ) : (
        <>
          <Label muted>This is what you said, in {languageName(context.native)}. Check it before it is written in {languageName(context.target)}. Tap a paragraph to change just that one.</Label>
          <View>
            {parts.map((part, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityState={{ selected: selected === index }}
                accessibilityHint="Selects this paragraph so your changes apply to it alone"
                disabled={busy || !onOutline}
                onPress={() => setSelected(selected === index ? null : index)}
                style={[styles.paragraph, selected === index && styles.selected]}
              >
                <Label style={{ fontSize: 16, lineHeight: 24 }}>{part}</Label>
              </Pressable>
            ))}
          </View>
          {onOutline && selected === null && (
            <ChangeBox
              native={context.native}
              placeholder="Change the whole piece: put the part about work first, leave out the weather…"
              busy={step === "outline"}
              sendLabel="Make these changes"
              onSend={(feedback) => onOutline({ feedback })}
            />
          )}
          {onOutline && canRestart && (
            <Button small icon={RotateCcw} disabled={busy} onPress={() => run(() => onOutline(), () => setSelected(null))}>
              {chatMovedOn ? "Start again from the latest chat" : "Start again from the chat"}
            </Button>
          )}
          {onScript && (
            <Button primary disabled={busy} onPress={() => run(onScript, () => setReviewing(false))}>
              {step === "script" ? `Writing it in ${languageName(context.target)}…` : `Looks right · write my script`}
            </Button>
          )}
          {!!context.script && <Button small disabled={busy} onPress={() => setReviewing(false)}>Back to my script</Button>}
        </>
      )}
      {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
    </View>
  );
}

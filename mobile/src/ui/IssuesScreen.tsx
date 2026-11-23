import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Mic, Plus, Square } from "lucide-react-native";
import { languageName } from "../core/domain";
import type { Issue } from "../core/issues";
import { audio } from "../services/nativeAudio";
import { Button, c, Field, Label, s, Sheet } from "./components";
import { DisplayText } from "./DisplayText";

// The learner's own list of things to work on, shown like saved conversations.
export function IssuesScreen({ issues, ready, account, language, pageTitleStyle, onSignIn, onAdd, onOpen }: {
  issues: Issue[];
  ready: boolean;
  account: boolean;
  language: string;
  pageTitleStyle: object;
  onSignIn: () => void;
  onAdd: () => void;
  onOpen: (issue: Issue) => void;
}) {
  return (
    <>
      <DisplayText style={pageTitleStyle}>Things to work on.</DisplayText>
      <Label muted>
        Note anything in {languageName(language)} you keep getting wrong or want to practise. Say it in your own words.
      </Label>
      {account ? (
        <Button primary icon={Plus} onPress={onAdd}>Add something to work on</Button>
      ) : (
        <Button primary onPress={onSignIn}>Sign in to keep a list</Button>
      )}
      {account && !ready && <Label muted>Loading your list…</Label>}
      {ready && !issues.length && <Label muted>Nothing here yet. Add the first thing you’d like to get right.</Label>}
      {issues.map((issue) => (
        <View key={issue.id} style={s.card}>
          <Label style={{ fontSize: 16, lineHeight: 24 }}>{issue.text}</Label>
          <Label muted>Added {new Date(issue.createdAt).toLocaleDateString()}</Label>
          <Button onPress={() => onOpen(issue)}>Edit</Button>
        </View>
      ))}
    </>
  );
}

// Add or edit one item by typing or dictating in the learner's own language.
export function IssueSheet({ issue, native, onSave, onDelete, onClose }: {
  issue?: Issue;
  native: string;
  onSave: (text: string) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [text, setText] = useState(issue?.text ?? "");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const unsubscribe = audio.subscribe(() => {
      setRecording(audio.owner === "feedback" && ["listening", "connecting"].includes(audio.state));
      if (audio.owner === "feedback" && audio.error) setNotice(audio.error);
    });
    return () => { unsubscribe(); if (audio.owner === "feedback") void audio.stop(); };
  }, []);
  async function dictate() {
    setNotice("");
    if (recording) return audio.pause();
    const prefix = text.trim();
    await audio.listen("feedback", native, (spoken) => setText(`${prefix}${prefix ? " " : ""}${spoken}`.slice(0, 2000)));
  }
  async function finish(action: () => Promise<unknown>) {
    setBusy(true); setNotice("");
    try {
      await audio.pause();
      await action();
      onClose();
    } catch (error: any) {
      setNotice(error.message ?? "Could not save. Your text is still here; please try again.");
      setBusy(false);
    }
  }
  return (
    <Sheet title={issue ? "Edit" : "Something to work on"} onClose={() => { if (!busy) onClose(); }} height="80%" compact>
      <Field
        accessibilityLabel="What you want to work on"
        multiline
        autoFocus={!issue}
        placeholder="For example: when to use от… до… and when с… по…"
        value={text}
        maxLength={2000}
        editable={!busy && !recording}
        onChangeText={setText}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />
      <View style={s.row}>
        <Button icon={recording ? Square : Mic} disabled={busy} label={recording ? "Stop dictation" : `Speak in ${languageName(native)}`}
          style={{ width: 48, borderRadius: 24 }} onPress={() => void dictate().catch((error) => setNotice(error.message))} />
        <Button primary style={{ flex: 1, borderRadius: 24 }} disabled={busy || recording || !text.trim()} onPress={() => void finish(() => onSave(text))}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </View>
      {onDelete && <Button small danger disabled={busy} onPress={() => void finish(onDelete)}>Delete</Button>}
      {!!notice && <Label style={{ color: c.danger }}>{notice}</Label>}
    </Sheet>
  );
}

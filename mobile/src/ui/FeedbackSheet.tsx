import React, { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { Mic, Square } from "lucide-react-native";
import Constants from "expo-constants";
import { id, languages } from "../core/domain";
import type { FeedbackRequest } from "../core/feedback";
import { audio } from "../services/nativeAudio";
import { submitFeedback } from "../services/feedback";
import { Button, Field, Label, Sheet, c } from "./components";

export function FeedbackSheet({ native, target, screen, draft, onDraft, onClose, language, onLanguage }: {
  native: string; target: string; screen: FeedbackRequest["screen"];
  draft: string; onDraft: (value: string) => void; onClose: () => void;
  language: string; onLanguage: (value: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  const attempt = useRef({ fingerprint: "", id: "" });
  useEffect(() => {
    const unsubscribe = audio.subscribe(() => {
      setRecording(audio.owner === "feedback" && ["listening", "connecting"].includes(audio.state));
      if (audio.owner === "feedback" && audio.error) setNotice(audio.error);
    });
    return () => { unsubscribe(); if (audio.owner === "feedback") void audio.stop(); };
  }, []);
  async function capture() {
    setNotice("");
    if (recording) { await audio.pause(); return; }
    const prefix = draft.trim();
    await audio.listen("feedback", language, (text) => onDraft(`${prefix}${prefix ? " " : ""}${text}`.slice(0, 6000)));
  }
  async function send() {
    if (busy || saved) return;
    setBusy(true); setNotice("");
    try {
      await audio.pause();
      const value = { transcript: draft, language, targetLanguage: target, screen,
        appVersion: Constants.expoConfig?.version ?? "1.0.0",
        buildNumber: String(Platform.OS === "ios" ? Constants.platform?.ios?.buildNumber ?? "unknown" : Constants.expoConfig?.android?.versionCode ?? "unknown"),
        platform: ["ios", "android", "web"].includes(Platform.OS) ? Platform.OS : "unknown" };
      const fingerprint = JSON.stringify(value);
      if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: id() };
      await submitFeedback({ ...value, id: attempt.current.id } as FeedbackRequest);
      setSaved(true); onDraft("");
    } catch (error: any) { setNotice(error.message ?? "Could not send feedback. Your transcript is still here; please try again."); }
    finally { setBusy(false); }
  }
  return <Sheet title="Send feedback" onClose={() => { if (!busy) { void audio.stop(); onClose(); } }} height="92%">
    {saved ? <>
      <Label>Thank you. Your feedback has been saved for Iain to review.</Label>
      <Button primary onPress={onClose}>Done</Button>
    </> : <>
      <Label>Tell us what worked, what felt confusing, or what you’d change. Small observations are useful too.</Label>
      <Label muted>Speak in your native language or type below. Check the transcript before sending. We save text only, never an audio recording, and translate it into English for review.</Label>
      <Label muted>Feedback language</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {languages.map(item => <Button small key={item.code} primary={language === item.code} disabled={busy || recording} onPress={() => onLanguage(item.code)}>{item.name}</Button>)}
      </View>
      <Field accessibilityLabel="Feedback transcript" multiline placeholder="Your feedback…" value={draft} maxLength={6000} editable={!busy && !recording} onChangeText={onDraft} style={{ minHeight: 140, textAlignVertical: "top" }}/>
      <Label muted>{draft.length}/6000 characters · No conversation transcript is attached.</Label>
      <Button icon={recording ? Square : Mic} disabled={busy} onPress={() => void capture().catch(error => setNotice(error.message))}>{recording ? "Stop dictation" : "Speak feedback"}</Button>
      <Button primary disabled={busy || recording || !draft.trim()} onPress={() => void send()}>{busy ? "Sending…" : "Submit feedback"}</Button>
      {!!notice && <Label style={{ color: c.danger }}>{notice}</Label>}
    </>}
  </Sheet>;
}

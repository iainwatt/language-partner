import React, { useState } from "react";
import { Text, View } from "react-native";
import {
  BookOpen,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Volume2,
} from "lucide-react-native";
import {
  languageName,
  type Entry,
  type SavedConversation,
} from "../core/domain";
import { contextEntries } from "../core/practiceContext";
import { audio } from "../services/nativeAudio";
import { Button, c, Field, Label, s, Sheet } from "./components";
import { EntryExample } from "./EntryExample";

export function SavedConversationSheet({
  context,
  entries,
  isNew,
  summaryLanguage,
  canSummarize,
  lastMessageId,
  onClose,
  onSave,
  onSummarize,
  onPractice,
  onReview,
  onOriginal,
  onLink,
}: {
  context: SavedConversation;
  entries: Entry[];
  isNew: boolean;
  summaryLanguage: string;
  canSummarize: boolean;
  lastMessageId?: string;
  onClose: () => void;
  onSave: (value: SavedConversation) => Promise<void>;
  onSummarize: (previous: string) => Promise<string>;
  onPractice: () => Promise<void>;
  onReview: () => void;
  onOriginal?: () => void;
  onLink: (entry: Entry) => Promise<void>;
}) {
  const [draft, setDraft] = useState(context);
  const [editing, setEditing] = useState(isNew);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState("");
  const words = contextEntries(entries, context.id);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setIssue("");
    try {
      await action();
    } catch (error: any) {
      setIssue(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      displayTitle={!adding && !editing}
      title={
        adding
          ? "Add saved words"
          : editing
            ? "Conversation details"
            : context.title
      }
      subtitle={
        adding
          ? "Choose words from your dictionary to practise in this conversation."
          : undefined
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      height="90%"
    >
      {adding ? (
        <>
          <Field
            accessibilityLabel="Find saved words"
            placeholder="Find a word or meaning…"
            value={search}
            onChangeText={setSearch}
          />
          {entries
            .filter(
              (entry) =>
                entry.native === context.native &&
                entry.target === context.target &&
                `${entry.phrase} ${entry.meaning}`
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
            )
            .map((entry) => {
              const linked = entry.conversationIds.includes(context.id);
              return (
                <View key={entry.id} style={[s.card, s.row]}>
                  <View style={{ flex: 1 }}>
                    <Label>{entry.phrase}</Label>
                    <Label muted>{entry.meaning}</Label>
                  </View>
                  <Button
                    small
                    icon={linked ? Check : Plus}
                    label={
                      linked ? `Added ${entry.phrase}` : `Add ${entry.phrase}`
                    }
                    disabled={busy || linked}
                    onPress={() => void run(() => onLink(entry))}
                  />
                </View>
              );
            })}
          <Button disabled={busy} onPress={() => setAdding(false)}>
            Done
          </Button>
        </>
      ) : editing ? (
        <>
          <Label muted>
            Give this conversation a topic you would like to revisit.
          </Label>
          <Label>Title</Label>
          <Field
            accessibilityLabel="Conversation title"
            editable={!busy}
            placeholder="What makes a good employee?"
            maxLength={160}
            value={draft.title}
            onChangeText={(title) => setDraft({ ...draft, title })}
          />
          <Label>Description · optional</Label>
          <Field
            accessibilityLabel="Conversation description"
            editable={!busy}
            placeholder="What would you like to talk about or practise?"
            multiline
            maxLength={2000}
            value={draft.description}
            onChangeText={(description) => setDraft({ ...draft, description })}
          />
          <Label>Summary in {languageName(summaryLanguage)} · optional</Label>
          <Field
            accessibilityLabel="Conversation summary"
            editable={!busy}
            placeholder="We discussed…"
            multiline
            maxLength={6000}
            value={draft.summary}
            onChangeText={(summary) =>
              setDraft({
                ...draft,
                summary,
                summarySourceMessageId: lastMessageId ?? "",
              })
            }
          />
          {canSummarize && (
            <Button
              small
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  const summary = await onSummarize(draft.summary);
                  setDraft({
                    ...draft,
                    summary,
                    summarySourceMessageId: lastMessageId ?? "",
                  });
                })
              }
            >
              {busy ? "Preparing…" : "Write summary from chat"}
            </Button>
          )}
          <Button
            primary
            disabled={busy || !draft.title.trim()}
            onPress={() =>
              void run(async () => {
                await onSave({
                  ...draft,
                  title: draft.title.trim(),
                  updatedAt: new Date().toISOString(),
                });
                setEditing(false);
              })
            }
          >
            {busy ? "Saving…" : "Save conversation"}
          </Button>
          {!isNew && (
            <Button disabled={busy} onPress={() => setEditing(false)}>
              Cancel changes
            </Button>
          )}
        </>
      ) : (
        <>
          {!!context.description && <Label>{context.description}</Label>}
          <Text style={s.eyebrow}>Our last conversation</Text>
          <Label muted>
            {context.summary ||
              "A short recap will be prepared from your chat when you practise again. You can also write your own summary."}
          </Label>
          <Button
            primary
            icon={RotateCcw}
            disabled={busy}
            onPress={() => void run(onPractice)}
          >
            {busy ? "Preparing your recap…" : "Practise again"}
          </Button>
          <Label muted>
            You’ll see the recap and meanings in {languageName(context.native)},
            with the {languageName(context.target)} answers hidden.
          </Label>
          <View style={s.row}>
            <Text style={[s.eyebrow, { flex: 1 }]}>
              {words.length} saved {words.length === 1 ? "phrase" : "phrases"}
            </Text>
            <Button
              small
              icon={Plus}
              disabled={busy}
              onPress={() => setAdding(true)}
            >
              Add words
            </Button>
          </View>
          {!words.length && (
            <Label muted>
              Words saved during this conversation will appear here. You can
              also add words already in your dictionary.
            </Label>
          )}
          {words.map((entry) => (
            <View key={entry.id} style={[s.card, s.row]}>
              <View style={{ flex: 1 }}>
                <Label>{entry.phrase}</Label>
                <Label muted>{entry.meaning}</Label>
                <EntryExample entry={entry} />
              </View>
              <Button
                small
                icon={Volume2}
                label={`Pronounce ${entry.phrase}`}
                onPress={() =>
                  void audio.play("chat", entry.phrase, entry.target)
                }
              />
            </View>
          ))}
          {!!words.length && (
            <Button icon={BookOpen} disabled={busy} onPress={onReview}>
              Review these words
            </Button>
          )}
          {onOriginal && (
            <Button disabled={busy} onPress={onOriginal}>
              Open original chat
            </Button>
          )}
          <Button
            icon={Pencil}
            disabled={busy}
            onPress={() => {
              setDraft(context);
              setEditing(true);
            }}
          >
            Edit details
          </Button>
        </>
      )}
      {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
    </Sheet>
  );
}

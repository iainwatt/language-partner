import { googleSignInConfigured, signInWithGoogle } from "./src/services/googleSignIn";
import { FeedbackSheet } from "./src/ui/FeedbackSheet";
import { managedSettings } from "./src/core/managedAi";
import { makeRoleplayConversation, type RoleplayScenario } from "./src/core/roleplay";
import { RoleplayScreen, RoleplayBrief } from "./src/ui/RoleplayScreen";
import { GrammarPracticeCard } from "./src/ui/GrammarReminderSheet";
import { languageView, startLanguageConversation } from "./src/core/conversations";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowUp,
  BookOpen,
  Check,
  BookmarkPlus,
  Languages,
  Leaf,
  MessagesSquare,
  Mic,
  Pause,
  RotateCcw,
  Search,
  Settings2,
  Square,
  Trash2,
  Play,
  Volume2,
  X,
} from "lucide-react-native";
import {
  duplicateKey,
  id,
  languageName,
  languages,
  localDay,
  linkEntry,
  makeConversation,
  markReviewed,
  unreviewed,
  translatesReplies,
  review,
  saveEntry,
  type Entry,
  type Conversation,
  type DictionaryInput,
  type Grade,
  type Message,
  type Snapshot,
  type SavedConversation,
} from "./src/core/domain";
import {
  bundledGrammarTopics,
  makeGrammarConversation,
  type GrammarTopic,
} from "./src/core/grammar";
import { addTalkTime, assignEarlierTalkTime } from "./src/core/stats";
import { grammarAccentRanges } from "./src/core/grammarAccent";
import { audio } from "./src/services/nativeAudio";
import {
  reply,
  replyWithCorrections,
  summarizeConversation,
  translate,
  reviewPhrase,
  conversationOutline,
  conversationScript,
  scriptMeanings,
  scriptRests,
} from "./src/services/api";
import { AuthProvider, useAuth, signOut } from "./src/services/auth";
import { emulatorHost } from "./src/services/firebase";
import { AuthScreen } from "./src/ui/AuthScreen";
import { useWorkspace } from "./src/services/workspace";
import { Button, c, Field, fonts, Label, s, Sheet } from "./src/ui/components";
import { SelectionSheet } from "./src/ui/SelectionSheet";
import { SelectableMessage } from "./src/ui/SelectableMessage";
import type { PhraseRange } from "./src/core/selection";
import { TranslateSheet } from "./src/ui/TranslateSheet";
import { IssueSheet, IssuesScreen } from "./src/ui/IssuesScreen";
import { useIssues } from "./src/services/issues";
import { editIssue, issuesFor, newIssue, type Issue } from "./src/core/issues";
import { paragraphs, replaceParagraph, scriptText } from "./src/core/script";
import { defaultReadingSpeed, meaningKey, restKey } from "./src/core/practice";
import { PracticeScreen } from "./src/ui/PracticeScreen";
import { VideoScreen, VideosScreen } from "./src/ui/VideoScreen";
import { removeVideo, useAdmin, useVideos } from "./src/services/videos";
import { addedToday, linksPerDay, linkVideoEntries, makeVideoConversation, savedFromLink, videoContext, videoContextId, videoPractice, youtubeId, type Video } from "./src/core/videos";
import { RecordScreen } from "./src/ui/RecordScreen";
import { ReadingScreen, type ReadingSource } from "./src/ui/ReadingScreen";
import { saveReading, useReadings } from "./src/services/readings";
import { removeMyVideo, requestTranscript, saveMyVideo, useMyVideos, videoDetails } from "./src/services/myVideos";
import { NavigationDrawer } from "./src/ui/NavigationDrawer";
import {
  conversationTitle,
  recentConversations,
} from "./src/core/conversations";
import {
  contextId,
  contextEntries,
  draftConversationContext,
  makePracticeConversation,
  practiceContext,
  saveConversationContext,
} from "./src/core/practiceContext";
import { SavedConversationSheet } from "./src/ui/SavedConversationSheet";
import { PracticeIntroduction } from "./src/ui/PracticeIntroduction";
import { EntryExample } from "./src/ui/EntryExample";
import { SavedDataNotice } from "./src/ui/SavedDataNotice";
import { ConversationLexiconSheet } from "./src/ui/ConversationLexiconSheet";
import { GrammarReminderSheet } from "./src/ui/GrammarReminderSheet";
import { GrammarScreen } from "./src/ui/GrammarScreen";
import { LevelCard, PracticeOverview, TalkTimeOverview } from "./src/ui/TalkTimeOverview";
import { logActivity, useActivity } from "./src/services/activity";
import { watchGrammarTopics } from "./src/services/grammar";
import { usePartnerUsage } from "./src/services/usePartnerUsage";
import { DisplayText, DisplayTypography } from "./src/ui/DisplayText";
import { AppHeader } from "./src/ui/AppHeader";
import { DictionaryEntryCard } from "./src/ui/DictionaryEntryCard";
import { SettingsScreen } from "./src/ui/SettingsScreen";
import { SettingsPage, SettingsSection } from "./src/ui/SettingsPage";
import { PaywallScreen } from "./src/ui/PaywallScreen";
import { useConversationAccess } from "./src/services/useConversationAccess";
import { inactiveAccess } from "./src/core/conversationAccess";
import { isPaywallError } from "./src/services/conversationAccess";

type Tab =
  | "chat"
  | "dictionary"
  | "practice"
  | "conversations"
  | "grammar"
  | "roleplay"
  | "issues"
  | "videos"
  | "stats";
type Panel =
  | "translate"
  | "feedback"
  | "lexicon"
  | "grammarReminder"
  | "settings"
  | "account"
  | "conversation"
  | null;
const TALK_TIME_SAVE_INTERVAL_MS = 30000;
export default function App() {
  return (
    <SafeAreaProvider>
      <DisplayTypography>
        <AuthProvider>
          <AccountGate />
        </AuthProvider>
      </DisplayTypography>
    </SafeAreaProvider>
  );
}
function AccountGate() {
  const { user, guest, loading } = useAuth();
  if (loading)
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={c.accent} />
        <Label>Restoring your account…</Label>
      </SafeAreaView>
    );
  if ((user && !user.emailVerified) || (!user && !guest)) return <AuthScreen />;
  return <LanguagePartner key={user?.uid ?? "guest"} />;
}
// The reply is spoken first, then the corrections shown beneath it.
const spokenMessage = (text: string, corrections?: string) =>
  corrections ? `${text}\n\n${corrections}` : text;
function LanguagePartner() {
  const [notice, setNotice] = useState("");
  const report = useCallback((message: string) => setNotice(message), []);
  const {
    data: workspaceData,
    mutate,
    dictionaryReady,
    dictionaryConnected,
    contextsReady,
    savedDataConnected,
  } = useWorkspace(report);
  // Screens only see the language being practised; mutate still receives everything.
  const data = useMemo(() => workspaceData && languageView(workspaceData), [workspaceData]);
  const { user: account, setGuest } = useAuth();
  const issues = useIssues(account?.uid, report);
  const readings = useReadings(account?.uid, report);
  const activity = useActivity(account?.uid, report);
  const [liveReading, setLiveReading] = useState<ReadingSource | null>(null);
  const [watching, setWatching] = useState<Video | null>(null);
  const [restartingVideo, setRestartingVideo] = useState(false);
  const videoPhrases = useMemo(
    () => (watching && data ? data.entries.filter((entry) => entry.target === watching.language).map((entry) => entry.phrase) : []),
    [watching, data],
  );
  const [scriptBusy, setScriptBusy] = useState<{ id: string; step: "outline" | "script" } | null>(null);
  // The script being practised full screen, or recorded with the camera.
  const [rehearsal, setRehearsal] = useState<{ script: string; record: boolean; contextId?: string } | null>(null);
  // Meanings found during this session, in case saving them with the script fails.
  const [foundMeanings, setFoundMeanings] = useState<Record<string, string>>({});
  // What the saved words in the script being rehearsed mean: the learner's own
  // dictionary first, then meanings worked out for the forms the script uses.
  const rehearsalMeanings = useMemo(() => {
    if ((!rehearsal && !liveReading) || !data) return {};
    const contextId = rehearsal?.contextId ?? (liveReading?.kind === "lesson" ? liveReading.id : undefined);
    const context = data.savedConversations.find((item) => item.id === contextId);
    return {
      ...foundMeanings,
      ...Object.fromEntries((context?.scriptMeanings ?? []).map((item) => [meaningKey(item.text), item.meaning])),
      ...Object.fromEntries(data.entries.map((entry) => [meaningKey(entry.phrase), entry.meaning])),
    };
  }, [rehearsal, liveReading, data, foundMeanings]);
  const [bulkReview, setBulkReview] = useState<{ done: number; found: number; total: number } | null>(null);
  const stopBulkReview = useRef(false);
  const latestSaved = useRef<SavedConversation[]>([]);
  latestSaved.current = data?.savedConversations ?? [];
  const [issueSheet, setIssueSheet] = useState<Issue | "new" | null>(null);
  const [tab, setTab] = useState<Tab>("chat");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [languageChoice, setLanguageChoice] = useState({ native: "en-US", target: "ru-RU" });
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const [composer, setComposer] = useState("");
  const [feedbackDraft, setFeedbackDraft] = useState("");
  const [feedbackLanguage, setFeedbackLanguage] = useState("en-US");
  const composerRef = useRef("");
  const [selection, setSelection] = useState<{
    message: Message;
    range: PhraseRange;
  } | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [contextSheet, setContextSheet] = useState<SavedConversation | null>(
    null,
  );
  const [reviewContextId, setReviewContextId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [audioState, setAudioState] = useState(audio.state);
  const [search, setSearch] = useState("");
  const [reveal, setReveal] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [day, setDay] = useState(localDay());
  const [grammarTopics, setGrammarTopics] = useState<GrammarTopic[]>([]);
  const [grammarReady, setGrammarReady] = useState(false);
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  const [unsavedTalkMs, setUnsavedTalkMs] = useState(0);
  const transcript = useRef<ScrollView>(null);
  const preserveTranscriptPosition = useRef(false);
  const talkStartedAt = useRef<number | null>(null);
  const pendingTalkMs = useRef(0);
  const spoke = useRef(false);
  const [deleteId, setDeleteId] = useState("");
  const hasConversation = !!data?.conversations.find((chat) => chat.id === data.activeConversationId)?.messages.length;
  const practising = !!account && data?.settings.mode === "api" && hasConversation &&
    tab === "chat" && appActive && !paywallOpen && !drawerOpen && !selection && !editingEntry && !contextSheet &&
    (panel === null || panel === "translate" || panel === "lexicon" || panel === "grammarReminder");
  const trial = useConversationAccess(account?.uid, practising);
  usePartnerUsage(data, mutate, practising && !trial.blocked ? data!.settings.provider : null, false, account?.uid);
  function openPaywall() {
    Keyboard.dismiss();
    void audio.pause();
    setPanel(null); setSelection(null); setEditingEntry(null); setContextSheet(null); setDrawerOpen(false);
    setNotice(""); setPaywallOpen(true);
  }
  useEffect(() => {
    if (!trial.blocked) { setPaywallDismissed(false); return; }
    if (!paywallDismissed && !paywallOpen && !busy && appActive && tab === "chat") openPaywall();
  }, [trial.blocked, paywallDismissed, paywallOpen, busy, appActive, tab]);
  function recordTalkTime(now = Date.now()) {
    if (talkStartedAt.current === null) return;
    const elapsed = now - talkStartedAt.current;
    talkStartedAt.current = now;
    if (elapsed <= 0) return;
    pendingTalkMs.current += elapsed;
    setUnsavedTalkMs(pendingTalkMs.current);
  }
  function flushTalkTime() {
    recordTalkTime();
    const elapsed = Math.floor(pendingTalkMs.current);
    if (!data || elapsed <= 0) return Promise.resolve();
    pendingTalkMs.current -= elapsed;
    setUnsavedTalkMs(pendingTalkMs.current);
    const language = data.conversations.find((chat) => chat.id === data.activeConversationId)?.target;
    return mutate((previous) => ({
      ...previous,
      stats: {
        ...addTalkTime(previous.stats, localDay(), elapsed, language),
      },
    })).catch((error) => {
      pendingTalkMs.current += elapsed;
      setUnsavedTalkMs(pendingTalkMs.current);
      report(`Could not save talk time: ${error.message ?? String(error)}`);
    });
  }
  useEffect(() => {
    if (!data) return;
    const next = managedSettings(data.settings, !!account);
    if (next.mode !== data.settings.mode || next.provider !== data.settings.provider || next.model !== data.settings.model)
      void mutate((previous) => ({ ...previous, settings: managedSettings(previous.settings, !!account) })).catch((error) => report(error.message ?? String(error)));
  }, [account?.uid, data?.settings.mode, data?.settings.provider, data?.settings.model, mutate, report]);
  useEffect(
    () =>
      audio.subscribe(() => {
        setAudioState(audio.state);
        if (audio.error) report(audio.error);
      }),
    [],
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setDay(localDay());
      setAppActive(state === "active");
      if (state !== "active") void audio.stop();
    });
    const timer = setInterval(() => setDay(localDay()), 30000);
    return () => {
      sub.remove();
      clearInterval(timer);
      void audio.stop();
    };
  }, []);
  useEffect(() => {
    const tracking = !!data && tab === "chat" && appActive;
    if (tracking) {
      if (talkStartedAt.current === null) talkStartedAt.current = Date.now();
      return;
    }
    if (talkStartedAt.current !== null) {
      void flushTalkTime();
      talkStartedAt.current = null;
    }
  }, [data, tab, appActive]);
  const grammarLanguage =
    data?.conversations.find(
      (item) => item.id === data.activeConversationId,
    )?.target ??
    data?.settings.target ??
    "ru-RU";
  const videos = useVideos(account?.uid, grammarLanguage, report);
  const admin = useAdmin(account?.uid);
  const ownVideos = useMyVideos(account?.uid, grammarLanguage, report);
  // A saved video whose transcript has since been added to the library uses that one.
  const myVideos = useMemo(() => ownVideos.map((video) => {
    const library = video.lines.length ? undefined : videos.videos.find((item) => item.youtubeId === video.youtubeId);
    return library?.lines.length ? { ...video, lines: library.lines, status: "ready" as const } : video;
  }), [ownVideos, videos.videos]);
  const allVideos = useMemo(() => [...myVideos, ...videos.videos.filter((item) => !myVideos.some((mine) => mine.youtubeId === item.youtubeId))], [myVideos, videos.videos]);
  // The video on screen, as it is now: its transcript can arrive while it plays.
  const watchingNow = watching && (allVideos.find((item) => item.youtubeId === watching.youtubeId) ?? watching);
  useEffect(() => {
    const fallback = bundledGrammarTopics(grammarLanguage);
    setGrammarTopics(fallback);
    if (!account) {
      setGrammarReady(true);
      return;
    }
    // Bundled starter lessons keep this screen useful while Firestore connects.
    setGrammarReady(true);
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = watchGrammarTopics(
        grammarLanguage,
        (topics, connected) => {
          if (!connected) return;
          setGrammarTopics(topics.length ? topics : fallback);
          setGrammarReady(true);
        },
        () => {
          setGrammarTopics(fallback);
          setGrammarReady(true);
          // The bundled curriculum is complete. A transient or stale cloud
          // curriculum error must not appear as a chat-composer warning.
        },
      );
    } catch {
      setGrammarReady(true);
    }
    return () => unsubscribe?.();
  }, [account, grammarLanguage, report]);
  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      if (tab === "chat" && appActive) void flushTalkTime();
    }, TALK_TIME_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [data, tab, appActive]);
  const draft = (text: string) => {
    composerRef.current = text;
    setComposer(text);
  };
  async function safely(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await action();
      if (success) report(success);
    } catch (e: any) {
      if (isPaywallError(e)) openPaywall();
      else report(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <SafeAreaView style={styles.loading}>
        <Leaf color={c.accent} size={38} />
        <Text style={s.title}>Language Partner</Text>
        {notice ? (
          <Label>{notice}</Label>
        ) : (
          <ActivityIndicator color={c.accent} />
        )}
      </SafeAreaView>
    );
  const conversation =
    data.conversations.find((x) => x.id === data.activeConversationId) ??
    data.conversations[0];
  const settings = {
    ...managedSettings(data.settings, !!account),
    native: conversation.native,
    target: conversation.target,
  };
  const activeContext = data.savedConversations.find(
    (context) => context.id === contextId(conversation),
  );
  const reviewEntries = reviewContextId
    ? contextEntries(data.entries, reviewContextId)
    : data.entries;
  const due = reviewEntries
    .filter((e) => e.due <= day)
    .sort(
      (a, b) =>
        a.due.localeCompare(b.due) || a.createdAt.localeCompare(b.createdAt),
    );
  const upcoming = reviewEntries.filter((e) => e.due > day);
  const practice = preview
    ? reviewEntries[previewIndex % Math.max(1, reviewEntries.length)]
    : due[0];
  async function close() {
    setPanel(null);
    setSelection(null);
    await audio.closeTranslator();
  }
  async function save(input: DictionaryInput) {
    let repeated = false;
    await mutate((previous) => {
      const result = saveEntry(previous.entries, {
        ...input,
        conversationId: contextId(conversation),
      });
      repeated = result.duplicate;
      return {
        ...previous,
        entries: result.entries,
        savedConversations: previous.savedConversations.some(
          (context) => context.id === contextId(conversation),
        )
          ? previous.savedConversations
          : [
              saveConversationContext(conversation),
              ...previous.savedConversations,
            ],
      };
    });
    report(
      repeated
        ? "Phrase linked to this conversation."
        : "Saved to your dictionary and this conversation.",
    );
    // Quietly check a new phrase is what a native speaker would say. A better
    // version waits on its card; a failed check is simply no suggestion.
    if (!repeated && input.target === conversation.target)
      void reviewPhrase(input, settings)
        .then((suggestion) => mutate((previous) => {
          const saved = previous.entries.find((entry) => entry.phrase === input.phrase && entry.target === input.target && !entry.reviewed);
          return saved ? { ...previous, entries: markReviewed(previous.entries, saved.id, suggestion) } : previous;
        }))
        .catch(() => {});
  }
  // The forms a script uses for saved words often differ from the dictionary's,
  // so their meanings are worked out once and kept with the script.
  async function findMeanings(script: string, contextId: string, missing: { text: string; sentence: string }[]) {
    try {
      const context = latestSaved.current.find((item) => item.id === contextId);
      const found = await scriptMeanings(scriptText(script), missing.map((item) => item.text),
        { ...settings, ...(context ? { native: context.native, target: context.target } : {}) });
      if (!found.length) return;
      setFoundMeanings((previous) => ({ ...previous, ...Object.fromEntries(found.map((item) => [meaningKey(item.text), item.meaning])) }));
      await mutate((previous) => ({
        ...previous,
        savedConversations: previous.savedConversations.map((item) => {
          if (item.id !== contextId) return item;
          const kept = (item.scriptMeanings ?? []).filter((old) => !found.some((fresh) => meaningKey(fresh.text) === meaningKey(old.text)));
          return { ...item, scriptMeanings: [...kept, ...found].slice(-200) };
        }),
      }));
    } catch (error: any) {
      report(error.message ?? "The meanings could not be prepared.");
    }
  }
  // The ends of sentences in the learner's own language, for the prompter's
  // "openers, rest in English" level. Kept for this session only.
  async function findRests(missing: { start: string; rest: string }[], native: string, target: string) {
    try {
      const found = await scriptRests(missing, { ...settings, native, target });
      setFoundMeanings((previous) => ({ ...previous, ...Object.fromEntries(found.map((item) => [restKey(item.rest), item.meaning])) }));
    } catch (error: any) {
      report(error.message ?? "The sentences could not be translated.");
    }
  }
  // A video is kept like a saved conversation once anything is saved from it or said about it.
  const withVideoContext = (previous: typeof workspaceData & {}, video: Video) =>
    previous.savedConversations.some((context) => context.id === videoContextId(video.youtubeId))
      ? previous.savedConversations
      : [videoContext(video, previous.settings.native), ...previous.savedConversations];
  // A phrase taken from a video's subtitles joins that video's words, which
  // are the lexicon of its discussion.
  async function saveFromVideo(input: DictionaryInput, video: Video) {
    let repeated = false;
    await mutate((previous) => {
      const result = saveEntry(previous.entries, { ...input, conversationId: videoContextId(video.youtubeId) });
      repeated = result.duplicate;
      return { ...previous, entries: result.entries, savedConversations: withVideoContext(previous, video) };
    });
    report(repeated ? "Already in your dictionary. Linked to this video." : "Saved to your dictionary and this video.");
    if (!repeated)
      void reviewPhrase(input, { ...settings, native: input.native, target: input.target })
        .then((suggestion) => mutate((previous) => {
          const saved = previous.entries.find((entry) => entry.phrase === input.phrase && entry.target === input.target && !entry.reviewed);
          return saved ? { ...previous, entries: markReviewed(previous.entries, saved.id, suggestion) } : previous;
        }))
        .catch(() => {});
  }
  // Check every phrase saved before reviews existed, a couple at a time. Each
  // result is saved as it arrives, so stopping part-way loses nothing.
  async function reviewDictionary() {
    const waiting = unreviewed(data!.entries);
    if (!waiting.length || bulkReview) return;
    stopBulkReview.current = false;
    let done = 0, found = 0, next = 0;
    setBulkReview({ done, found, total: waiting.length });
    try {
      await Promise.all([0, 1].map(async () => {
        while (next < waiting.length && !stopBulkReview.current) {
          const entry = waiting[next++];
          const suggestion = await reviewPhrase(entry, { ...settings, native: entry.native, target: entry.target });
          await mutate((previous) => ({ ...previous, entries: markReviewed(previous.entries, entry.id, suggestion) }));
          done++;
          if (suggestion) found++;
          setBulkReview({ done, found, total: waiting.length });
        }
      }));
      report(`Checked ${done} ${done === 1 ? "phrase" : "phrases"}: ${found ? `${found} could be said more naturally. Look for “More natural” on their cards.` : "all fine as they are."}`);
    } catch (error: any) {
      stopBulkReview.current = true;
      report(`Stopped after ${done} of ${waiting.length}: ${error.message ?? String(error)}. The rest are still waiting.`);
    } finally {
      setBulkReview(null);
    }
  }
  // Take the suggested phrase in place of the saved one, or drop the suggestion.
  function settleSuggestion(entry: Entry, accept: boolean) {
    return mutate((previous) => ({
      ...previous,
      entries: previous.entries.map((old) => {
        if (old.id !== entry.id || !old.suggestion) return old;
        const { suggestion, ...rest } = old;
        return accept ? { ...rest, phrase: suggestion.phrase } : rest;
      }),
    }));
  }
  function updateConversation(
    messages: Message[],
    conversationId = conversation.id,
  ) {
    return mutate((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === conversationId
          ? {
              ...item,
              messages,
              title: conversationTitle({ ...item, messages }),
            }
          : item,
      ),
    }));
  }
  function openFeedback() {
    if (!account) { setGuest(false); return; }
    Keyboard.dismiss();
    void audio.stop();
    setDrawerOpen(false); setSelection(null); setEditingEntry(null); setContextSheet(null);
    if (!feedbackDraft) setFeedbackLanguage(settings.native);
    setNotice(""); setPanel("feedback");
  }
  async function send(retry = false) {
    if (trial.blocked && data!.settings.mode === "api") { openPaywall(); return; }
    const text = composerRef.current.trim();
    if ((!text && !retry) || busy) return;
    preserveTranscriptPosition.current = false;
    setBusy(true);
    await audio.pause();
    let messages = conversation.messages;
    try {
      if (!retry) {
        messages = [
          ...messages,
          {
            id: id(),
            role: "user",
            text,
            final: true,
            createdAt: new Date().toISOString(),
          },
        ];
        await updateConversation(messages);
        draft("");
      }
      if (
        conversation.practiceOf &&
        (!contextsReady || !dictionaryReady || !activeContext)
      )
        throw new Error("Wait for your saved conversation and words to load");
      const { text: answer, corrections, meant, speaker } = await replyWithCorrections(
        messages,
        settings,
        conversation.practiceOf && activeContext
          ? practiceContext(activeContext, data!.entries)
          : undefined,
        conversation.grammar,
        conversation.roleplay,
        account?.displayName?.trim().split(/\s+/)[0],
        videoPractice(conversation, data!.entries),
      );
      // The partner asked, or worked out, whether the learner is a man or a woman.
      if (speaker && speaker !== data!.settings.speaker)
        await mutate((p) => ({ ...p, settings: { ...p.settings, speaker } }));
      await updateConversation([
        ...messages,
        {
          id: id(),
          role: "assistant",
          text: answer,
          final: true,
          createdAt: new Date().toISOString(),
          ...(settings.mode === "api" ? { provider: settings.provider } : {}),
          ...(corrections ? { corrections } : {}),
          ...(meant ? { meant } : {}),
        },
      ]);
      if (spoke.current && settings.autoSpeak)
        await audio.play("chat", spokenMessage(answer, corrections), conversation.target);
      spoke.current = false;
    } catch (e: any) {
      if (isPaywallError(e)) openPaywall();
      else report(
        `Reply unavailable: ${e.message}. Your turn is saved; use “Retry reply”.`,
      );
    } finally {
      setBusy(false);
    }
  }
  function changeTab(next: Tab) {
    void audio.stop();
    setTab(next);
    setReveal(false);
    setPreview(false);
    setNotice("");
  }
  async function newChat(
    native = data!.settings.native,
    target = data!.settings.target,
  ) {
    preserveTranscriptPosition.current = false;
    await audio.stop();
    const next = makeConversation(native, target, false);
    await mutate((previous) => ({
      ...previous,
      activeConversationId: next.id,
      conversations: [next, ...previous.conversations],
    }));
    draft("");
    setPanel(null);
    setTab("chat");
  }
  async function startRoleplay(scenario: RoleplayScenario) {
    if (trial.blocked && data!.settings.mode === "api") { openPaywall(); return; }
    preserveTranscriptPosition.current = false;
    await audio.stop();
    const next = makeRoleplayConversation(scenario, conversation.native, conversation.target);
    await mutate((previous) => ({
      ...previous,
      activeConversationId: next.id,
      conversations: [next, ...previous.conversations],
    }));
    draft("");
    setPanel(null);
    setTab("chat");
    try {
      await prepareRoleplayOpening(next);
    } catch (error: any) {
      if (isPaywallError(error)) openPaywall();
      else report(`Your roleplay is saved. Tap “Retry roleplay” to load its opening: ${error.message ?? String(error)}`);
    }
  }
  // Words saved from this video before saving recorded where they came from are linked to it now.
  async function openVideo(video: Video) {
    void audio.stop();
    setWatching(video);
    if (!linkVideoEntries(data!.entries, video).linked) return;
    await mutate((previous) => {
      const { entries, linked } = linkVideoEntries(previous.entries, video);
      return linked ? { ...previous, entries, savedConversations: withVideoContext(previous, video) } : previous;
    }).catch(() => {});
  }
  // The one discussion of a video: opened if it exists, started if not.
  async function discussVideo(video: Video) {
    if (trial.blocked && data!.settings.mode === "api") { openPaywall(); return; }
    preserveTranscriptPosition.current = false;
    await audio.stop();
    const id = videoContextId(video.youtubeId);
    const existing = data!.conversations.find((item) => item.id === id);
    const next = existing ?? makeVideoConversation(video, conversation.native);
    await mutate((previous) => ({
      ...previous,
      activeConversationId: id,
      conversations: previous.conversations.some((item) => item.id === id) ? previous.conversations : [next, ...previous.conversations],
      savedConversations: withVideoContext(previous, video),
    }));
    draft("");
    setWatching(null);
    setPanel(null);
    setTab("chat");
    if (!next.messages.length) await openVideoDiscussion(next);
  }
  // The partner speaks first, with a question about the video.
  async function openVideoDiscussion(next: Conversation) {
    if (!next.video) return;
    const openingSettings = { ...managedSettings(data!.settings, !!account), native: next.native, target: next.target };
    setBusy(true);
    try {
      const { text: answer } = await replyWithCorrections([{
        id: id(), role: "user", text: "I have just watched the video. Start the conversation.", final: true, createdAt: new Date().toISOString(),
      }], openingSettings, undefined, undefined, undefined, undefined, videoPractice(next, data!.entries));
      await mutate((previous) => ({ ...previous, conversations: previous.conversations.map((item) =>
        item.id === next.id && !item.messages.length ? { ...item, messages: [{
          id: id(), role: "assistant" as const, text: answer, final: true, createdAt: new Date().toISOString(),
          ...(openingSettings.mode === "api" ? { provider: openingSettings.provider } : {}),
        }] } : item,
      ) }));
      if (openingSettings.autoSpeak) await audio.play("chat", answer, next.target);
    } catch (error: any) {
      if (isPaywallError(error)) openPaywall();
      else report(`Your partner could not start the discussion: ${error.message ?? String(error)}. Say something to begin.`);
    } finally {
      setBusy(false);
    }
  }
  // Clear the discussion and begin it again. The video's words are kept.
  async function restartVideoDiscussion() {
    if (!conversation.video || busy) return;
    await audio.stop();
    const cleared = { ...conversation, messages: [] };
    await updateConversation([]);
    await mutate((previous) => ({ ...previous, conversations: previous.conversations.map((item) => item.id === cleared.id ? { ...item, title: conversation.video!.title } : item) }));
    draft("");
    await openVideoDiscussion(cleared);
  }
  async function prepareRoleplayOpening(next: Conversation) {
    if (!next.roleplay) throw new Error("This conversation has no roleplay scenario.");
    const openingSettings = { ...managedSettings(data!.settings, !!account), native: next.native, target: next.target };
    const answer = await reply([{
      id: id(), role: "user", text: "Start the roleplay as the partner character.", final: true, createdAt: new Date().toISOString(),
    }], openingSettings, undefined, undefined, next.roleplay);
    await mutate((previous) => ({ ...previous, conversations: previous.conversations.map((item) =>
      item.id === next.id && !item.messages.length ? { ...item, messages: [{
        id: id(), role: "assistant" as const, text: answer, final: true, createdAt: new Date().toISOString(),
        ...(openingSettings.mode === "api" ? { provider: openingSettings.provider } : {}),
      }] } : item,
    ) }));
    setNotice("");
    if (openingSettings.autoSpeak) await audio.play("chat", answer, next.target);
  }
  async function startGrammar(topic: GrammarTopic) {
    if (trial.blocked && data!.settings.mode === "api") { openPaywall(); return; }
    preserveTranscriptPosition.current = false;
    await audio.stop();
    const next = makeGrammarConversation(
      topic,
      conversation.native,
      conversation.target,
    );
    await mutate((previous) => ({
      ...previous,
      activeConversationId: next.id,
      conversations: [next, ...previous.conversations],
    }));
    draft("");
    setPanel(null);
    setTab("chat");
    try {
      await prepareGrammarOpening(next);
    } catch (error: any) {
      if (isPaywallError(error)) openPaywall();
      else report(
        `The lesson is ready, but its opening prompt could not load. Tap “Retry lesson” below: ${error.message ?? String(error)}`,
      );
    }
  }
  async function prepareGrammarOpening(next: Conversation) {
    if (!next.grammar) throw new Error("This conversation has no grammar topic.");
    const startMessage: Message = {
      id: id(),
      role: "user",
      text: "Start our conversation with the curriculum’s opening prompt. I have already studied this grammar and want to practise it.",
      final: true,
      createdAt: new Date().toISOString(),
    };
    const openingSettings = {
      ...managedSettings(data!.settings, !!account),
      native: next.native,
      target: next.target,
    };
    const answer = await reply(
      [startMessage],
      openingSettings,
      undefined,
      next.grammar,
    );
    await mutate((previous) => ({
      ...previous,
      conversations: previous.conversations.map((item) =>
        item.id === next.id && !item.messages.length
          ? {
              ...item,
              messages: [
                {
                  id: id(),
                  role: "assistant" as const,
                  text: answer,
                  final: true,
                  createdAt: new Date().toISOString(),
                  ...(openingSettings.mode === "api"
                    ? { provider: openingSettings.provider }
                    : {}),
                },
              ],
            }
          : item,
      ),
    }));
    setNotice("");
    if (openingSettings.autoSpeak)
      await audio.play("chat", answer, next.target);
  }
  async function openConversation(id: string) {
    preserveTranscriptPosition.current = false;
    await audio.stop();
    if (id !== conversation.id) {
      await mutate((p) => ({ ...p, activeConversationId: id }));
      draft("");
    }
    changeTab("chat");
  }
  function latestContextChat(context: SavedConversation) {
    return recentConversations(data!.conversations).find(
      (chat) => contextId(chat) === context.id && chat.messages.length,
    );
  }
  async function saveContext(context: SavedConversation) {
    await mutate((previous) => ({
      ...previous,
      conversations: previous.conversations.map((chat) =>
        contextId(chat) === context.id
          ? { ...chat, title: context.title }
          : chat,
      ),
      savedConversations: [
        context,
        ...previous.savedConversations.filter((old) => old.id !== context.id),
      ],
    }));
  }
  // The read-aloud script is made in two steps from the chat on this phone.
  // Step one gathers what the learner said into an outline in their own
  // language; `feedback` asks for changes to the outline already there.
  // `change` asks for changes to the outline already there: to the whole piece,
  // to one paragraph of it, or to take a paragraph out.
  async function scriptWork(
    context: SavedConversation,
    step: "outline" | "script",
    change?: { feedback: string; paragraph?: number } | { remove: number },
  ) {
    const source = latestContextChat(context);
    const lastMessageId = source?.messages.at(-1)?.id;
    const chat = source?.messages.some((message) => message.role === "user") ? source.messages : undefined;
    const languages = { ...settings, native: context.native, target: context.target };
    setScriptBusy({ id: context.id, step });
    try {
      // Read the saved conversation again afterwards, to keep edits made meanwhile.
      const latest = () => latestSaved.current.find((old) => old.id === context.id) ?? context;
      // A changed outline makes the old script out of date, so it is dropped.
      const saveOutline = (outline: string, points = context.outlinePoints, sourceId = context.outlineSourceMessageId) => {
        const { script, ...rest } = latest();
        return saveContext({
          ...rest, outline,
          ...(points ? { outlinePoints: points.slice(0, 20000) } : {}),
          ...(sourceId ? { outlineSourceMessageId: sourceId } : {}),
        });
      };
      const saved = contextEntries(data!.entries, context.id);
      if (step === "outline" && change && context.outline) {
        // Changes work from the outline and its points, so they need no chat on this phone.
        if ("remove" in change) return await saveOutline(replaceParagraph(context.outline, change.remove, ""));
        const selected = change.paragraph === undefined ? undefined : paragraphs(context.outline)[change.paragraph];
        const { outline: revised } = await conversationOutline([], languages, saved, {
          draft: selected ?? context.outline, feedback: change.feedback, points: context.outlinePoints,
          ...(selected ? { whole: context.outline } : {}),
        });
        // If the whole piece comes back for one paragraph, take it as the whole piece.
        const cameBackWhole = paragraphs(revised).length >= paragraphs(context.outline).length && revised.length > context.outline.length * 0.7;
        await saveOutline(selected && !cameBackWhole ? replaceParagraph(context.outline, change.paragraph!, revised) : revised);
      } else if (step === "outline") {
        if (!chat || !lastMessageId) throw new Error("The chat for this conversation is not on this phone.");
        const { outline, points } = await conversationOutline(chat, languages, saved);
        await saveOutline(outline, points, lastMessageId);
      } else {
        const script = await conversationScript(
          context.outline ?? "",
          chat ?? [],
          languages,
          saved,
          data!.entries.filter((entry) => entry.target === context.target && !saved.includes(entry)),
        );
        await saveContext({ ...latest(), script });
      }
    } finally {
      setScriptBusy(null);
    }
  }
  // A saved conversation gets its outline without being asked, the first time
  // it is saved from the sheet or opened. Later changes are the learner's call.
  function outlineIfMissing(context: SavedConversation) {
    if (settings.mode !== "api" || context.outline || scriptBusy || !latestContextChat(context)?.messages.some((message) => message.role === "user")) return;
    void scriptWork(context, "outline").catch((error) => report(`Could not summarise the conversation: ${error.message ?? String(error)}`));
  }
  function openContext(context: SavedConversation) {
    setContextSheet(context);
    outlineIfMissing(context);
  }
  async function openSaveConversationSheet() {
    if (!account) {
      setGuest(false);
      return;
    }
    if (!contextsReady)
      throw new Error("Wait for your saved conversations to load.");
    let summary = "";
    if (settings.mode === "api" && conversation.messages.length) {
      try {
        summary = await summarizeConversation(
          conversation.messages,
          settings,
          "",
        );
      } catch (error: any) {
        report(
          `Could not prepare a draft summary: ${error.message ?? String(error)}`,
        );
      }
    }
    setContextSheet(draftConversationContext(conversation, summary));
  }
  async function repeatConversation(context: SavedConversation) {
    if (trial.blocked && data!.settings.mode === "api") { openPaywall(); return; }
    preserveTranscriptPosition.current = false;
    await audio.stop();
    if (!dictionaryReady || !contextsReady)
      throw new Error("Wait for your saved conversation and words to load.");
    // A video has one discussion, not a new chat each time.
    const videoChat = data!.conversations.find((item) => item.id === context.id && item.video);
    if (videoChat) {
      await mutate((previous) => ({ ...previous, activeConversationId: videoChat.id }));
      draft("");
      setContextSheet(null);
      setPanel(null);
      changeTab("chat");
      if (!videoChat.messages.length) await openVideoDiscussion(videoChat);
      return;
    }
    let readyContext = context;
    const source = latestContextChat(context);
    const lastMessageId = source?.messages.at(-1)?.id;
    if (
      source &&
      lastMessageId !== context.summarySourceMessageId &&
      settings.mode === "api"
    ) {
      readyContext = {
        ...context,
        summary: await summarizeConversation(
          source.messages,
          { ...settings, native: context.native, target: context.target },
          context.summary,
        ),
        summarySourceMessageId: lastMessageId!,
        updatedAt: new Date().toISOString(),
      };
      await saveContext(readyContext);
    }
    practiceContext(readyContext, data!.entries);
    const next = makePracticeConversation(readyContext);
    await mutate((previous) => ({
      ...previous,
      activeConversationId: next.id,
      conversations: [next, ...previous.conversations],
    }));
    draft("");
    setContextSheet(null);
    setPanel(null);
    changeTab("chat");
  }
  const sheetContext =
    contextSheet &&
    (data.savedConversations.find(
      (context) => context.id === contextSheet.id,
    ) ??
      contextSheet);
  const sheetIsNew = !!(
    sheetContext &&
    !data.savedConversations.some((context) => context.id === sheetContext.id)
  );
  const sheetSource = sheetContext
    ? latestContextChat(sheetContext)
    : undefined;
  const sheetSummaryLanguage = sheetContext?.native;
  const status = busy
    ? "Connecting · waiting for reply"
    : audioState === "listening"
      ? `Listening in ${languageName(audio.owner === "chat" ? conversation.target : conversation.native)}`
      : audioState === "speaking"
        ? "Speaking · tap pause to interrupt"
        : audioState === "connecting"
          ? "Connecting microphone…"
          : audioState === "error"
            ? "Microphone needs attention"
            : audioState === "paused"
              ? "Paused · ready when you are"
              : "Ready when you are";
  const filtered = data.entries.filter((e) =>
    `${e.phrase} ${e.meaning}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const liveStats = unsavedTalkMs
    ? addTalkTime(data.stats, day, unsavedTalkMs, conversation.target)
    : data.stats;
  const showSaveConversation =
    tab === "chat" &&
    !conversation.practiceOf &&
    !conversation.grammar &&
    !activeContext;
  const firstAssistantMessageId = conversation.messages.find(
    ({ role }) => role === "assistant",
  )?.id;
  const savedDataStatus =
    account && !savedDataConnected
      ? { loaded: dictionaryReady && contextsReady }
      : undefined;
  const hasConversationTitle = tab === "chat" && Boolean(
    conversation.messages.length || conversation.practiceOf || conversation.grammar || conversation.roleplay || activeContext,
  );
  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.frame}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <AppHeader
          onFeedback={openFeedback}
          title={tab === "chat"
              ? hasConversationTitle
                ? (activeContext?.title ?? conversationTitle(conversation))
                : "Language Partner"
              : tab === "dictionary"
                ? "Dictionary"
                : tab === "conversations"
                  ? "Saved conversations"
                  : tab === "roleplay"
                    ? "Roleplay"
                  : tab === "grammar"
                    ? "Grammar"
                    : tab === "issues"
                      ? "Things to work on"
                    : tab === "videos"
                      ? "Watch and repeat"
                    : tab === "stats"
                      ? "My stats"
                      : "Practice"}
          prominent={hasConversationTitle}
          busy={busy}
          settingsLabel={tab === "chat" ? "Conversation settings" : "App settings"}
          onOpenMenu={() => {
            Keyboard.dismiss();
            void audio.pause();
            setDrawerOpen(true);
          }}
          onSettings={() => {
            void audio.stop();
            setPanel(tab === "chat" ? "conversation" : "account");
          }}
        />
        {savedDataStatus && (
          <SavedDataNotice loaded={savedDataStatus.loaded} />
        )}
        {tab === "chat" ? (
          <>
            <ScrollView
              ref={transcript}
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.transcript,
                !conversation.messages.length && { flexGrow: 1 },
              ]}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (preserveTranscriptPosition.current) return;
                if (conversation.practiceOf && !conversation.messages.length)
                  transcript.current?.scrollTo({ y: 0, animated: false });
                else transcript.current?.scrollToEnd({ animated: true });
              }}
            >
              {conversation.practiceOf && activeContext && (
                <PracticeIntroduction
                  key={conversation.id}
                  context={activeContext}
                  words={contextEntries(data.entries, activeContext.id)}
                  onToggleTranslations={() => {
                    preserveTranscriptPosition.current = true;
                  }}
                />
              )}
              {conversation.practiceOf && !activeContext && (
                <Label muted>Loading your saved conversation…</Label>
              )}
              {conversation.roleplay && <RoleplayBrief scenario={conversation.roleplay} />}
              {conversation.video && (
                <View style={[s.card, { backgroundColor: c.pale }]}>
                  <Text style={s.eyebrow}>Talking about a video</Text>
                  <DisplayText style={s.title}>{conversation.video.title}</DisplayText>
                  <View style={s.wrap}>
                    {(() => {
                      const video = allVideos.find((item) => item.youtubeId === conversation.video!.youtubeId);
                      return video ? <Button small icon={Play} onPress={() => void openVideo(video)}>Watch again</Button> : null;
                    })()}
                    {conversation.messages.length > 0 && (
                      <Button small icon={RotateCcw} disabled={busy} onPress={() => {
                        if (!restartingVideo) return setRestartingVideo(true);
                        setRestartingVideo(false);
                        void safely(restartVideoDiscussion);
                      }}>{restartingVideo ? "Confirm: clear and start again" : "Start conversation again"}</Button>
                    )}
                    {restartingVideo && <Button small onPress={() => setRestartingVideo(false)}>Keep it</Button>}
                  </View>
                </View>
              )}
              {conversation.grammar && (
                <View style={[s.card, { backgroundColor: c.pale }]}>
                  <Text style={s.eyebrow}>Grammar focus</Text>
                  <DisplayText style={s.title}>{conversation.grammar.title}</DisplayText>
                  {conversation.grammar.openingPrompt
                    ? <GrammarPracticeCard grammar={conversation.grammar} />
                    : <Label muted>{conversation.grammar.description}</Label>}
                </View>
              )}
              {!conversation.messages.length &&
                !conversation.practiceOf &&
                !conversation.grammar && !conversation.roleplay && !conversation.video && (
                  <View style={styles.emptyChat}>
                    <DisplayText style={styles.greeting}>
                      What would you like{"\n"}to talk about?
                    </DisplayText>
                    <Label muted style={{ marginTop: 16 }}>
                      {languageName(conversation.native)} ↔{" "}
                      {languageName(conversation.target)}
                    </Label>
                  </View>
                )}
              {conversation.messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.message,
                    message.role === "user" && styles.userMessage,
                  ]}
                >
                  <View
                    style={
                      message.role === "user" ? styles.userBubble : undefined
                    }
                  >
                    <SelectableMessage
                      message={message}
                      compact={!!conversation.grammar}
                      accentRanges={
                        conversation.grammar &&
                        message.id === firstAssistantMessageId
                          ? grammarAccentRanges(
                              message.text,
                              conversation.grammar.id,
                              true,
                            )
                          : undefined
                      }
                      enabled={
                        !busy &&
                        !panel &&
                        !selection &&
                        !drawerOpen &&
                        !contextSheet
                      }
                      onSelect={(range) => {
                        void audio.pause();
                        setSelection({ message, range });
                      }}
                    />
                  </View>
                  {!!message.corrections && (
                    <View accessible accessibilityLabel={`Corrections. ${message.corrections}`} style={styles.corrections}>
                      <Text style={s.eyebrow}>Corrections</Text>
                      <Text selectable style={styles.correctionsText}>{message.corrections}</Text>
                    </View>
                  )}
                  {message.role === "assistant" && (
                    <Button
                      small
                      icon={Volume2}
                      iconColor={c.muted}
                      label="Read message aloud"
                      style={styles.messageAction}
                      onPress={() =>
                        void audio.play(
                          "chat",
                          spokenMessage(message.text, message.corrections),
                          conversation.target,
                        )
                      }
                    />
                  )}
                </View>
              ))}
              {!busy && conversation.roleplay && !conversation.messages.length && (
                <Button small icon={RotateCcw} onPress={() => void safely(() => prepareRoleplayOpening(conversation))}>Retry roleplay</Button>
              )}
              {busy && (
                <View style={s.row}>
                  <ActivityIndicator size="small" color={c.accent} />
                  <Label muted>
                    {conversation.grammar && !conversation.messages.length
                      ? "Preparing lesson…"
                      : "Thinking about your reply…"}
                  </Label>
                </View>
              )}
              {!busy && conversation.messages.at(-1)?.role === "user" && (
                <Button small icon={RotateCcw} onPress={() => void send(true)}>
                  Retry reply
                </Button>
              )}
              {!busy &&
                conversation.grammar &&
                !conversation.messages.length && (
                  <Button
                    small
                    icon={RotateCcw}
                    onPress={() =>
                      void safely(() => prepareGrammarOpening(conversation))
                    }
                  >
                    Retry lesson
                  </Button>
                )}
            </ScrollView>
            <View style={styles.composer}>
              {trial.value?.enabled && !trial.value.subscribed && settings.mode === "api" && <Pressable accessibilityRole="button" accessibilityLabel="View subscription plans" onPress={openPaywall} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6 }}>
                <Text style={{ color: c.accentText, fontFamily: fonts.sans, fontSize: 11, lineHeight: 17 }}>{trial.blocked ? "Your 15 free minutes are complete" : `Free conversation · ${trial.label} left`}</Text>
                <Text style={{ color: c.accentText, fontFamily: fonts.sans, fontSize: 11, lineHeight: 17 }}>View plans</Text>
              </Pressable>}
              {(busy ||
                ["listening", "speaking", "connecting", "error"].includes(
                  audioState,
                )) && (
                <View style={styles.audioStatus}>
                  <Label muted style={{ fontSize: 12, flex: 1 }}>
                    {status}
                  </Label>
                  {(audioState === "speaking" ||
                    audioState === "listening") && (
                    <Button
                      small
                      icon={Pause}
                      label="Pause audio"
                      style={styles.plainButton}
                      onPress={() => void audio.pause()}
                    />
                  )}
                </View>
              )}
              <View style={styles.composerCard}>
                <Field
                  accessibilityLabel="Message composer"
                  multiline
                  placeholder={
                    conversation.practiceOf && !conversation.messages.length
                      ? "Try a phrase, or ask for a hint…"
                      : conversation.messages.length
                        ? "Reply…"
                        : "Message your partner…"
                  }
                  value={composer}
                  onChangeText={draft}
                  style={styles.composerInput}
                />
                <View style={styles.composerTools}>
                  <Button
                    icon={Languages}
                    disabled={busy}
                    style={styles.translateButton}
                    onPress={() => {
                      if (trial.blocked && settings.mode === "api") { openPaywall(); return; }
                      Keyboard.dismiss();
                      setPanel("translate");
                    }}
                  >
                    Translate
                  </Button>
                  {conversation.grammar && (
                    <Button
                      icon={BookOpen}
                      label="Grammar reminder"
                      disabled={busy}
                      style={styles.lexiconButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setPanel("grammarReminder");
                      }}
                    />
                  )}
                  {!conversation.grammar && activeContext && dictionaryReady && (
                    <Button
                      icon={BookOpen}
                      label="Saved words for this conversation"
                      disabled={busy}
                      style={styles.lexiconButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setPanel("lexicon");
                      }}
                    />
                  )}
                  {showSaveConversation && (
                    <Button
                      icon={BookmarkPlus}
                      disabled={busy || (!!account && !contextsReady)}
                      style={styles.saveConversationButton}
                      onPress={() =>
                        void safely(() => openSaveConversationSheet())
                      }
                    >
                      Save
                    </Button>
                  )}
                  <View style={{ flex: 1 }} />
                  <Button
                    icon={
                      audio.owner === "chat" &&
                      (audioState === "listening" ||
                        audioState === "connecting")
                        ? Square
                        : Mic
                    }
                    label="Tutor microphone"
                    disabled={busy}
                    style={styles.micButton}
                    onPress={() => {
                      if (trial.blocked && settings.mode === "api") { openPaywall(); return; }
                      if (
                        audio.owner === "chat" &&
                        (audioState === "listening" ||
                          audioState === "connecting")
                      )
                        void audio.pause();
                      else {
                        spoke.current = true;
                        let base = composerRef.current;
                        void audio.listen(
                          "chat",
                          conversation.target,
                          (text) => draft(`${base}${base ? " " : ""}${text}`),
                          () => {
                            base = composerRef.current;
                          },
                        );
                      }
                    }}
                  />
                  <Button
                    primary
                    icon={ArrowUp}
                    label="Send message"
                    style={styles.sendButton}
                    disabled={
                      (!composer.trim() && !trial.blocked) ||
                      busy ||
                      (!!conversation.practiceOf &&
                        (!contextsReady || !dictionaryReady || !activeContext))
                    }
                    onPress={() => void send()}
                  />
                </View>
              </View>
            </View>
          </>
        ) : tab === "conversations" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <DisplayText style={styles.pageTitle}>Conversations to come back to.</DisplayText>
            <Label muted>
              Revisit the topic, recall your words, and keep the conversation
              going.
            </Label>
            {!account && (
              <Button primary onPress={() => setGuest(false)}>
                Sign in to save conversations
              </Button>
            )}
            {account && !contextsReady && (
              <Label muted>Loading saved conversations…</Label>
            )}
            {contextsReady && !data.savedConversations.length && (
              <Label muted>
                Save a conversation from the chat window to keep it here for
                practice.
              </Label>
            )}
            {[...data.savedConversations]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((context) => (
                <View key={context.id} style={s.card}>
                  <DisplayText style={s.title}>{context.title}</DisplayText>
                  {!!(context.description || context.summary) && (
                    <Label muted>
                      {context.description || context.summary}
                    </Label>
                  )}
                  <Label muted>
                    {contextEntries(data.entries, context.id).length} saved
                    phrases
                  </Label>
                  <Button onPress={() => openContext(context)}>
                    Open conversation
                  </Button>
                </View>
              ))}
          </ScrollView>
        ) : tab === "videos" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <VideosScreen
              videos={videos.videos.filter((item) => !myVideos.some((mine) => mine.youtubeId === item.youtubeId))}
              mine={myVideos}
              onAddLink={async (link) => {
                const found = youtubeId(link);
                if (!found) throw new Error("That does not look like a YouTube link. Copy it from the video's Share button.");
                if (allVideos.some((item) => item.youtubeId === found)) throw new Error("You already have this video.");
                if (addedToday(ownVideos) >= linksPerDay) throw new Error(`You have added ${linksPerDay} videos today. You can add more tomorrow.`);
                await saveMyVideo(account?.uid, savedFromLink(found, await videoDetails(found), conversation.target));
              }}
              onRemoveMine={(video) => removeMyVideo(account?.uid, video.id)
                .then(() => report(`Removed “${video.title}” from your videos.`))
                .catch((error) => report(error.message ?? "The video could not be removed."))}
              ready={videos.ready}
              failed={videos.failed}
              account={!!account}
              language={conversation.target}
              pageTitleStyle={styles.pageTitle}
              onSignIn={() => setGuest(false)}
              onOpen={(video) => void openVideo(video)}
              onDelete={admin ? (video) =>
                removeVideo(account?.uid, video.language, video.id)
                  .then(() => report(`Deleted “${video.title}”.`))
                  .catch((error) => report(error.message ?? "The video could not be deleted."))
                : undefined}
            />
          </ScrollView>
        ) : tab === "issues" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <IssuesScreen
              issues={issuesFor(issues.issues, conversation.target)}
              ready={issues.ready}
              account={!!account}
              language={conversation.target}
              pageTitleStyle={styles.pageTitle}
              onSignIn={() => setGuest(false)}
              onAdd={() => setIssueSheet("new")}
              onOpen={setIssueSheet}
            />
          </ScrollView>
        ) : tab === "roleplay" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <RoleplayScreen language={conversation.target} account={!!account} busy={busy}
              onSignIn={() => setGuest(false)} onStart={(scenario) => void safely(() => startRoleplay(scenario))} />
          </ScrollView>
        ) : tab === "grammar" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <GrammarScreen
              language={conversation.target}
              topics={grammarTopics}
              ready={grammarReady}
              account={!!account}
              onSignIn={() => setGuest(false)}
              onStart={(topic) => void safely(() => startGrammar(topic))}
            />
          </ScrollView>
        ) : tab === "stats" ? (
          <ScrollView contentContainerStyle={styles.page}>
            <Text style={s.eyebrow}>Your practice</Text>
            <DisplayText style={styles.pageTitle}>My stats.</DisplayText>
            <Label muted>
              See your speaking rhythm by day, week and month. Daily history is
              recorded from this version onward.
            </Label>
            <LevelCard readings={readings.filter((reading) => reading.language === conversation.target)} />
            <TalkTimeOverview stats={liveStats} today={day} language={conversation.target}
              onAssignEarlier={() => void mutate((previous) => ({ ...previous, stats: assignEarlierTalkTime(previous.stats, conversation.target) }))
                .then(() => report(`Earlier talk time now counts as ${languageName(conversation.target)}.`))
                .catch((error) => report(error.message))} />
            <PracticeOverview
              readings={readings.filter((reading) => reading.language === conversation.target)}
              activity={activity.filter((item) => item.language === conversation.target)}
            />
            <View style={styles.statsList}>
              <View style={[s.card, styles.statCard]}>
                <View style={styles.statIcon}>
                  <BookOpen color={c.accent} size={22} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue}>
                    {dictionaryReady ? data.entries.length : "…"}
                  </Text>
                  <Label muted>
                    Saved {data.entries.length === 1 ? "word" : "words"}
                  </Label>
                </View>
              </View>
              <View style={[s.card, styles.statCard]}>
                <View style={styles.statIcon}>
                  <MessagesSquare
                    color={c.accent}
                    size={22}
                    strokeWidth={1.8}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statValue}>
                    {contextsReady ? data.savedConversations.length : "…"}
                  </Text>
                  <Label muted>
                    Saved{" "}
                    {data.savedConversations.length === 1
                      ? "conversation"
                      : "conversations"}
                  </Label>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : tab === "dictionary" ? (
          <ScrollView
            contentContainerStyle={[styles.page, styles.dictionaryPage]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.eyebrow}>Collected by you</Text>
              <Button
                small
                icon={RotateCcw}
                onPress={() => {
                  setReviewContextId(null);
                  changeTab("practice");
                }}
              >
                Practice
              </Button>
            </View>
            <DisplayText style={styles.pageTitle}>Words worth keeping.</DisplayText>
            <Label muted>
              {dictionaryReady
                ? `${data.entries.length} saved ${data.entries.length === 1 ? "phrase" : "phrases"} · ${account ? "saved in Firebase" : "sign in to save"}`
                : "Loading saved phrases…"}
            </Label>
            {settings.mode === "api" && dictionaryReady && (bulkReview || unreviewed(data.entries).length > 0) && (
              <View style={[s.card, { padding: 12, gap: 8, borderRadius: 14 }]}>
                {bulkReview ? (
                  <View style={s.row}>
                    <ActivityIndicator size="small" color={c.accent} />
                    <Label style={{ flex: 1 }}>
                      Checked {bulkReview.done} of {bulkReview.total}
                      {bulkReview.found ? ` · ${bulkReview.found} could be more natural` : ""}
                    </Label>
                    <Button small onPress={() => { stopBulkReview.current = true; }}>Stop</Button>
                  </View>
                ) : (
                  <>
                    <Label>
                      {unreviewed(data.entries).length} of your phrases {unreviewed(data.entries).length === 1 ? "hasn’t" : "haven’t"} been checked for natural wording.
                    </Label>
                    <Button small onPress={() => void reviewDictionary()}>Check them now</Button>
                  </>
                )}
              </View>
            )}
            <View style={s.row}>
              <Search color={c.muted} size={20} />
              <Field
                accessibilityLabel="Search dictionary"
                placeholder="Find a word or meaning…"
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, minHeight: 44, paddingVertical: 10, lineHeight: 22 }}
              />
            </View>
            {!account && (
              <Button primary onPress={() => setGuest(false)}>
                Sign in to save words
              </Button>
            )}
            {dictionaryReady && !filtered.length && (
              <View style={s.card}>
                <BookOpen color={c.accent} size={32} />
                <Text style={s.title}>
                  {data.entries.length
                    ? "No matching phrases"
                    : "A dictionary that sounds like you."}
                </Text>
                <Label muted>
                  {data.entries.length
                    ? "Try another word or meaning."
                    : "Select a phrase from either side of your conversation, or save a translation. Only your choices belong here."}
                </Label>
                <Button onPress={() => changeTab("chat")}>
                  Back to conversation
                </Button>
              </View>
            )}
            {filtered.map((entry) => (
              <DictionaryEntryCard
                key={entry.id}
                entry={entry}
                contexts={data.savedConversations.filter((context) =>
                  entry.conversationIds.includes(context.id),
                )}
                onPronounce={() => void audio.play("chat", entry.phrase, entry.target)}
                onEdit={() => {
                  setEditingEntry({ ...entry });
                  setDeleteId("");
                }}
                onContext={setContextSheet}
                onSuggestion={(accept) => void safely(() => settleSuggestion(entry, accept))}
              />
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.page}>
            <Text style={s.eyebrow}>Make it yours</Text>
            <DisplayText style={styles.pageTitle}>A little practice.</DisplayText>
            {!!reviewContextId && (
              <Label>
                {
                  data.savedConversations.find(
                    (context) => context.id === reviewContextId,
                  )?.title
                }
              </Label>
            )}
            <Label muted>
              {due.length} due today · {upcoming.length} coming up
            </Label>
            {!dictionaryReady ? (
              <Label muted>Loading saved phrases…</Label>
            ) : practice ? (
              <>
                <View
                  style={[
                    s.card,
                    {
                      minHeight: 300,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingVertical: 32,
                    },
                  ]}
                >
                  <Text style={s.eyebrow}>
                    {preview
                      ? "Preview · schedule stays unchanged"
                      : `Recall in ${languageName(practice.target)}`}
                  </Text>
                  <Text
                    style={{
                      color: c.ink,
                      textAlign: "center",
                      fontSize: 27,
                      lineHeight: 37,
                      marginVertical: 18,
                    }}
                  >
                    {practice.meaning}
                  </Text>
                  <Label muted>Say it aloud, or recall it in your head.</Label>
                  {reveal ? (
                    <>
                      <View
                        style={{
                          width: 45,
                          height: 1,
                          backgroundColor: c.line,
                          margin: 14,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 24,
                          color: c.accentText,
                          textAlign: "center",
                        }}
                      >
                        {practice.phrase}
                      </Text>
                      <EntryExample entry={practice} />
                      <Button
                        small
                        icon={Volume2}
                        onPress={() =>
                          void audio.play(
                            "chat",
                            practice.phrase,
                            practice.target,
                          )
                        }
                      >
                        Hear it
                      </Button>
                    </>
                  ) : (
                    <Button primary onPress={() => setReveal(true)}>
                      Reveal answer
                    </Button>
                  )}
                </View>
                {reveal &&
                  (preview ? (
                    <Button
                      onPress={() => {
                        setPreviewIndex((i) => i + 1);
                        setReveal(false);
                      }}
                    >
                      Next preview
                    </Button>
                  ) : (
                    <>
                      <Label muted style={{ textAlign: "center" }}>
                        How did that feel?
                      </Label>
                      <View style={[s.wrap, { justifyContent: "center" }]}>
                        {(["again", "hard", "good", "easy"] as Grade[]).map(
                          (grade) => (
                            <Button
                              key={grade}
                              disabled={busy}
                              primary={grade === "good"}
                              onPress={() =>
                                void safely(async () => {
                                  await mutate((p) => ({
                                    ...p,
                                    entries: p.entries.map((e) =>
                                      e.id === practice.id
                                        ? review(e, grade)
                                        : e,
                                    ),
                                  }));
                                  setReveal(false);
                                  report(
                                    `Review saved · next practice ${review(practice, grade).due}.`,
                                  );
                                })
                              }
                            >{`${grade[0].toUpperCase()}${grade.slice(1)} · ${review(practice, grade).interval}d`}</Button>
                          ),
                        )}
                      </View>
                    </>
                  ))}
                {preview && (
                  <Button
                    onPress={() => {
                      setPreview(false);
                      setReveal(false);
                    }}
                  >
                    Back to today
                  </Button>
                )}
              </>
            ) : (
              <View
                style={[s.card, { alignItems: "center", paddingVertical: 40 }]}
              >
                <View style={styles.largeIcon}>
                  <Check size={38} color={c.accent} />
                </View>
                <Text style={s.title}>
                  {reviewEntries.length
                    ? "You’re all caught up."
                    : "Tomorrow starts with a phrase."}
                </Text>
                <Label muted style={{ textAlign: "center" }}>
                  {reviewEntries.length
                    ? "New phrases arrive the next local calendar day. A few minutes is all it takes to keep them close."
                    : "Save something useful in your conversation today. It will be ready for recall tomorrow."}
                </Label>
                {reviewEntries.length > 0 ? (
                  <Button
                    onPress={() => {
                      setPreview(true);
                      setReveal(false);
                    }}
                  >
                    Preview saved phrases
                  </Button>
                ) : (
                  <Button onPress={() => changeTab("chat")}>
                    Find your first phrase
                  </Button>
                )}
              </View>
            )}
          </ScrollView>
        )}
        {!!notice && !panel && !selection && !editingEntry && !contextSheet && (
          <View style={styles.notice}>
            <Label style={{ flex: 1, fontSize: 12 }}>{notice}</Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss notice"
              onPress={() => setNotice("")}
            >
              <X color={c.accent} size={18} />
            </Pressable>
          </View>
        )}
        {issueSheet && (
          <IssueSheet
            issue={issueSheet === "new" ? undefined : issueSheet}
            native={conversation.native}
            onClose={() => setIssueSheet(null)}
            onSave={(text) => issues.save(
              issueSheet === "new" ? newIssue(text, conversation.native, conversation.target) : editIssue(issueSheet, text),
            )}
            onDelete={issueSheet === "new" ? undefined : () => issues.remove(issueSheet.id)}
          />
        )}
        {drawerOpen && (
          <NavigationDrawer
            conversations={data.conversations}
            savedConversationIds={data.savedConversations.map(
              (context) => context.id,
            )}
            activeConversationId={tab === "chat" ? conversation.id : undefined}
            dictionarySelected={tab === "dictionary"}
            conversationsSelected={tab === "conversations"}
            roleplaySelected={tab === "roleplay"}
            grammarSelected={tab === "grammar"}
            statsSelected={tab === "stats"}
            issuesSelected={tab === "issues"}
            onIssues={() => changeTab("issues")}
            videosSelected={tab === "videos"}
            onVideos={() => changeTab("videos")}
            savedDataStatus={savedDataStatus}
            onClose={() => setDrawerOpen(false)}
            onNewChat={() => void safely(() => newChat())}
            onDictionary={() => changeTab("dictionary")}
            onSavedConversations={() => changeTab("conversations")}
            onRoleplay={() => changeTab("roleplay")}
            onGrammar={() => changeTab("grammar")}
            onStats={() => changeTab("stats")}
            onConversation={(id) => void safely(() => openConversation(id))}
          />
        )}
        {panel === "conversation" && (
          <Sheet title="This conversation" onClose={() => setPanel(null)}>
            {activeContext && (
              <Button
                icon={BookmarkPlus}
                disabled={!account || !contextsReady}
                onPress={() => {
                  openContext(activeContext);
                  setPanel(null);
                }}
              >
                Conversation details & saved words
              </Button>
            )}
            {!account && (
              <Button primary onPress={() => setGuest(false)}>
                Sign in to save conversations
              </Button>
            )}
            <Button icon={Settings2} onPress={() => setPanel("account")}>
              App settings
            </Button>
          </Sheet>
        )}
        {sheetContext && !rehearsal && !liveReading && (
          <SavedConversationSheet
            key={sheetContext.id}
            context={sheetContext}
            entries={data.entries}
            isNew={sheetIsNew}
            summaryLanguage={sheetSummaryLanguage ?? sheetContext.native}
            canSummarize={!!sheetSource && settings.mode === "api"}
            lastMessageId={sheetSource?.messages.at(-1)?.id}
            onClose={() => {
              void audio.stop();
              setContextSheet(null);
            }}
            onSave={async (value) => {
              await saveContext(value);
              outlineIfMissing(value);
            }}
            scriptStep={scriptBusy?.id === sheetContext.id ? scriptBusy.step : null}
            chatMovedOn={!!sheetContext.outline && !!sheetSource && sheetSource.messages.at(-1)?.id !== sheetContext.outlineSourceMessageId}
            onOutline={settings.mode === "api" && (sheetSource || sheetContext.outline) ? (change) => scriptWork(sheetContext, "outline", change) : undefined}
            canRestart={!!sheetSource}
            onPractise={(script) => setRehearsal({ script, record: false, contextId: sheetContext.id })}
            onRecord={(script) => setRehearsal({ script, record: true, contextId: sheetContext.id })}
            onRead={(script) => setLiveReading({ kind: "lesson", id: sheetContext.id, title: sheetContext.title, language: sheetContext.target, script })}
            onTranslate={settings.mode === "api" ? (text, sentence) =>
              translate(text, sheetContext.target, sheetContext.native,
                // The sentence it came from tells the translator which meaning is wanted.
                [{ id: "script", role: "assistant", text: sentence, final: true, createdAt: new Date().toISOString() }],
                { ...settings, native: sheetContext.native, target: sheetContext.target }) : undefined}
            onScript={settings.mode === "api" ? () => scriptWork(sheetContext, "script") : undefined}
            onSummarize={(previous) =>
              summarizeConversation(
                sheetSource!.messages,
                {
                  ...settings,
                  native: sheetSummaryLanguage ?? sheetContext.native,
                  target: sheetContext.target,
                },
                previous,
              )
            }
            onPractice={() => repeatConversation(sheetContext)}
            onReview={() => {
              setContextSheet(null);
              setReviewContextId(sheetContext.id);
              changeTab("practice");
              setPreview(true);
              setPreviewIndex(0);
            }}
            onOriginal={
              data.conversations.some((chat) => chat.id === sheetContext.id)
                ? () => {
                    setContextSheet(null);
                    void safely(() => openConversation(sheetContext.id));
                  }
                : undefined
            }
            onLink={(entry) =>
              mutate((previous) => ({
                ...previous,
                entries: previous.entries.map((old) =>
                  old.id === entry.id ? linkEntry(old, sheetContext.id) : old,
                ),
              }))
            }
          />
        )}
        {panel === "translate" && (
          <TranslateSheet
            conversation={conversation}
            settings={settings}
            onClose={() => void close()}
            onInsert={(text) => {
              draft(
                `${composerRef.current}${composerRef.current ? " " : ""}${text}`,
              );
              void close();
            }}
            onSave={save}
            report={report}
            audioState={audioState}
          />
        )}
        {panel === "lexicon" && activeContext && (
          <ConversationLexiconSheet
            title={activeContext.title}
            words={contextEntries(data.entries, activeContext.id)}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "grammarReminder" && conversation.grammar && (
          <GrammarReminderSheet
            grammar={conversation.grammar}
            onClose={() => setPanel(null)}
          />
        )}
        {selection && (
          <SelectionSheet
            message={selection.message}
            range={selection.range}
            conversation={conversation}
            settings={settings}
            onClose={() => void close()}
            onSave={save}
            report={report}
            onCorrect={(text) =>
              updateConversation(
                conversation.messages.map((m) =>
                  m.id === selection.message.id ? { ...m, text } : m,
                ),
              )
            }
          />
        )}
        {panel === "feedback" && <FeedbackSheet native={settings.native} target={settings.target} screen={tab}
          draft={feedbackDraft} onDraft={setFeedbackDraft} language={feedbackLanguage} onLanguage={setFeedbackLanguage} onClose={() => setPanel(null)} />}
        {panel === "settings" && (
          <SettingsPage
            title="Languages"
            subtitle="Changes start a new conversation; history keeps its original languages."
            onClose={() => setPanel(null)}
            onBack={() => setPanel("account")}
          >
            {(["native", "target"] as const).map((kind) => (
              <SettingsSection key={kind} title={kind === "native" ? "I think in" : "I’m practising"}>
                <View style={[s.wrap, { paddingTop: 8 }]}>
                  {languages.map((language) => (
                    <Button
                      key={language.code}
                      small
                      primary={languageChoice[kind] === language.code}
                      disabled={busy}
                      onPress={() => setLanguageChoice((choice) => ({ ...choice, [kind]: language.code }))}
                    >
                      {language.name}
                    </Button>
                  ))}
                </View>
              </SettingsSection>
            ))}
            <Button
              primary
              disabled={busy || languageChoice.native === languageChoice.target}
              onPress={() => void safely(async () => {
                preserveTranscriptPosition.current = false;
                await audio.stop();
                await mutate((previous) => startLanguageConversation(previous, languageChoice.native, languageChoice.target));
                draft("");
                setPanel(null);
                setTab("chat");
              })}
            >
              Start with these languages
            </Button>
            {languageChoice.native === languageChoice.target && (
              <Label muted>Choose a different language to practise.</Label>
            )}
            <Label muted>
              Speech uses the app microphone and the selected language. Some
              devices send speech to Apple or Google recognition services. Saved
              words and reviews need an internet connection; speech availability
              varies by device.
            </Label>
          </SettingsPage>
        )}
        {panel === "account" && (
          <SettingsScreen
            email={account?.email ?? undefined}
            nativeLanguage={languageName(data.settings.native)}
            targetLanguage={languageName(data.settings.target)}
            targetLanguageCode={data.settings.target}
            autoSpeak={data.settings.autoSpeak}
            entryCount={data.entries.length}
            conversationCount={data.savedConversations.length}
            dictionaryConnected={dictionaryConnected}
            busy={busy}
            notice={notice}
            localTest={!!emulatorHost}
            subscriptionLabel={trial.value?.subscribed ? "Plus" : trial.value?.enabled ? `${trial.label} free` : "Coming soon"}
            onSubscription={openPaywall}
            onClose={() => setPanel(null)}
            onFeedback={openFeedback}
            googleLinked={account?.providerData.some((item) => item.providerId === "google.com")}
            onGoogle={googleSignInConfigured ? () => void safely(signInWithGoogle, "Google sign-in is linked to your account.") : undefined}
            onLanguages={() => {
              setLanguageChoice({ native: data.settings.native, target: data.settings.target });
              setPanel("settings");
            }}
            onAutoSpeak={(value) => void safely(() => mutate((p) => ({
              ...p, settings: { ...p.settings, autoSpeak: value },
            })))}
            speaker={data.settings.speaker}
            onSpeaker={(speaker) => void safely(() => mutate((p) => {
              const { speaker: old, ...rest } = p.settings;
              return { ...p, settings: speaker ? { ...rest, speaker } : rest };
            }))}
            translateReplies={translatesReplies(settings)}
            onTranslateReplies={(value) => void safely(() => mutate((p) => ({
              ...p, settings: { ...p.settings, translateReplies: { ...p.settings.translateReplies, [settings.target]: value } },
            })))}
            onSignOut={() => void safely(async () => {
              await audio.stop();
              await signOut();
            })}
            onSignIn={() => setGuest(false)}
          />
        )}
        {paywallOpen && <PaywallScreen uid={account?.uid} access={trial.value ?? inactiveAccess}
          onClose={() => { setPaywallDismissed(true); setPaywallOpen(false); }}
          onUnlocked={() => { setPaywallOpen(false); setPaywallDismissed(false); void trial.refresh(); }} />}
        {editingEntry && (
          <Sheet title="Your phrase" onClose={() => setEditingEntry(null)}>
            <Label muted>
              {languageName(editingEntry.target)} →{" "}
              {languageName(editingEntry.native)}
            </Label>
            <Field
              accessibilityLabel="Edit phrase"
              placeholder="Word or phrase"
              value={editingEntry.phrase}
              onChangeText={(phrase) =>
                setEditingEntry({ ...editingEntry, phrase })
              }
              multiline
            />
            <Field
              accessibilityLabel="Edit translation"
              placeholder="Translation"
              value={editingEntry.meaning}
              onChangeText={(meaning) =>
                setEditingEntry({ ...editingEntry, meaning })
              }
              multiline
            />
            {editingEntry.example ? (
              <View style={{ gap: 10 }}>
                <Label muted>EXAMPLE</Label>
                <Field
                  accessibilityLabel="Edit example"
                  placeholder="Short example"
                  multiline
                  maxLength={600}
                  value={editingEntry.example.text}
                  onChangeText={(text) =>
                    setEditingEntry({
                      ...editingEntry,
                      example: { ...editingEntry.example!, text },
                    })
                  }
                />
                <Field
                  accessibilityLabel="Edit example translation"
                  placeholder="Example translation"
                  multiline
                  maxLength={2000}
                  value={editingEntry.example.translation}
                  onChangeText={(translation) =>
                    setEditingEntry({
                      ...editingEntry,
                      example: { ...editingEntry.example!, translation },
                    })
                  }
                />
                <Button
                  small
                  disabled={busy}
                  onPress={() => {
                    const { example, ...entry } = editingEntry;
                    setEditingEntry(entry);
                  }}
                >
                  Remove example
                </Button>
              </View>
            ) : (
              <Button
                small
                onPress={() =>
                  setEditingEntry({
                    ...editingEntry,
                    example: { text: "", translation: "" },
                  })
                }
              >
                Add example
              </Button>
            )}
            <Button
              primary
              disabled={
                busy ||
                !editingEntry.phrase.trim() ||
                !editingEntry.meaning.trim() ||
                (!!editingEntry.example &&
                  (!editingEntry.example.text.trim() ||
                    !editingEntry.example.translation.trim()))
              }
              onPress={() =>
                void safely(async () => {
                  await mutate((p) => {
                    if (
                      p.entries.some(
                        (e) =>
                          e.id !== editingEntry.id &&
                          duplicateKey(e) === duplicateKey(editingEntry),
                      )
                    )
                      throw new Error(
                        "That phrase is already in your dictionary.",
                      );
                    const old = p.entries.find(
                      (e) => e.id === editingEntry.id,
                    )!;
                    const changed = old.phrase !== editingEntry.phrase;
                    return {
                      ...p,
                      entries: p.entries.map((e) =>
                        e.id === editingEntry.id
                          ? {
                              ...editingEntry,
                              ...(changed
                                ? { start: undefined, end: undefined }
                                : {}),
                            }
                          : e,
                      ),
                    };
                  });
                  setEditingEntry(null);
                }, "Dictionary updated.")
              }
            >
              Save changes
            </Button>
            <Button
              danger
              icon={Trash2}
              disabled={busy}
              onPress={() => {
                if (deleteId !== editingEntry.id) setDeleteId(editingEntry.id);
                else
                  void safely(async () => {
                    await mutate((p) => ({
                      ...p,
                      entries: p.entries.filter(
                        (e) => e.id !== editingEntry.id,
                      ),
                    }));
                    setEditingEntry(null);
                  }, "Phrase deleted.");
              }}
            >
              {deleteId === editingEntry.id
                ? "Confirm delete phrase"
                : "Delete phrase"}
            </Button>
            {!!notice && <Label>{notice}</Label>}
          </Sheet>
        )}
      </KeyboardAvoidingView>
      {/* Practice covers the whole app. The saved conversation's sheet steps aside
          while it is open and comes back when it closes. */}
      {watching && watchingNow && (
        <VideoScreen
          video={watchingNow}
          // Only the learner's own videos can be given a transcript from here.
          onTranscript={ownVideos.some((item) => item.id === watching.id) ? (result) => {
            const own = ownVideos.find((item) => item.id === watching.id);
            if (!own || own.lines.length) return;
            const { note: _old, ...kept } = own;
            const next: Video = "lines" in result ? { ...kept, lines: result.lines, status: "ready" } : { ...kept, status: "none", note: result.note.slice(0, 200) };
            void saveMyVideo(account?.uid, next)
              .then(() => { if (next.status === "none") void requestTranscript(account?.uid, next); })
              .catch((error) => report(error.message ?? "The subtitles could not be saved."));
          } : undefined}
          conversation={conversation}
          settings={settings}
          saved={videoPhrases}
          onSave={(entry) => saveFromVideo(entry, watching)}
          discussed={data.conversations.some((item) => item.id === videoContextId(watching.youtubeId) && item.messages.length > 0)}
          onDiscuss={() => void safely(() => discussVideo(watching))}
          onPractise={(script) => setRehearsal({ script, record: false })}
          onRecord={(script) => setRehearsal({ script, record: true })}
          onRead={() => setLiveReading({ kind: "video", video: watching, saved: videoPhrases })}
          onWatched={(durationMs) => void logActivity(account?.uid, {
            kind: "watch", source: "video", sourceId: watching.youtubeId, title: watching.title.slice(0, 200), language: watching.language, durationMs,
          })}
          report={report}
          onClose={() => setWatching(null)}
        />
      )}
      {rehearsal && (() => {
        const shared = {
          script: rehearsal.script,
          meanings: rehearsalMeanings,
          onMissing: rehearsal.contextId && settings.mode === "api" ? (missing: { text: string; sentence: string }[]) => findMeanings(rehearsal.script, rehearsal.contextId!, missing) : undefined,
          onRests: settings.mode === "api" ? (missing: { start: string; rest: string }[]) => findRests(missing, conversation.native, conversation.target) : undefined,
          speed: data.settings.readingSpeed ?? defaultReadingSpeed,
          onSpeed: (readingSpeed: number) => void mutate((p) => ({ ...p, settings: { ...p.settings, readingSpeed } })).catch((error) => report(error.message)),
          onClose: () => setRehearsal(null),
        };
        if (!rehearsal.record) return <PracticeScreen {...shared} />;
        // A take is logged against the lesson or the video whose text was read.
        const lesson = data.savedConversations.find((item) => item.id === rehearsal.contextId);
        const read = lesson
          ? { source: "lesson" as const, sourceId: lesson.id, title: lesson.title, language: lesson.target }
          : watching
            ? { source: "video" as const, sourceId: watching.youtubeId, title: watching.title.slice(0, 200), language: watching.language }
            : undefined;
        return <RecordScreen {...shared} onRecorded={(durationMs) => { if (read) void logActivity(account?.uid, { kind: "recording", ...read, durationMs }); }} />;
      })()}
      {liveReading && (
        <ReadingScreen
          source={liveReading}
          speed={data.settings.readingSpeed ?? defaultReadingSpeed}
          meanings={rehearsalMeanings}
          earlier={readings.filter((reading) => reading.language === (liveReading.kind === "video" ? liveReading.video.language : liveReading.language))}
          onMissing={liveReading.kind === "lesson" && settings.mode === "api"
            ? (missing) => findMeanings(liveReading.script, liveReading.id, missing) : undefined}
          onRests={settings.mode === "api" ? (missing) => findRests(missing, conversation.native, conversation.target) : undefined}
          onSpeed={(readingSpeed) => void mutate((p) => ({ ...p, settings: { ...p.settings, readingSpeed } })).catch((error) => report(error.message))}
          onSave={(reading) => saveReading(account?.uid ?? "", { ...reading, id: id(), createdAt: new Date().toISOString() })}
          onClose={() => setLiveReading(null)}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    backgroundColor: c.bg,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 30,
    backgroundColor: c.bg,
  },
  transcript: {
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  emptyChat: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 65,
  },
  greeting: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 39,
    textAlign: "center",
    letterSpacing: -0.8,
    color: c.ink,
  },
  message: { width: "100%", alignSelf: "flex-start", gap: 5 },
  userMessage: {
    width: Platform.OS === "web" ? "auto" : "88%",
    maxWidth: "88%",
    alignSelf: "flex-end",
  },
  userBubble: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: c.bubble,
    borderRadius: 22,
  },
  messageAction: {
    alignSelf: "flex-start",
    minHeight: 36,
    width: 36,
    paddingHorizontal: 7,
    paddingVertical: 8,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: c.bg,
  },
  composerCard: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 27,
    backgroundColor: c.paper,
    padding: 9,
    boxShadow: `0px 2px 10px ${c.shadow}0A`,
  },
  composerInput: {
    minHeight: 54,
    maxHeight: 150,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontSize: 17,
    lineHeight: 25,
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  composerTools: { flexDirection: "row", alignItems: "center", gap: 3 },
  translateButton: {
    minHeight: 44,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  lexiconButton: {
    width: 42,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  saveConversationButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  modelButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 44,
    maxWidth: 88,
    paddingHorizontal: 5,
  },
  modelText: {
    flexShrink: 1,
    fontFamily: fonts.sans,
    color: c.muted,
    fontSize: 13,
  },
  micButton: {
    width: 40,
    minHeight: 44,
    paddingHorizontal: 8,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  sendButton: {
    width: 38,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 19,
  },
  audioStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 6,
    minHeight: 28,
  },
  plainButton: { borderWidth: 0, backgroundColor: "transparent" },
  page: { padding: 24, gap: 18, paddingBottom: 35 },
  dictionaryPage: { paddingHorizontal: 20, paddingTop: 12, gap: 10, paddingBottom: 24 },
  pageTitle: {
    fontFamily: fonts.serif,
    color: c.ink,
    fontSize: 33,
    lineHeight: 40,
    fontWeight: "400",
    letterSpacing: -0.8,
  },
  statsList: { gap: 10 },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: c.pale,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily: fonts.serif,
    color: c.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "400",
  },
  largeIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: c.pale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  corrections: {
    marginTop: 8,
    paddingLeft: 12,
    paddingVertical: 4,
    gap: 4,
    borderLeftWidth: 2,
    borderLeftColor: c.accent,
  },
  correctionsText: { color: c.ink, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  notice: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.yellow,
    borderTopWidth: 1,
    borderColor: c.line,
  },
});

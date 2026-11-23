import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import YoutubePlayer, { type YoutubeIframeRef } from "react-native-youtube-iframe";
import { BookOpen, MessageCircle, Mic, Plus, Languages, Pause, Play, Repeat, RotateCcw, SkipForward, Snail, Trash2, Video as Camera, X } from "lucide-react-native";
import { languageName, type Conversation, type DictionaryInput, type Message, type Settings } from "../core/domain";
import type { PhraseRange } from "../core/selection";
import { addedToday, clock, lineAt, linksPerDay, savedRanges, thumbnail, transcriptScript, type Video, type VideoLine } from "../core/videos";
import { captionHook, captionReader } from "./CaptionFetcher";
import { SelectableMessage } from "./SelectableMessage";
import { SelectionSheet } from "./SelectionSheet";
import { Button, c, Field, fonts, Label, s } from "./components";
import { DisplayText } from "./DisplayText";
import { Control, stage } from "./Prompter";

// One video in a list: its thumbnail, title and what can be done with it.
function VideoCard({ video, detail, onOpen, onDelete, deleteLabel = "Delete" }: {
  video: Video; detail: string; onOpen: () => void; onDelete?: () => Promise<void>; deleteLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const length = video.seconds ?? video.lines.at(-1)?.start;
  return (
    <View style={[s.card, { padding: 0, overflow: "hidden", gap: 0 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Watch and repeat: ${video.title}`}
        onPress={onOpen} style={({ pressed }) => pressed && { opacity: 0.8 }}>
        <View>
          <Image source={{ uri: thumbnail(video.youtubeId) }} accessibilityIgnoresInvertColors style={styles.thumbnail} resizeMode="cover" />
          {length !== undefined && <View style={styles.length}><Text style={styles.lengthText}>{clock(length)}</Text></View>}
        </View>
        <View style={styles.cardText}>
          <DisplayText style={[s.title, { fontSize: 18, lineHeight: 24 }]}>{video.title}</DisplayText>
          <Label muted>{detail}</Label>
        </View>
      </Pressable>
      {!!onDelete && (
        <View style={styles.cardActions}>
          <Button small danger icon={Trash2} disabled={deleting}
            onPress={() => {
              if (!confirming) return setConfirming(true);
              setDeleting(true);
              void onDelete().finally(() => { setDeleting(false); setConfirming(false); });
            }}>
            {deleting ? "Removing…" : confirming ? `Confirm: ${deleteLabel.toLowerCase()}` : deleteLabel}
          </Button>
          {confirming && !deleting && <Button small onPress={() => setConfirming(false)}>Keep</Button>}
        </View>
      )}
    </View>
  );
}
// Videos to watch and repeat: the ones the learner has added by link, and
// the library chosen for them.
export function VideosScreen({ videos, mine, ready, failed, account, language, pageTitleStyle, onSignIn, onOpen, onDelete, onAddLink, onRemoveMine }: {
  videos: Video[];
  // The learner's own videos, added by link.
  mine: Video[];
  ready: boolean;
  failed?: boolean;
  account: boolean;
  language: string;
  pageTitleStyle: object;
  onSignIn: () => void;
  onOpen: (video: Video) => void;
  // Present only for an admin, who may take a video out of the library.
  onDelete?: (video: Video) => Promise<void>;
  // Adds the video at this YouTube link to the learner's own.
  onAddLink: (link: string) => Promise<void>;
  onRemoveMine: (video: Video) => Promise<void>;
}) {
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);
  const [issue, setIssue] = useState("");
  const left = Math.max(0, linksPerDay - addedToday(mine));
  async function add() {
    if (!link.trim() || adding) return;
    setIssue("");
    setAdding(true);
    try {
      await onAddLink(link);
      setLink("");
    } catch (error: any) {
      setIssue(error.message ?? "The video could not be added.");
    } finally {
      setAdding(false);
    }
  }
  return (
    <>
      <DisplayText style={pageTitleStyle}>Watch and repeat.</DisplayText>
      <Label muted>
        Listen to someone speaking {languageName(language)}, then say each line after them, following the words.
      </Label>
      {!account && <Button primary onPress={onSignIn}>Sign in to see the videos</Button>}
      {account && (
        <View style={[s.card, { gap: 10 }]}>
          <Text style={s.eyebrow}>Add a video from YouTube</Text>
          <Label muted>
            Find a {languageName(language)} video in YouTube, tap Share, copy its link and paste it here. Its subtitles are picked up the first time you watch it.
          </Label>
          <Field accessibilityLabel="YouTube link" placeholder="Paste a YouTube link" value={link} onChangeText={setLink}
            autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="done" onSubmitEditing={() => void add()} />
          <Button primary icon={Plus} disabled={!link.trim() || adding || !left} onPress={() => void add()}>{adding ? "Adding…" : "Add video"}</Button>
          <Label muted>{left ? `${left} of ${linksPerDay} left today` : `You have added ${linksPerDay} videos today. You can add more tomorrow.`}</Label>
          {!!issue && <Label style={{ color: c.danger }}>{issue}</Label>}
        </View>
      )}
      {mine.length > 0 && <Text style={s.eyebrow}>Your videos</Text>}
      {mine.map((video) => (
        <VideoCard key={video.id} video={video} onOpen={() => onOpen(video)} onDelete={() => onRemoveMine(video)} deleteLabel="Remove"
          detail={video.lines.length ? `${video.lines.length} lines${video.channel ? ` · ${video.channel}` : ""}`
            : video.status === "none" ? `No subtitles were found last time. Open it to try again.${video.note ? ` (${video.note})` : ""}`
            : "Its subtitles are picked up the first time you watch it."} />
      ))}
      {account && (mine.length > 0 || videos.length > 0) && <Text style={s.eyebrow}>Library</Text>}
      {account && !ready && !failed && <Label muted>Loading videos…</Label>}
      {failed && <Label muted>The videos could not be loaded. The app may not have permission to read them yet.</Label>}
      {ready && !videos.length && <Label muted>There are no {languageName(language)} videos in the library yet.</Label>}
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} detail={`${video.lines.length} lines`} onOpen={() => onOpen(video)}
          onDelete={onDelete ? () => onDelete(video) : undefined} />
      ))}
    </>
  );
}

// The video with its transcript beneath. The transcript follows the video: the
// app asks the player for the time a few times a second and highlights the
// line being spoken. In repeat mode the video stops after each line so the
// learner can say it. Words and phrases can be highlighted in a line and saved.
export function VideoScreen({ video, conversation, settings, saved, discussed, onSave, onDiscuss, onPractise, onRecord, onRead, onWatched, onTranscript, report, onClose }: {
  video: Video;
  // The current conversation, for the languages a saved phrase belongs to.
  conversation: Conversation;
  settings: Settings;
  // Phrases already in the dictionary, marked where they appear.
  saved: string[];
  onSave: (entry: DictionaryInput) => Promise<void>;
  // Talk about the video with the partner. There is one discussion for each video.
  discussed: boolean;
  onDiscuss: () => void;
  // Read the transcript aloud from the prompter, or film it, as with a script.
  onPractise: (script: string) => void;
  onRecord: (script: string) => void;
  // A live reading of a section of this video, transcribed and logged.
  onRead: () => void;
  // Told how long the video actually played, when the screen closes or the app is left.
  onWatched: (ms: number) => void;
  // For a video with no transcript yet: told its subtitles once they have been
  // read from the player, or why none could be.
  onTranscript?: (result: { lines: VideoLine[] } | { note: string }) => void;
  report: (text: string) => void;
  onClose: () => void;
}) {
  useKeepAwake();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const player = useRef<YoutubeIframeRef>(null);
  const list = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [slow, setSlow] = useState(false);
  const [translations, setTranslations] = useState(false);
  // In repeat mode, the line the video is playing through before it stops.
  const holding = useRef<number | null>(null);
  const lines = video.lines;
  const [selection, setSelection] = useState<{ line: number; message: Message; range: PhraseRange } | null>(null);
  // Following the video: the transcript moves only when the line being spoken
  // is about to leave view, and then slowly. It stays put while the learner is
  // reading elsewhere or highlighting words.
  const scrollY = useRef(0);
  const viewHeight = useRef(0);
  const heights = useRef<number[]>([]);
  const glide = useRef<number | null>(null);
  const handsOffUntil = useRef(0);
  const selecting = useRef(false);
  const messages = useMemo(
    () => lines.map((line, index): Message => ({ id: `line-${index}`, role: "assistant", text: line.text, final: true, createdAt: video.createdAt })),
    [lines, video.createdAt],
  );
  const marks = useMemo(() => lines.map((line) => savedRanges(line.text, saved)), [lines, saved]);
  function stopGlide() {
    if (glide.current !== null) cancelAnimationFrame(glide.current);
    glide.current = null;
  }
  function glideTo(target: number) {
    stopGlide();
    const from = scrollY.current, distance = target - from, began = Date.now();
    if (Math.abs(distance) < 2) return;
    // Longer moves take a little longer, so the text never rushes.
    const duration = Math.min(1600, 700 + Math.abs(distance) * 2);
    const step = () => {
      const t = Math.min(1, (Date.now() - began) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      list.current?.scrollTo({ y: from + distance * eased, animated: false });
      glide.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    glide.current = requestAnimationFrame(step);
  }
  useEffect(() => stopGlide, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      void player.current?.getCurrentTime().then((seconds) => {
        const index = lineAt(lines, seconds);
        if (repeat && holding.current !== null && index > holding.current) {
          // The line has finished: stop for the learner to say it.
          setPlaying(false);
          setWaiting(true);
          return;
        }
        if (holding.current === null) holding.current = index;
        setCurrent(index);
      }).catch(() => {});
    }, 200);
    return () => clearInterval(timer);
  }, [playing, repeat, lines]);
  useEffect(() => {
    if (selecting.current || Date.now() < handsOffUntil.current || !viewHeight.current) return;
    const top = offsets.current[current] ?? 0;
    const bottom = top + (heights.current[current] ?? 40);
    // Comfortably in view: leave the text alone.
    if (top >= scrollY.current + 20 && bottom <= scrollY.current + viewHeight.current * 0.65) return;
    glideTo(Math.max(0, top - viewHeight.current * 0.2));
  }, [current]);

  const lastJump = useRef({ line: -1, at: 0 });
  function playFrom(index: number) {
    // A video with no transcript simply plays.
    if (!lines.length) return void setPlaying(true);
    const line = Math.max(0, Math.min(lines.length - 1, index));
    // One tap can arrive twice, from the text and from the row around it.
    if (lastJump.current.line === line && Date.now() - lastJump.current.at < 400) return;
    lastJump.current = { line, at: Date.now() };
    handsOffUntil.current = 0;
    holding.current = line;
    setCurrent(line);
    setWaiting(false);
    player.current?.seekTo(lines[line].start, true);
    setPlaying(true);
  }
  function toggle() {
    if (waiting) return playFrom(current + 1);
    holding.current = null;
    handsOffUntil.current = 0;
    setPlaying(!playing);
  }
  // Time watching is time the video was playing, not time the screen was open.
  const watched = useRef(0);
  const reportWatched = useRef(onWatched);
  reportWatched.current = onWatched;
  useEffect(() => {
    if (!playing) return;
    const since = Date.now();
    return () => { watched.current += Date.now() - since; };
  }, [playing]);
  useEffect(() => {
    const flush = () => { if (watched.current > 0) reportWatched.current(watched.current); watched.current = 0; };
    const left = AppState.addEventListener("change", (state) => { if (state !== "active") { setPlaying(false); setTimeout(flush, 0); } });
    return () => { left.remove(); setTimeout(flush, 0); };
  }, []);
  // A video without a transcript shows YouTube's own subtitles in the language
  // being learned, and what the player is sent for them is read as it arrives.
  // Decided once, when the video opens: the player cannot change it afterwards.
  const capturing = useRef(!video.lines.length && !!onTranscript).current;
  const [captionNote, setCaptionNote] = useState("");
  const tellTranscript = useRef(onTranscript);
  tellTranscript.current = onTranscript;
  const reader = useMemo(() => (capturing
    ? captionReader(video.language, conversation.native, (found) => tellTranscript.current?.({ lines: found }),
        (other) => setCaptionNote(`Its subtitles are in ${other}.`))
    : undefined), []);
  useEffect(() => () => reader?.stop(), []);
  // Half a minute of playing with nothing read: say so, and leave a note of why.
  useEffect(() => {
    if (!capturing || !playing || lines.length) return;
    const timer = setTimeout(() => {
      const note = captionNote || "The player sent no subtitles.";
      setCaptionNote(note);
      tellTranscript.current?.({ note });
    }, 30000);
    return () => clearTimeout(timer);
  }, [capturing, playing, lines.length]);
  const hasTranslations = lines.some((line) => line.translation);
  const script = useMemo(() => transcriptScript(lines, saved), [lines, saved]);
  function rehearse(open: (script: string) => void) {
    stopGlide();
    holding.current = null;
    setWaiting(false);
    setPlaying(false);
    open(script);
  }
  return (
    <View accessibilityViewIsModal style={[styles.cover, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <YoutubePlayer
        ref={player}
        height={Math.round((width * 9) / 16)}
        videoId={video.youtubeId}
        play={playing}
        playbackRate={slow ? 0.75 : 1}
        initialPlayerParams={capturing
          ? { cc_lang_pref: video.language.slice(0, 2), showClosedCaptions: true, rel: false, preventFullScreen: true }
          : { cc_lang_pref: "xx", showClosedCaptions: false, rel: false, preventFullScreen: true }}
        webViewProps={capturing ? {
          injectedJavaScriptBeforeContentLoaded: captionHook(conversation.native.slice(0, 2).toLowerCase()),
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false,
        } : undefined}
        // The subtitle track arrives on this otherwise unused channel; see captionHook.
        onPlaybackQualityChange={(data: unknown) => reader?.receive(data)}
        onChangeState={(state: string) => {
          // Keep the app's idea of playing in step with the player's own controls.
          if (state === "playing") { setPlaying(true); setWaiting(false); }
          if (state === "paused" || state === "ended") setPlaying(false);
          // The video is over: bring what to do next into view.
          if (state === "ended" && !selecting.current) list.current?.scrollToEnd({ animated: true });
        }}
      />
      <ScrollView
        ref={list}
        style={{ flex: 1 }}
        contentContainerStyle={styles.transcript}
        scrollEventThrottle={16}
        onLayout={(event) => { viewHeight.current = event.nativeEvent.layout.height; }}
        onScroll={(event) => { scrollY.current = event.nativeEvent.contentOffset.y; }}
        // The learner has taken hold of the text: stop following for a while.
        onScrollBeginDrag={() => { stopGlide(); handsOffUntil.current = Date.now() + 8000; }}
        onScrollEndDrag={() => { handsOffUntil.current = Date.now() + 8000; }}
      >
        {lines.map((line, index) => (
          <Pressable
            key={index}
            accessibilityRole="button"
            accessibilityState={{ selected: index === current }}
            accessibilityLabel={`${clock(line.start)}. ${line.text}`}
            accessibilityHint="Plays the video from this line. Press and hold a word to save it."
            onLayout={(event) => {
              offsets.current[index] = event.nativeEvent.layout.y;
              heights.current[index] = event.nativeEvent.layout.height;
            }}
            onPress={() => { if (!selecting.current) playFrom(index); }}
            style={[styles.line, index === current && styles.currentLine]}
          >
            <View style={{ flex: 1 }}>
              <SelectableMessage
                onPress={() => playFrom(index)}
                message={messages[index]}
                enabled
                textColor={index === current ? stage.text : stage.dim}
                accentColor={stage.line}
                accentRanges={marks[index]}
                onSelecting={(active) => {
                  selecting.current = active;
                  if (!active) return void (handsOffUntil.current = Date.now() + 4000);
                  // Hold everything still while words are being highlighted.
                  stopGlide();
                  holding.current = null;
                  setWaiting(false);
                  setPlaying(false);
                }}
                onSelect={(range) => {
                  setPlaying(false);
                  setSelection({ line: index, message: messages[index], range });
                }}
              />
              {translations && !!line.translation && <Text style={styles.translation}>{line.translation}</Text>}
            </View>
          </Pressable>
        ))}
        {!lines.length && (
          <Text style={[styles.promptText, { flex: 0, padding: 12, color: stage.dim }]}>
            {captionNote
              ? `No subtitles could be read for this video, so there are no words to follow. You can still watch it. (${captionNote})`
              : capturing
                ? `Press play. The video's ${languageName(video.language)} subtitles are picked up as it starts, and the words will appear here.`
                : "This video has no transcript, so there are no words to follow. You can still watch it."}
          </Text>
        )}
        {lines.length > 0 && <View style={styles.after}>
          <Text style={styles.afterTitle}>Now say it yourself</Text>
          <Pressable accessibilityRole="button" onPress={() => { stopGlide(); setPlaying(false); onDiscuss(); }}
            style={({ pressed }) => [styles.afterButton, styles.afterPrimary, { flex: 0 }, pressed && { opacity: 0.7 }]}>
            <MessageCircle color={stage.background} size={18} />
            <Text style={[styles.afterText, { color: stage.background }]}>{discussed ? "Continue discussion" : "Start discussion"}</Text>
          </Pressable>
          <View style={styles.afterRow}>
            <Pressable accessibilityRole="button" onPress={() => rehearse(onPractise)} style={({ pressed }) => [styles.afterButton, pressed && { opacity: 0.7 }]}>
              <BookOpen color={stage.text} size={18} />
              <Text style={styles.afterText}>Practise</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => rehearse(onRecord)} style={({ pressed }) => [styles.afterButton, pressed && { opacity: 0.7 }]}>
              <Camera color={stage.text} size={18} />
              <Text style={styles.afterText}>Record</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" onPress={() => { stopGlide(); holding.current = null; setWaiting(false); setPlaying(false); onRead(); }}
            style={({ pressed }) => [styles.afterButton, { flex: 0 }, pressed && { opacity: 0.7 }]}>
            <Mic color={stage.text} size={18} />
            <Text style={styles.afterText}>Live reading</Text>
          </Pressable>
        </View>}
      </ScrollView>
      {waiting && (
        <View style={styles.prompt}>
          <Text style={styles.promptText}>Your turn. Say the line, then carry on.</Text>
          <Pressable accessibilityRole="button" onPress={() => playFrom(current)} style={styles.again}>
            <RotateCcw color={stage.text} size={16} />
            <Text style={styles.againText}>Hear it again</Text>
          </Pressable>
        </View>
      )}
      <SafeAreaView edges={["bottom"]} style={styles.bar}>
        <Control icon={X} label="Close video" onPress={onClose} />
        <Control icon={Repeat} label={repeat ? "Repeat mode on: the video stops after each line" : "Turn on repeat mode"} active={repeat}
          onPress={() => { holding.current = null; setWaiting(false); setRepeat(!repeat); }} />
        <Control icon={Snail} label={slow ? "Normal speed" : "Slower speech"} active={slow} onPress={() => setSlow(!slow)} />
        {hasTranslations && <Control icon={Languages} label={translations ? "Hide translations" : "Show translations"} active={translations} onPress={() => setTranslations(!translations)} />}
        <Control icon={RotateCcw} label="Hear this line again" onPress={() => playFrom(current)} />
        <Pressable accessibilityRole="button" accessibilityLabel={waiting ? "Next line" : playing ? "Pause" : "Play"}
          onPress={toggle} style={({ pressed }) => [styles.play, pressed && { opacity: 0.7 }]}>
          {waiting ? <SkipForward color={stage.background} size={24} /> : playing ? <Pause color={stage.background} size={24} /> : <Play color={stage.background} size={24} />}
        </Pressable>
      </SafeAreaView>
      {selection && (
        <SelectionSheet
          message={selection.message}
          range={selection.range}
          conversation={{ ...conversation, target: video.language }}
          settings={settings}
          source="video"
          knownTranslation={lines[selection.line]?.translation ?? ""}
          onClose={() => setSelection(null)}
          onSave={onSave}
          report={report}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, backgroundColor: stage.background },
  transcript: { paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
  line: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  thumbnail: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#D9D5CA" },
  length: { position: "absolute", right: 8, bottom: 8, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.75)" },
  lengthText: { color: "#FFFFFF", fontFamily: fonts.sans, fontSize: 12, fontWeight: "600" },
  cardText: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 2 },
  cardActions: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  after: { marginTop: 18, marginBottom: 10, paddingTop: 16, paddingHorizontal: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: stage.dim },
  afterTitle: { color: stage.dim, fontFamily: fonts.sans, fontSize: 13, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  afterRow: { flexDirection: "row", gap: 10 },
  afterButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: stage.dim },
  afterPrimary: { backgroundColor: stage.line, borderColor: stage.line },
  afterText: { color: stage.text, fontFamily: fonts.sans, fontSize: 16, fontWeight: "600" },
  currentLine: { backgroundColor: "#2F2C25" },
  translation: { marginTop: 2, color: stage.dim, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  prompt: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: "#3A3320" },
  promptText: { flex: 1, color: stage.text, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  again: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: stage.dim },
  againText: { color: stage.text, fontFamily: fonts.sans, fontSize: 13, fontWeight: "600" },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, backgroundColor: stage.bar },
  play: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: stage.line },
});

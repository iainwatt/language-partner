import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { screenRecording } from "../services/screenRecording";
import { tellPlayer } from "./playerCommands";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import YoutubePlayer, { type YoutubeIframeRef } from "react-native-youtube-iframe";
import { Circle, MessageCircle, Mic, Plus, Languages, Pause, Play, RotateCcw, Square, Trash2, VolumeX, X } from "lucide-react-native";
import { languageName, type Conversation, type DictionaryInput, type Message, type Settings } from "../core/domain";
import type { PhraseRange } from "../core/selection";
import { addedToday, clock, lineAt, linksPerDay, meaningRanges, savedRanges, thumbnail, type Video, type VideoLine } from "../core/videos";
import { meaningKey } from "../core/practice";
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
// line being spoken. Practising mutes the video and leaves everything else as
// it is, so the learner says each line as it lights up. The saved words in the
// line being spoken are shown with their meanings above the bar; words and
// phrases can be highlighted in a line and saved.
export function VideoScreen({ video, conversation, settings, saved, meanings, discussed, onSave, onDiscuss, onRecorded, onRead, onWatched, onTranscript, report, onClose }: {
  video: Video;
  // The current conversation, for the languages a saved phrase belongs to.
  conversation: Conversation;
  settings: Settings;
  // Phrases already in the dictionary, marked where they appear.
  saved: string[];
  // What those phrases mean, looked up with meaningKey, to show while their line is being spoken.
  meanings: Record<string, string>;
  onSave: (entry: DictionaryInput) => Promise<void>;
  // Talk about the video with the partner. There is one discussion for each video.
  discussed: boolean;
  onDiscuss: () => void;
  // Told the length of each practice take the learner kept.
  onRecorded: (ms: number) => void;
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
  const [translations, setTranslations] = useState(false);
  // Practising: the video carries on without its sound, and the learner says
  // each line as it lights up. Everything else about the screen stays as it is.
  const [practising, setPractising] = useState(false);
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
  // In each line's translation, where the meanings of its saved words appear.
  const translationMarks = useMemo(() => lines.map((line, index) =>
    line.translation
      ? meaningRanges(line.translation, marks[index].flatMap((range) => meanings[meaningKey(line.text.slice(range.start, range.end))] ?? []))
      : []), [lines, marks, meanings]);
  // The learner's saved words in the line being spoken, with what they mean.
  // They are shown above the bar for as long as that line is lit.
  const lineWords = useMemo(() => {
    const line = lines[current];
    const seen = new Set<string>();
    return (line ? marks[current] ?? [] : []).flatMap((range) => {
      const phrase = line.text.slice(range.start, range.end);
      const meaning = meanings[meaningKey(phrase)];
      if (!meaning || seen.has(meaningKey(phrase))) return [];
      seen.add(meaningKey(phrase));
      return [{ phrase, meaning }];
    });
  }, [lines, marks, meanings, current]);
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
        position.current = seconds;
        setCurrent(lineAt(lines, seconds));
      }).catch(() => {});
    }, 200);
    return () => clearInterval(timer);
  }, [playing, lines]);
  useEffect(() => {
    if (selecting.current || Date.now() < handsOffUntil.current || !viewHeight.current) return;
    const top = offsets.current[current] ?? 0;
    const bottom = top + (heights.current[current] ?? 40);
    // Comfortably in view: leave the text alone.
    if (top >= scrollY.current + 20 && bottom <= scrollY.current + viewHeight.current * 0.65) return;
    glideTo(Math.max(0, top - viewHeight.current * 0.2));
  }, [current]);

  // Play, pause and mute are sent to the player directly; see tellPlayer.
  useEffect(() => { tellPlayer(player.current, playing ? "player.playVideo()" : "player.pauseVideo()"); }, [playing]);
  useEffect(() => { tellPlayer(player.current, practising ? "player.mute()" : "player.unMute()"); }, [practising]);
  // Where the video has got to, in seconds, as last heard from the player.
  const position = useRef(0);
  const lastJump = useRef({ line: -1, at: 0 });
  function playFrom(index: number) {
    // A video with no transcript simply plays.
    if (!lines.length) return void setPlaying(true);
    const line = Math.max(0, Math.min(lines.length - 1, index));
    // One tap can arrive twice, from the text and from the row around it.
    if (lastJump.current.line === line && Date.now() - lastJump.current.at < 400) return;
    lastJump.current = { line, at: Date.now() };
    handsOffUntil.current = 0;
    position.current = lines[line].start;
    setCurrent(line);
    tellPlayer(player.current, "player.playVideo()", lines[line].start);
    setPlaying(true);
  }
  function toggle() {
    handsOffUntil.current = 0;
    setPlaying(!playing);
  }
  // Back to the start of the line being spoken; pressed again within a moment
  // of its start, to the line before, as a music player's back button does.
  function back() {
    if (!lines.length) return tellPlayer(player.current, "player.playVideo()", position.current - 10);
    const into = position.current - (lines[current]?.start ?? 0);
    lastJump.current = { line: -1, at: 0 };
    playFrom(into < 1.5 ? current - 1 : current);
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
  // Recording a practice take: the screen itself is filmed, with the learner's
  // voice and, in a corner, their face. The saved clip shows the words lighting
  // up and the learner; where the video plays, the clip shows a card with its
  // picture, title, maker and the date instead, so no footage goes into it.
  const [take, setTake] = useState<"off" | "starting" | "on" | "stopping" | { uri: string; durationMs: number } | "saving">("off");
  const takeNow = useRef(take);
  takeNow.current = take;
  const [camera, askCamera] = useCameraPermissions();
  const playerHeight = Math.round((width * 9) / 16);
  const light = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (take !== "on") return;
    const flash = Animated.loop(Animated.sequence([
      Animated.timing(light, { toValue: 0.15, duration: 600, useNativeDriver: true }),
      Animated.timing(light, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    flash.start();
    return () => { flash.stop(); light.setValue(1); };
  }, [take]);
  async function startTake() {
    if (take !== "off" || !lines.length) return;
    setTake("starting");
    setPlaying(false);
    try {
      if (camera && !camera.granted && camera.canAskAgain) await askCamera();
      await screenRecording.start({
        x: 0, y: insets.top, width, height: playerHeight,
        lines: [video.title, video.channel ?? "", new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })],
        image: thumbnail(video.youtubeId),
      });
      setPractising(true);
      setTake("on");
      // The take begins at the start of the line the learner was on.
      lastJump.current = { line: -1, at: 0 };
      playFrom(current);
    } catch (error: any) {
      setTake("off");
      report(error.message ?? "The recording could not be started.");
    }
  }
  async function stopTake() {
    if (takeNow.current !== "on") return;
    setTake("stopping");
    setPlaying(false);
    try {
      setTake(await screenRecording.stop());
    } catch (error: any) {
      setTake("off");
      report(error.message ?? "The recording could not be finished.");
    }
  }
  async function keepTake() {
    if (typeof take !== "object") return;
    const kept = take;
    setTake("saving");
    try {
      const allowed = await MediaLibrary.requestPermissionsAsync(true);
      if (!allowed.granted) throw new Error("Allow Language Partner to add to your Photos, in Settings, to keep recordings.");
      await MediaLibrary.saveToLibraryAsync(kept.uri);
      onRecorded(kept.durationMs);
      report("Saved to your Photos.");
      void screenRecording.discard(kept.uri);
      setTake("off");
    } catch (error: any) {
      setTake(kept);
      report(error.message ?? "The recording could not be saved.");
    }
  }
  function dropTake() {
    if (typeof take === "object") void screenRecording.discard(take.uri);
    setTake("off");
  }
  // Leaving the screen ends a take and throws it away.
  useEffect(() => () => {
    const now = takeNow.current;
    if (now === "on") void screenRecording.stop().then((clip) => screenRecording.discard(clip.uri)).catch(() => {});
    else if (typeof now === "object") void screenRecording.discard(now.uri);
  }, []);
  const taking = take === "on" || take === "starting" || take === "stopping";
  return (
    <View accessibilityViewIsModal style={[styles.cover, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <YoutubePlayer
        ref={player}
        height={playerHeight}
        videoId={video.youtubeId}
        play={playing}
        mute={practising}
        initialPlayerParams={capturing
          ? { cc_lang_pref: video.language.slice(0, 2), showClosedCaptions: true, rel: false, preventFullScreen: true }
          : { cc_lang_pref: "xx", showClosedCaptions: false, rel: false, preventFullScreen: true }}
        webViewProps={capturing ? {
          injectedJavaScriptBeforeContentLoaded: captionHook(conversation.native.slice(0, 2).toLowerCase()),
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly: false,
        } : undefined}
        // The subtitle track arrives on this otherwise unused channel; see captionHook.
        onPlaybackQualityChange={(data: unknown) => reader?.receive(data)}
        onReady={() => tellPlayer(player.current, practising ? "player.mute()" : "player.unMute()")}
        onChangeState={(state: string) => {
          // Keep the app's idea of playing in step with the player's own controls.
          if (state === "playing") setPlaying(true);
          if (state === "paused" || state === "ended") setPlaying(false);
          if (state === "ended") void stopTake();
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
                  setPlaying(false);
                }}
                onSelect={(range) => {
                  setPlaying(false);
                  setSelection({ line: index, message: messages[index], range });
                }}
              />
              {translations && !!line.translation && (
                <Text style={styles.translation}>
                  {translationMarks[index].reduce<React.ReactNode[]>((parts, range, at, all) => [
                    ...parts,
                    line.translation!.slice(at ? all[at - 1].end : 0, range.start),
                    <Text key={at} style={styles.translationMark}>{line.translation!.slice(range.start, range.end)}</Text>,
                  ], [])}
                  {line.translation.slice(translationMarks[index].at(-1)?.end ?? 0)}
                </Text>
              )}
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
            <Pressable accessibilityRole="button" onPress={() => { stopGlide(); setPlaying(false); onRead(); }}
              style={({ pressed }) => [styles.afterButton, pressed && { opacity: 0.7 }]}>
              <Mic color={stage.text} size={18} />
              <Text style={styles.afterText}>Live reading</Text>
            </Pressable>
          </View>
        </View>}
      </ScrollView>
      {/* The learner's face, in the picture while a take is being recorded. */}
      {taking && camera?.granted && (
        <View pointerEvents="none" style={styles.face}>
          <CameraView style={StyleSheet.absoluteFill} facing="front" mode="picture" mute />
        </View>
      )}
      {take === "on" || take === "stopping" ? (
        <View style={styles.prompt}>
          <Animated.View style={[styles.light, { opacity: light }]} />
          <Text style={styles.promptText}>{take === "on" ? "Recording. Say each line as it lights up." : "Finishing the recording…"}</Text>
        </View>
      ) : typeof take === "object" || take === "saving" ? (
        <View style={styles.prompt}>
          <Text style={styles.promptText}>{take === "saving" ? "Saving to your Photos…" : `Your take is ready (${clock(Math.round(take.durationMs / 1000))}).`}</Text>
          {typeof take === "object" && (
            <>
              <Pressable accessibilityRole="button" onPress={() => void keepTake()} style={styles.keep}><Text style={styles.keepText}>Save to Photos</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={dropTake} style={styles.drop}><Text style={styles.dropText}>Discard</Text></Pressable>
            </>
          )}
        </View>
      ) : lineWords.length ? (
        // The saved words in the line being spoken, with what they mean.
        <View style={[styles.prompt, { flexDirection: "column", alignItems: "stretch", gap: 4 }]}>
          {lineWords.map((word) => (
            <Text key={word.phrase} style={[styles.promptText, { flex: 0 }]}>
              <Text style={styles.lookedPhrase}>{word.phrase}</Text>{"  "}{word.meaning}
            </Text>
          ))}
        </View>
      ) : practising ? (
        <View style={styles.prompt}>
          <Text style={styles.promptText}>Practising: the sound is off. Say each line as it lights up.</Text>
        </View>
      ) : null}
      {/* One bar for watching and practising alike, always in the same place. */}
      <SafeAreaView edges={["bottom"]} style={styles.bar}>
        <Control icon={X} label="Close video" disabled={taking} onPress={onClose} />
        {/* Outward from play: back, translate, practise, record. */}
        {screenRecording.available && (
          <Pressable accessibilityRole="button" accessibilityLabel={take === "on" ? "Stop recording" : "Record yourself practising"}
            disabled={!lines.length || (take !== "off" && take !== "on")} hitSlop={6}
            onPress={() => void (take === "on" ? stopTake() : startTake())}
            style={({ pressed }) => [styles.record, (pressed || !lines.length || (take !== "off" && take !== "on")) && { opacity: 0.4 }]}>
            {take === "on" ? <Square color={stage.record} fill={stage.record} size={16} /> : <Circle color={stage.record} fill={stage.record} size={20} />}
          </Pressable>
        )}
        <Control icon={practising ? VolumeX : Mic} label={practising ? "Stop practising: turn the sound back on" : "Practise: mute the video and say the lines yourself"}
          active={practising} disabled={!lines.length || taking} onPress={() => setPractising(!practising)} />
        <Control icon={Languages} label={!hasTranslations ? "This video has no translations" : translations ? "Hide translations" : "Show translations"}
          active={translations} disabled={!hasTranslations} onPress={() => setTranslations(!translations)} />
        {/* Back sits beside play, where the thumb already is. */}
        <Control icon={RotateCcw} label="Back a line" onPress={back} />
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? "Pause" : "Play"}
          onPress={toggle} style={({ pressed }) => [styles.play, pressed && { opacity: 0.7 }]}>
          {playing ? <Pause color={stage.background} size={24} /> : <Play color={stage.background} size={24} />}
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
  translationMark: { color: stage.line, fontWeight: "600" },
  record: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: stage.dim },
  light: { width: 12, height: 12, borderRadius: 6, backgroundColor: stage.record },
  face: { position: "absolute", right: 12, bottom: 150, width: 104, height: 138, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: stage.text, backgroundColor: "#000", zIndex: 5 },
  keep: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: stage.line },
  keepText: { color: stage.background, fontFamily: fonts.sans, fontSize: 14, fontWeight: "700" },
  drop: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: stage.dim },
  dropText: { color: stage.text, fontFamily: fonts.sans, fontSize: 14, fontWeight: "600" },
  lookedPhrase: { color: stage.line, fontFamily: fonts.serif, fontSize: 18, fontWeight: "600" },
  translation: { marginTop: 2, color: stage.dim, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  prompt: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 18, backgroundColor: "#3A3320" },
  promptText: { flex: 1, color: stage.text, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, backgroundColor: stage.bar },
  play: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: stage.line },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import YoutubePlayer, { type YoutubeIframeRef } from "react-native-youtube-iframe";
import { Mic, Minus, Play, Plus, Square, X } from "lucide-react-native";
import { readingSpeeds, shownPieces, wordLevelNames, type WordLevel } from "../core/practice";
import { measureReading, readingWords, type Reading } from "../core/reading";
import { countingAccuracy, practiceLevel } from "../core/activity";
import { scriptPieces, scriptText } from "../core/script";
import { clock, lineAt, markedLines, type Video } from "../core/videos";
import { audio } from "../services/nativeAudio";
import { startLiveTranscript, type LiveTranscript } from "../services/liveTranscript";
import { fonts } from "./components";
import { tellPlayer } from "./playerCommands";
import { Control, nearestSpeed, Pieces, Prompter, stage, stepSpeed, useWordLevel, WordsStepper, type PrompterHandle } from "./Prompter";

export type ReadingSource =
  | { kind: "lesson"; id: string; title: string; language: string; script: string }
  | { kind: "video"; video: Video; saved: string[] };
export type ReadingResult = Omit<Reading, "id" | "createdAt">;
// A long silence ends the attempt: a live reading is done in one go.
const silenceLimit = 60000;
const aim = 300;

const duration = (ms: number) => clock(Math.round(ms / 1000));

// A live reading: the learner reads the script, or a section of a video, aloud
// from start to finish while the phone transcribes them. Stopping, leaving the
// app or falling silent for a minute ends it as incomplete. Every attempt is
// logged with the time spent, the words heard and a lenient accuracy figure.
// A video plays muted above the text, which moves in time with its speaker.
export function ReadingScreen({ source, speed, meanings, earlier, onMissing, onRests, onSpeed, onSave, onClose }: {
  source: ReadingSource;
  speed: number;
  meanings: Record<string, string>;
  // The learner's readings in this language so far, to tell when this one earns a level.
  earlier: Reading[];
  onMissing?: (missing: { text: string; sentence: string }[]) => Promise<void>;
  // How to have the ends of sentences put into the learner's language.
  onRests?: (missing: { start: string; rest: string }[]) => Promise<void>;
  onSpeed: (wordsPerMinute: number) => void;
  onSave: (reading: ReadingResult) => Promise<void>;
  onClose: () => void;
}) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const video = source.kind === "video" ? source.video : undefined;
  const language = video ? video.language : (source as { language: string }).language;
  const [phase, setPhase] = useState<"setup" | "starting" | "reading" | "done">("setup");
  const [issue, setIssue] = useState("");
  const [heard, setHeard] = useState(0);
  const [result, setResult] = useState<{ reading: ReadingResult; reason?: string; saved: "saving" | "yes" | "no" | "skipped" } | null>(null);

  // The section of a video to read: about five minutes from the start, unless
  // the learner picks their own first and last line.
  const lines = video?.lines ?? [];
  const [section, setSection] = useState(() => {
    const last = lines.findIndex((line) => line.start - (lines[0]?.start ?? 0) > aim);
    return { from: 0, to: last < 0 ? Math.max(0, lines.length - 1) : Math.max(0, last - 1) };
  });
  const [picking, setPicking] = useState<number | null>(null);
  const part = useMemo(() => lines.slice(section.from, section.to + 1), [lines, section]);
  const endsAt = video ? (lines[section.to + 1]?.start ?? (lines[section.to]?.start ?? 0) + 6) : 0;
  const startsAt = part[0]?.start ?? 0;

  // The text to read. For a video, each subtitle line is kept apart so the
  // one being spoken can be shown.
  const marked = useMemo(() => (video ? markedLines(part, source.kind === "video" ? source.saved : []) : undefined), [video, part, source]);
  const script = source.kind === "lesson" ? source.script : marked!.texts.join(marked!.punctuated ? " " : "\n");
  const words = useWordLevel(script, meanings, { onMissing, onRests });
  const total = useMemo(() => readingWords(scriptText(script)).length, [script]);
  const preview = useMemo(() => shownPieces(scriptPieces(script).pieces, words.level, meanings), [script, words.level, meanings]);
  // For a video: the pieces of each line as shown at this level, and the
  // number of words in the script up to the end of each line.
  const timed = useMemo(() => {
    if (!marked) return undefined;
    const pieces = scriptPieces(script).pieces;
    const starts: number[] = [];
    let offset = 0;
    for (const piece of pieces) { starts.push(offset); offset += piece.text.length; }
    const ends: number[] = [];
    let end = 0;
    for (const text of marked.texts) { end += scriptText(text).length + 1; ends.push(end); }
    const lineOf = (at: number) => { let line = 0; while (line < ends.length - 1 && starts[at] >= ends[line]) line++; return line; };
    const shown = marked.texts.map(() => [] as ReturnType<typeof shownPieces>);
    for (const piece of shownPieces(pieces, words.level, meanings)) shown[lineOf(piece.at)]?.push(piece);
    let count = 0;
    const reached = marked.texts.map((text) => (count += readingWords(scriptText(text)).length));
    return { shown, reached };
  }, [marked, script, words.level, meanings]);

  const prompter = useRef<PrompterHandle>(null);
  const player = useRef<YoutubeIframeRef>(null);
  const list = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const viewHeight = useRef(0);
  const transcript = useRef<LiveTranscript | null>(null);
  const startedAt = useRef(0);
  const lastHeard = useRef(0);
  const lastText = useRef("");
  const ending = useRef(false);
  const [current, setCurrent] = useState(0);
  const currentLine = useRef(0);
  currentLine.current = current;
  const level = useRef<WordLevel>(words.level);
  level.current = words.level;

  async function finish(complete: boolean, reason?: string) {
    if (ending.current) return;
    ending.current = true;
    const ended = reason === "silence" ? lastHeard.current : Date.now();
    const reached = complete ? total
      : timed ? (timed.reached[currentLine.current - 1] ?? 0)
      : (prompter.current?.progress() ?? 0) * total;
    setPhase("done");
    const text = (await transcript.current?.stop().catch(() => lastText.current)) ?? lastText.current;
    transcript.current = null;
    const reading: ReadingResult = {
      source: source.kind,
      sourceId: source.kind === "lesson" ? source.id : source.video.youtubeId,
      title: (source.kind === "lesson" ? source.title : source.video.title).slice(0, 200),
      language,
      level: level.current,
      complete,
      durationMs: Math.max(0, Math.round(ended - startedAt.current)),
      ...measureReading(scriptText(script), text, reached),
      ...(video ? { section: { from: Math.floor(startsAt), to: Math.ceil(endsAt) } } : { speed: nearestSpeed(speed) }),
      transcript: text.slice(0, 20000),
    };
    // A start that was abandoned at once, with nothing said, is not an attempt.
    if (reading.durationMs < 5000 && !reading.wordsSpoken) return setResult({ reading, reason, saved: "skipped" });
    setResult({ reading, reason, saved: "saving" });
    onSave(reading).then(
      () => setResult({ reading, reason, saved: "yes" }),
      () => setResult({ reading, reason, saved: "no" }),
    );
  }
  async function start() {
    setIssue("");
    setHeard(0);
    setCurrent(0);
    setResult(null);
    ending.current = false;
    lastText.current = "";
    setPhase("starting");
    try {
      await audio.stop();
      transcript.current = await startLiveTranscript(
        language,
        (text) => {
          if (text === lastText.current) return;
          lastText.current = text;
          lastHeard.current = Date.now();
          setHeard(readingWords(text).length);
        },
        (message) => void finish(false, message),
      );
      prompter.current?.restart();
      startedAt.current = lastHeard.current = Date.now();
      setPhase("reading");
    } catch (error: any) {
      setIssue(error.message ?? String(error));
      setPhase("setup");
    }
  }
  const reading = phase === "reading";
  // Leaving the app, or a minute without a word, ends the attempt.
  useEffect(() => {
    if (!reading) return;
    const left = AppState.addEventListener("change", (state) => { if (state !== "active") void finish(false, "left"); });
    const quiet = setInterval(() => { if (Date.now() - lastHeard.current > silenceLimit) void finish(false, "silence"); }, 1000);
    return () => { left.remove(); clearInterval(quiet); };
  }, [reading]);
  // The text moves by itself from the moment the reading starts, at the pace
  // of the video's speaker. It follows the video's own clock while the video
  // is playing; if the video is slow to start, stalls or will not play, the
  // text carries on by the phone's clock, so it never waits on the picture.
  useEffect(() => {
    if (!reading || !video) return;
    const began = Date.now();
    let offset = 0, lastPlayer = -1, synced = false;
    const move = (seconds: number) => {
      if (seconds >= endsAt) return void finish(true);
      setCurrent(lineAt(part, seconds));
    };
    const timer = setInterval(() => {
      const byPhone = () => startsAt + (Date.now() - began) / 1000 + offset;
      const fallBack = () => {
        // Give the video a few seconds to begin before going on without it.
        if (synced || Date.now() - began > 3000) move(byPhone());
      };
      const playerNow = player.current?.getCurrentTime();
      if (!playerNow) return fallBack();
      void playerNow.then((seconds) => {
        const advancing = lastPlayer >= 0 && seconds > lastPlayer + 0.05 && seconds >= startsAt - 1;
        lastPlayer = seconds;
        if (!advancing) return fallBack();
        // Keep the phone's clock in step with the video, for when it is needed.
        offset += seconds - byPhone();
        synced = true;
        move(seconds);
      }).catch(fallBack);
    }, 200);
    return () => clearInterval(timer);
  }, [reading, video, part, endsAt, startsAt]);
  useEffect(() => {
    if (reading && video) list.current?.scrollTo({ y: Math.max(0, (offsets.current[current] ?? 0) - viewHeight.current * 0.25), animated: true });
  }, [current, reading]);
  useEffect(() => () => { void transcript.current?.stop().catch(() => {}); }, []);

  const step = (direction: 1 | -1) => { const next = stepSpeed(speed, direction); if (next) onSpeed(next); };
  const sectionSeconds = Math.max(0, endsAt - startsAt);
  function pick(index: number) {
    if (picking === null) { setPicking(index); setSection({ from: index, to: index }); return; }
    setSection({ from: Math.min(picking, index), to: Math.max(picking, index) });
    setPicking(null);
  }
  const outcome = result?.reading;
  // Worked out against the readings there were when this one began.
  const before = useRef(earlier);
  if (phase === "setup") before.current = earlier;
  const kept = result?.saved === "yes" || result?.saved === "saving";
  const levelBefore = practiceLevel(before.current).level;
  const levelAfter = outcome && kept ? practiceLevel([...before.current, { ...outcome, id: "this", createdAt: "" }]).level : levelBefore;
  return (
    <View accessibilityViewIsModal style={[styles.cover, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {phase === "setup" || phase === "starting" ? (
        <>
          <View style={styles.head}>
            <Text style={styles.title}>Live reading</Text>
            <Text style={styles.body}>
              Read it aloud from start to finish while the phone listens. Stopping, leaving the app or a minute of silence ends the attempt, and it is logged either way.
              {video ? " The video plays without sound, and the words move in time with the speaker." : ""}
            </Text>
          </View>
          {video ? (
            <>
              <Text style={styles.section}>
                {picking === null ? "Tap the first line, then the last, to choose a section." : "Now tap the last line."}
                {"  "}{clock(Math.round(sectionSeconds))} chosen{sectionSeconds > aim + 60 ? " · aim for about five minutes" : ""}
              </Text>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.lines}>
                {lines.map((line, index) => {
                  const chosen = index >= section.from && index <= section.to;
                  return (
                    <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: chosen }} onPress={() => pick(index)}
                      style={[styles.pickLine, chosen && styles.chosen]}>
                      <Text style={styles.time}>{clock(line.start)}</Text>
                      <Text style={[styles.pickText, chosen && { color: stage.text }]}>{line.text}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : (
            <View style={{ flex: 1 }}>
              {/* The script as it will appear at the chosen level, to look over before starting. */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.preview}>
                <Text style={styles.previewText}><Pieces shown={preview} marks small /></Text>
              </ScrollView>
              <Text style={[styles.section, { textAlign: "center" }]}>{total} words · about {clock(Math.round((total / nearestSpeed(speed)) * 60))} at this speed</Text>
              <View style={[styles.speed, { justifyContent: "center", paddingBottom: 6 }]}>
                <Control icon={Minus} label="Slower" disabled={nearestSpeed(speed) === readingSpeeds[0]} onPress={() => step(-1)} />
                <Text accessibilityLabel={`${nearestSpeed(speed)} words a minute`} style={styles.speedText}>{nearestSpeed(speed)} words a minute</Text>
                <Control icon={Plus} label="Faster" disabled={nearestSpeed(speed) === readingSpeeds.at(-1)} onPress={() => step(1)} />
              </View>
            </View>
          )}
          {!!issue && <Text style={styles.issue}>{issue}</Text>}
          <WordsStepper words={words} style={{ backgroundColor: stage.bar }} />
          <SafeAreaView edges={["bottom"]} style={styles.bar}>
            <Control icon={X} label="Close" onPress={onClose} />
            <Pressable accessibilityRole="button" disabled={phase === "starting" || !total} onPress={() => void start()}
              style={({ pressed }) => [styles.start, (pressed || phase === "starting" || !total) && { opacity: 0.6 }]}>
              <Play color={stage.background} size={20} />
              <Text style={styles.startText}>{phase === "starting" ? "Starting…" : "Start reading"}</Text>
            </Pressable>
          </SafeAreaView>
        </>
      ) : phase === "reading" ? (
        <>
          {video ? (
            <>
              {/* No sound, and no way to turn it on: the microphone must hear only the learner. */}
              <View pointerEvents="none">
                <YoutubePlayer ref={player} height={Math.round((width * 9) / 16)} videoId={video.youtubeId} play mute
                  // Muted and started by hand as well as by setting: see tellPlayer.
                  onReady={() => tellPlayer(player.current, "player.mute(); player.playVideo()", startsAt)}
                  initialPlayerParams={{ start: Math.floor(startsAt), controls: false, cc_lang_pref: "xx", showClosedCaptions: false, rel: false, preventFullScreen: true }}
                  onChangeState={(state: string) => { if (state === "ended") void finish(true); }} />
              </View>
              <ScrollView ref={list} style={{ flex: 1 }} scrollEnabled={false} contentContainerStyle={styles.lines}
                onLayout={(event) => { viewHeight.current = event.nativeEvent.layout.height; }}>
                {timed!.shown.map((shown, index) => (
                  <View key={index} onLayout={(event) => { offsets.current[index] = event.nativeEvent.layout.y; }}
                    style={[styles.readLine, index === current && styles.chosen, index !== current && { opacity: 0.45 }]}>
                    <Text style={styles.readText}><Pieces shown={shown} marks small /></Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={{ flex: 1 }}>
              <Prompter ref={prompter} script={script} speed={speed} playing marks level={words.level} meanings={meanings} readingLine={0.34}
                shade="#1B1A17B8" onFinished={() => void finish(true)} />
            </View>
          )}
          <SafeAreaView edges={["bottom"]} style={styles.bar}>
            <View style={styles.listening}>
              <Mic color={stage.record} size={18} />
              <Text style={styles.listeningText}>{heard} {heard === 1 ? "word" : "words"} heard · {wordLevelNames[words.level]}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Stop. The attempt is saved as incomplete." onPress={() => void finish(false, "stopped")}
              style={({ pressed }) => [styles.stop, pressed && { opacity: 0.6 }]}>
              <Square color={stage.text} size={16} />
              <Text style={styles.stopText}>Stop</Text>
            </Pressable>
          </SafeAreaView>
        </>
      ) : (
        <>
          <View style={styles.result}>
            {!outcome ? <Text style={styles.body}>Working out your reading…</Text> : (
              <>
                <Text style={[styles.status, { color: outcome.complete ? stage.line : stage.dim }]}>{outcome.complete ? "Complete" : "Incomplete"}</Text>
                {!outcome.complete && (
                  <Text style={styles.body}>
                    {result!.reason === "silence" ? "Nothing was heard for a minute, so the reading ended."
                      : result!.reason === "left" ? "You left the app, so the reading ended."
                      : result!.reason === "stopped" ? "You stopped before the end."
                      : (result!.reason ?? "The reading ended early.")}
                  </Text>
                )}
                <Text style={styles.score}>{outcome.accuracy}%</Text>
                <Text style={styles.body}>
                  {outcome.wordsMatched} of the {outcome.wordsExpected} words {outcome.complete ? "in the script" : "you reached"} were heard.
                  {" "}Treat this as a guide: the phone mishears, and it is marked generously.
                </Text>
                <View style={styles.facts}>
                  {[
                    ["Time reading aloud", duration(outcome.durationMs)],
                    ["Words spoken", String(outcome.wordsSpoken)],
                    ["Help on screen", wordLevelNames[outcome.level]],
                    ...(outcome.complete ? [] : [["Got through", `${outcome.wordsExpected} of ${outcome.wordsInScript} words`]]),
                  ].map(([label, value]) => (
                    <View key={label} style={styles.fact}>
                      <Text style={styles.factLabel}>{label}</Text>
                      <Text style={styles.factValue}>{value}</Text>
                    </View>
                  ))}
                </View>
                {levelAfter > levelBefore && <Text style={styles.levelUp}>Level {levelAfter} reached.</Text>}
                {kept && outcome.complete && outcome.accuracy < countingAccuracy && (
                  <Text style={styles.body}>Too little of it was heard for this one to count toward your level.</Text>
                )}
                <Text style={styles.saved}>
                  {result!.saved === "saving" ? "Saving…"
                    : result!.saved === "yes" ? "Saved to your live readings."
                    : result!.saved === "skipped" ? "Too short to count, so it was not saved."
                    : "This reading could not be saved. Check your connection."}
                </Text>
              </>
            )}
          </View>
          <SafeAreaView edges={["bottom"]} style={styles.bar}>
            <Control icon={X} label="Close" onPress={onClose} />
            <Pressable accessibilityRole="button" disabled={!outcome} onPress={() => setPhase("setup")}
              style={({ pressed }) => [styles.start, (pressed || !outcome) && { opacity: 0.6 }]}>
              <Play color={stage.background} size={20} />
              <Text style={styles.startText}>Read again</Text>
            </Pressable>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, backgroundColor: stage.background },
  head: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10, gap: 8 },
  title: { color: stage.text, fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  body: { color: stage.dim, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  section: { paddingHorizontal: 22, paddingVertical: 8, color: stage.text, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  lines: { paddingVertical: 8, paddingHorizontal: 14, gap: 2 },
  pickLine: { flexDirection: "row", gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  chosen: { backgroundColor: "#2F2C25" },
  time: { width: 40, color: stage.dim, fontFamily: fonts.sans, fontSize: 12, lineHeight: 22 },
  pickText: { flex: 1, color: stage.dim, fontFamily: fonts.serif, fontSize: 16, lineHeight: 22 },
  readLine: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  readText: { color: stage.text, fontFamily: fonts.serif, fontSize: 22, lineHeight: 31 },
  preview: { paddingHorizontal: 22, paddingVertical: 10 },
  previewText: { color: stage.text, fontFamily: fonts.serif, fontSize: 19, lineHeight: 29 },
  speed: { flexDirection: "row", alignItems: "center", gap: 4 },
  speedText: { minWidth: 150, textAlign: "center", color: stage.text, fontFamily: fonts.sans, fontSize: 15, fontWeight: "600" },
  issue: { paddingHorizontal: 22, paddingBottom: 8, color: "#E69288", fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, backgroundColor: stage.bar },
  start: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 27, backgroundColor: stage.line },
  startText: { color: stage.background, fontFamily: fonts.sans, fontSize: 16, fontWeight: "700" },
  listening: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  listeningText: { flex: 1, color: stage.text, fontFamily: fonts.sans, fontSize: 14, lineHeight: 19 },
  stop: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: stage.dim },
  stopText: { color: stage.text, fontFamily: fonts.sans, fontSize: 15, fontWeight: "600" },
  result: { flex: 1, paddingHorizontal: 24, paddingTop: 28, gap: 10 },
  status: { fontFamily: fonts.sans, fontSize: 14, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  score: { color: stage.text, fontFamily: fonts.serif, fontSize: 76, lineHeight: 86 },
  facts: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: stage.dim },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: stage.dim },
  factLabel: { color: stage.dim, fontFamily: fonts.sans, fontSize: 15 },
  factValue: { flexShrink: 1, textAlign: "right", color: stage.text, fontFamily: fonts.sans, fontSize: 15, fontWeight: "600" },
  levelUp: { marginTop: 8, color: stage.line, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30 },
  saved: { marginTop: 6, color: stage.dim, fontFamily: fonts.sans, fontSize: 13, lineHeight: 19 },
});

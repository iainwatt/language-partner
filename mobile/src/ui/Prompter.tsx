import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Minus, Plus, type LucideIcon } from "lucide-react-native";
import { scriptPieces, withoutStress } from "../core/script";
import { keyRuns, missingMeanings, missingRests, practicePace, readingSpeeds, sentenceRests, shownPieces, wordLevelNames, wordLevelNumber, wordLevels, type ShownPiece, type WordLevel } from "../core/practice";
import { fonts } from "./components";

// A dark stage, unlike the paper of the rest of the app: this is where the
// script is performed. Case endings keep their colours, lightened for the dark.
export const stage = { background: "#1B1A17", text: "#F4F1E8", dim: "#8E897E", line: "#C9A227", bar: "#26241F", record: "#D8483F" };
const caseTints: Record<string, string> = { gen: "#E69288", dat: "#86BEDD", acc: "#8ECB9C", ins: "#BFA0DC", pre: "#E3A766" };
export const nearestSpeed = (speed: number) =>
  readingSpeeds.reduce((best, option) => (Math.abs(option - speed) < Math.abs(best - speed) ? option : best));
export const stepSpeed = (speed: number, direction: 1 | -1) => readingSpeeds[readingSpeeds.indexOf(nearestSpeed(speed)) + direction];

// `progress` is how much of the text has passed the reading line, from 0 to 1.
export type PrompterHandle = { restart: () => void; progress: () => number };

// Script pieces as text: case endings tinted, saved words bold, translated
// ones in the stage's gold, and hidden ones blurred in place.
export function Pieces({ shown, marks, small }: { shown: ShownPiece[]; marks: boolean; small?: boolean }) {
  return (
    <>
      {shown.map((piece, index) => {
        // A hidden word is a blank of its own length in its own place, so the
        // learner can see how many words are to come and the pace is unchanged.
        if (piece.hidden)
          return <Text key={index} accessibilityElementsHidden importantForAccessibility="no" style={styles.bar}>{withoutStress(piece.text)}</Text>;
        if (piece.aside) return <Text key={index} style={styles.aside}>{piece.text}</Text>;
        const tint = marks ? piece.marks.map((mark) => caseTints[mark]).find(Boolean) : undefined;
        return (
          <Text key={index} style={[tint && { color: tint }, piece.key && marks && styles.keyWord, piece.translated && styles.translated]}>
            {piece.translated ? piece.text : withoutStress(piece.text)}
          </Text>
        );
      })}
    </>
  );
}
// The scrolling script: it moves past a fixed reading line at the chosen pace
// while `playing`. Large for rehearsal; small for sitting under the camera.
export const Prompter = forwardRef<PrompterHandle, {
  script: string;
  speed: number;
  playing: boolean;
  marks: boolean;
  // How much of the script is readable, and what its saved words mean.
  level?: WordLevel;
  meanings?: Record<string, string>;
  small?: boolean;
  // How far down its own height the line being read sits.
  readingLine: number;
  // Shades what has been read, in the colour behind the text.
  shade: string;
  onPress?: () => void;
  onFinished: () => void;
  onMoved?: () => void;
}>(function Prompter({ script, speed, playing, marks, level = "all", meanings, small, readingLine, shade, onPress, onFinished, onMoved }, handle) {
  const { pieces } = useMemo(() => scriptPieces(script), [script]);
  const shown = useMemo(() => shownPieces(pieces, level, meanings), [pieces, level, meanings]);
  const words = pieces.filter((piece) => piece.word !== undefined).length;
  const [viewport, setViewport] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const position = useRef(0);
  const dragging = useRef(false);
  const pace = practicePace(words, textHeight, speed);
  useImperativeHandle(handle, () => ({
    restart() {
      position.current = 0;
      scroll.current?.scrollTo({ y: 0, animated: false });
    },
    progress: () => (textHeight > 0 ? Math.max(0, Math.min(1, position.current / textHeight)) : 0),
  }));
  useEffect(() => {
    if (!playing || !pace) return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      if (!dragging.current) {
        position.current = Math.min(textHeight, position.current + (pace * (now - last)) / 1000);
        scroll.current?.scrollTo({ y: position.current, animated: false });
        if (position.current >= textHeight) onFinished();
      }
      last = now;
    }, 33);
    return () => clearInterval(timer);
  }, [playing, pace, textHeight]);
  const size = (event: LayoutChangeEvent) => event.nativeEvent.layout.height;
  return (
    <View style={{ flex: 1 }} onLayout={(event) => setViewport(size(event))}>
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        // The learner can drag to any point; scrolling carries on from there.
        onScrollBeginDrag={() => { dragging.current = true; }}
        onScrollEndDrag={(event) => { position.current = event.nativeEvent.contentOffset.y; dragging.current = false; onMoved?.(); }}
        onMomentumScrollEnd={(event) => { position.current = event.nativeEvent.contentOffset.y; }}
        contentContainerStyle={{ paddingTop: viewport * readingLine, paddingBottom: viewport * (1 - readingLine), paddingHorizontal: small ? 18 : 26 }}
      >
        <Pressable accessibilityRole={onPress ? "button" : undefined} disabled={!onPress} onPress={onPress}>
          <Text style={small ? styles.small : styles.large} onLayout={(event) => setTextHeight(size(event))}>
            <Pieces shown={shown} marks={marks} small={small} />
          </Text>
        </Pressable>
      </ScrollView>
      {/* What has been read fades back, and a mark shows the line to read. */}
      <View pointerEvents="none" style={[styles.read, { height: Math.max(0, viewport * readingLine - 4), backgroundColor: shade }]} />
      <View pointerEvents="none" style={[styles.marker, { top: viewport * readingLine + (small ? 4 : 8), height: small ? 22 : 30 }]} />
    </View>
  );
});

// The level for a rehearsal, shared by practice and recording. It starts on
// everything. A script with no saved words has no "key words" level. The first
// time that level is used, meanings the screen was not given are asked for.
// What a rehearsal screen is given to fill in meanings it does not have yet:
// `onMissing` for saved words, `onRests` for the ends of sentences.
export type WordHelp = {
  onMissing?: (missing: { text: string; sentence: string }[]) => Promise<void>;
  onRests?: (missing: { start: string; rest: string }[]) => Promise<void>;
};
export function useWordLevel(script: string, meanings: Record<string, string>, help: WordHelp = {}) {
  const { pieces, sentences } = useMemo(() => scriptPieces(script), [script]);
  // A level that would look no different from the one above it is left out.
  const levels = useMemo(() => wordLevels.filter((level) =>
    level === "keys" ? keyRuns(pieces).length > 0 : level === "rest" ? !!help.onRests && sentenceRests(pieces).length > 0 : true,
  ), [pieces, !!help.onRests]);
  const [level, setLevel] = useState<WordLevel>("all");
  const [busy, setBusy] = useState(false);
  const asked = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (asked.current[level]) return;
    const task =
      level === "keys" && help.onMissing ? (() => { const missing = missingMeanings(pieces, sentences, meanings); return missing.length ? help.onMissing!(missing) : undefined; })()
      : level === "rest" && help.onRests ? (() => { const missing = missingRests(pieces, meanings); return missing.length ? help.onRests!(missing) : undefined; })()
      : undefined;
    if (!task) return;
    asked.current[level] = true;
    setBusy(true);
    void task.catch(() => {}).finally(() => setBusy(false));
  }, [level, pieces, sentences, meanings]);
  const at = levels.indexOf(level);
  return {
    level, busy,
    name: busy ? (level === "rest" ? "Translating…" : "Finding meanings…") : `${wordLevelNumber(level)} · ${wordLevelNames[level]}`,
    fewer: levels[at + 1], more: levels[at - 1], setLevel,
  };
}
// Minus shows fewer words, plus shows more, like the speed control beside it.
export function WordsStepper({ words, style }: { words: ReturnType<typeof useWordLevel>; style?: object }) {
  return (
    <View style={[styles.words, style]}>
      <Control icon={Minus} label="Show fewer words" disabled={!words.fewer} onPress={() => words.fewer && words.setLevel(words.fewer)} />
      <Text accessibilityLiveRegion="polite" style={styles.wordsText}>{words.name}</Text>
      <Control icon={Plus} label="Show more words" disabled={!words.more} onPress={() => words.more && words.setLevel(words.more)} />
    </View>
  );
}

// A round icon button for the bar along the bottom of the stage.
export function Control({ icon: Icon, label, onPress, disabled, active }: {
  icon: LucideIcon; label: string; onPress: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }} disabled={disabled}
      onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.control, (pressed || disabled) && { opacity: 0.4 }]}>
      <Icon color={active ? stage.line : stage.text} size={21} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  large: { color: stage.text, fontFamily: fonts.serif, fontSize: 30, lineHeight: 46 },
  small: { color: stage.text, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28 },
  keyWord: { fontWeight: "700" },
  translated: { fontFamily: fonts.sans, fontWeight: "700", color: stage.line },
  // Invisible letters, underlined: a blank exactly as long as the word.
  bar: { color: "transparent", textDecorationLine: "underline", textDecorationColor: "rgba(244,241,232,0.55)" },
  aside: { fontFamily: fonts.sans, color: stage.dim },
  words: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 6, paddingHorizontal: 18 },
  wordsText: { minWidth: 210, textAlign: "center", color: stage.text, fontFamily: fonts.sans, fontSize: 14, fontWeight: "600" },
  read: { position: "absolute", top: 0, left: 0, right: 0 },
  marker: { position: "absolute", left: 6, width: 4, borderRadius: 2, backgroundColor: stage.line },
  control: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
});

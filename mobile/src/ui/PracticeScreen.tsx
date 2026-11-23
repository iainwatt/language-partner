import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { Highlighter, Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react-native";
import { readingSpeeds } from "../core/practice";
import { fonts } from "./components";
import { Control, nearestSpeed, Prompter, stage, stepSpeed, useWordLevel, WordsStepper, type PrompterHandle } from "./Prompter";

// Full-screen rehearsal: the script scrolls past a fixed reading line at the
// learner's chosen pace. Nothing is recorded. It is an ordinary view laid over
// the whole app, not a modal: a modal opened from inside the saved-conversation
// sheet's own modal showed its buttons but did not receive their taps.
export function PracticeScreen({ script, speed, meanings, onMissing, onRests, onSpeed, onClose }: {
  script: string;
  // What the script's saved words mean, and how to ask for any not known yet.
  meanings: Record<string, string>;
  onMissing?: (missing: { text: string; sentence: string }[]) => Promise<void>;
  // How to have the ends of sentences put into the learner's language.
  onRests?: (missing: { start: string; rest: string }[]) => Promise<void>;
  speed: number;
  onSpeed: (wordsPerMinute: number) => void;
  onClose: () => void;
}) {
  useKeepAwake();
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [marks, setMarks] = useState(true);
  const words = useWordLevel(script, meanings, { onMissing, onRests });
  const prompter = useRef<PrompterHandle>(null);
  function restart() {
    prompter.current?.restart();
    setFinished(false);
  }
  function toggle() {
    if (finished) restart();
    setStarted(true);
    setPlaying(!playing);
  }
  const step = (direction: 1 | -1) => { const next = stepSpeed(speed, direction); if (next) onSpeed(next); };
  return (
    <View accessibilityViewIsModal style={styles.cover}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Prompter ref={prompter} script={script} speed={speed} playing={playing} marks={marks} level={words.level} meanings={meanings} readingLine={0.34} shade="#1B1A17B8"
          onPress={toggle} onMoved={() => setFinished(false)} onFinished={() => { setPlaying(false); setFinished(true); }} />
        {!started && (
          <View pointerEvents="none" style={styles.hint}>
            <Text style={styles.hintText}>Tap play, then read aloud as the words reach the mark.</Text>
          </View>
        )}
      </View>
      <WordsStepper words={words} style={{ backgroundColor: stage.bar }} />
      <SafeAreaView edges={["bottom"]} style={styles.bar}>
        <Control icon={X} label="Close practice" onPress={onClose} />
        <Control icon={RotateCcw} label="Back to the start" onPress={restart} />
        <View style={styles.speed}>
          <Control icon={Minus} label="Slower" disabled={nearestSpeed(speed) === readingSpeeds[0]} onPress={() => step(-1)} />
          <Text accessibilityLabel={`${nearestSpeed(speed)} words a minute`} style={styles.speedText}>{nearestSpeed(speed)}</Text>
          <Control icon={Plus} label="Faster" disabled={nearestSpeed(speed) === readingSpeeds.at(-1)} onPress={() => step(1)} />
        </View>
        <Control icon={Highlighter} label={marks ? "Hide the colours" : "Show the colours"} active={marks} onPress={() => setMarks(!marks)} />
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? "Pause" : finished ? "Read it again" : "Start reading"}
          onPress={toggle} style={({ pressed }) => [styles.play, pressed && { opacity: 0.7 }]}>
          {playing ? <Pause color={stage.background} size={24} /> : <Play color={stage.background} size={24} />}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, backgroundColor: stage.background },
  hint: { position: "absolute", top: "22%", left: 26, right: 26 },
  hintText: { color: stage.dim, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, backgroundColor: stage.bar },
  speed: { flexDirection: "row", alignItems: "center" },
  speedText: { minWidth: 34, textAlign: "center", color: stage.text, fontFamily: fonts.sans, fontSize: 15, fontWeight: "600" },
  play: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: stage.line },
});

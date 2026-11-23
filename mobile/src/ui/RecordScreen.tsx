import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Highlighter, Minus, Plus, SwitchCamera, X } from "lucide-react-native";
import { readingSpeeds } from "../core/practice";
import { audio } from "../services/nativeAudio";
import { fonts } from "./components";
import { Control, nearestSpeed, Prompter, stage, stepSpeed, useWordLevel, WordsStepper, type PrompterHandle } from "./Prompter";

type Phase = "ready" | "countdown" | "recording" | "saving" | "saved";
// Recording yourself delivering the script. The camera fills the screen and
// the script scrolls in a small band at the top, close to the lens, so your
// eyes stay near it. The video is saved to the phone's Photos, nowhere else.
export function RecordScreen({ script, speed, meanings, onMissing, onRests, onSpeed, onRecorded, onClose }: {
  script: string;
  // What the script's saved words mean, and how to ask for any not known yet.
  meanings: Record<string, string>;
  onMissing?: (missing: { text: string; sentence: string }[]) => Promise<void>;
  // How to have the ends of sentences put into the learner's language.
  onRests?: (missing: { start: string; rest: string }[]) => Promise<void>;
  speed: number;
  onSpeed: (wordsPerMinute: number) => void;
  // Told the length of each take that was saved.
  onRecorded?: (ms: number) => void;
  onClose: () => void;
}) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const [camera, askCamera] = useCameraPermissions();
  const [microphone, askMicrophone] = useMicrophonePermissions();
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [marks, setMarks] = useState(true);
  const words = useWordLevel(script, meanings, { onMissing, onRests });
  const [issue, setIssue] = useState("");
  const view = useRef<CameraView>(null);
  const prompter = useRef<PrompterHandle>(null);
  const open = useRef(true);
  // The app's own listening and speaking must not hold the microphone.
  useEffect(() => { void audio.stop(); return () => { open.current = false; view.current?.stopRecording(); }; }, []);
  useEffect(() => {
    if (camera && !camera.granted && camera.canAskAgain) void askCamera();
    if (microphone && !microphone.granted && microphone.canAskAgain) void askMicrophone();
  }, [camera?.status, microphone?.status]);
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { void record(); return; }
    const timer = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, count]);

  async function record() {
    setPhase("recording");
    try {
      // Resolves when recording is stopped, with the file it wrote.
      const began = Date.now();
      const video = await view.current?.recordAsync();
      const length = Date.now() - began;
      if (!open.current || !video?.uri) return;
      setPhase("saving");
      const allowed = await MediaLibrary.requestPermissionsAsync(true);
      if (!allowed.granted) throw new Error("Allow Language Partner to add to your Photos, in Settings, to keep recordings.");
      await MediaLibrary.saveToLibraryAsync(video.uri);
      onRecorded?.(length);
      if (open.current) setPhase("saved");
    } catch (error: any) {
      if (!open.current) return;
      setIssue(error.message ?? String(error));
      setPhase("ready");
    }
  }
  function start() {
    setIssue("");
    prompter.current?.restart();
    setCount(3);
    setPhase("countdown");
  }
  const step = (direction: 1 | -1) => { const next = stepSpeed(speed, direction); if (next) onSpeed(next); };
  const allowed = !!camera?.granted && !!microphone?.granted;
  const refused = (camera && !camera.granted && !camera.canAskAgain) || (microphone && !microphone.granted && !microphone.canAskAgain);
  const idle = phase === "ready" || phase === "saved";
  return (
    <View accessibilityViewIsModal style={styles.cover}>
      <StatusBar style="light" />
      {allowed && <CameraView ref={view} style={StyleSheet.absoluteFill} facing={facing} mode="video" />}
      {/* The script, in a band under the status bar, beside the front camera. */}
      <View style={[styles.band, { paddingTop: insets.top }]}>
        <Prompter ref={prompter} script={script} speed={speed} playing={phase === "recording"} marks={marks} level={words.level} meanings={meanings} small readingLine={0.3}
          shade="#1B1A1799" onFinished={() => {}} />
      </View>
      <View style={styles.middle} pointerEvents="box-none">
        {phase === "countdown" && <Text accessibilityLiveRegion="polite" style={styles.count}>{count || ""}</Text>}
        {!allowed && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {refused
                ? "Language Partner needs the camera and microphone to record you. Turn them on in Settings."
                : "Allow the camera and microphone to record yourself."}
            </Text>
            {refused && <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}><Text style={styles.link}>Open Settings</Text></Pressable>}
          </View>
        )}
        {phase === "saving" && <View style={styles.notice}><Text style={styles.noticeText}>Saving to your Photos…</Text></View>}
        {phase === "saved" && <View style={styles.notice}><Text style={styles.noticeText}>Saved to your Photos. Record again, or close.</Text></View>}
        {!!issue && <View style={styles.notice}><Text style={styles.noticeText}>{issue}</Text></View>}
      </View>
      <WordsStepper words={words} style={{ backgroundColor: "#1B1A17CC" }} />
      <SafeAreaView edges={["bottom"]} style={styles.bar}>
        <Control icon={X} label="Close recording" disabled={phase === "saving"} onPress={onClose} />
        <View style={styles.speed}>
          <Control icon={Minus} label="Slower" disabled={nearestSpeed(speed) === readingSpeeds[0]} onPress={() => step(-1)} />
          <Text accessibilityLabel={`${nearestSpeed(speed)} words a minute`} style={styles.speedText}>{nearestSpeed(speed)}</Text>
          <Control icon={Plus} label="Faster" disabled={nearestSpeed(speed) === readingSpeeds.at(-1)} onPress={() => step(1)} />
        </View>
        <Control icon={Highlighter} label={marks ? "Hide the colours" : "Show the colours"} active={marks} onPress={() => setMarks(!marks)} />
        <Control icon={SwitchCamera} label="Switch camera" disabled={!idle} onPress={() => setFacing(facing === "front" ? "back" : "front")} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === "recording" ? "Stop recording" : phase === "countdown" ? "Cancel" : "Start recording"}
          disabled={!allowed || phase === "saving"}
          onPress={() => (phase === "recording" ? view.current?.stopRecording() : phase === "countdown" ? setPhase("ready") : start())}
          style={({ pressed }) => [styles.shutter, (pressed || !allowed || phase === "saving") && { opacity: 0.5 }]}
        >
          <View style={phase === "recording" || phase === "countdown" ? styles.stop : styles.dot} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, backgroundColor: stage.background },
  band: { height: "34%", backgroundColor: "#1B1A1799" },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  count: { color: stage.text, fontFamily: fonts.serif, fontSize: 96, lineHeight: 110 },
  notice: { maxWidth: 420, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#1B1A17CC", gap: 6 },
  noticeText: { color: stage.text, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, textAlign: "center" },
  link: { color: stage.line, fontFamily: fonts.sans, fontSize: 15, fontWeight: "600", textAlign: "center" },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, backgroundColor: "#1B1A17CC" },
  speed: { flexDirection: "row", alignItems: "center" },
  speedText: { minWidth: 34, textAlign: "center", color: stage.text, fontFamily: fonts.sans, fontSize: 15, fontWeight: "600" },
  shutter: { width: 58, height: 58, borderRadius: 29, borderWidth: 3, borderColor: stage.text, alignItems: "center", justifyContent: "center" },
  dot: { width: 42, height: 42, borderRadius: 21, backgroundColor: stage.record },
  stop: { width: 24, height: 24, borderRadius: 5, backgroundColor: stage.record },
});

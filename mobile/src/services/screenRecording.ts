import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// Recording the app's own screen with the microphone, to a clip in which one
// rectangle is covered by a card (see modules/screen-recording). iPhone only.
type Options = {
  // The rectangle to cover in the clip, in points from the top left of the screen.
  x: number; y: number; width: number; height: number;
  // Up to three lines of text for the card, and a picture to set behind them.
  lines: string[];
  image?: string;
};
type Native = {
  start(options: Options): Promise<void>;
  stop(): Promise<{ uri: string; durationMs: number }>;
  discard(uri: string): Promise<void>;
};
const native = Platform.OS === "ios" ? requireOptionalNativeModule<Native>("ScreenRecording") : null;

export const screenRecording = {
  available: !!native,
  start: (options: Options) => (native ? native.start(options) : Promise.reject(new Error("Screen recording is not available on this device."))),
  stop: () => (native ? native.stop() : Promise.reject(new Error("Screen recording is not available on this device."))),
  discard: (uri: string) => (native ? native.discard(uri).catch(() => {}) : Promise.resolve()),
};

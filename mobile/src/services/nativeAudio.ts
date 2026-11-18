import { ExpoSpeechRecognitionModule as recognition } from "expo-speech-recognition";
import * as Speech from "expo-speech";
import { AudioCoordinator, type AudioDriver } from "../core/audio";

let subscriptions: { remove(): void }[] = [];
let captureActive = false;
const driver: AudioDriver = {
  async capture(language, onDraft, onEnd, onError) {
    if (!recognition.isRecognitionAvailable())
      throw new Error(
        "Speech recognition is unavailable here. Use a development build on a supported phone, or type your turn.",
      );
    const permissions = await recognition.requestPermissionsAsync();
    if (!permissions.granted)
      throw new Error(
        "Microphone and speech recognition permission are needed. Enable them in device settings, or type instead.",
      );
    let finalText = "";
    subscriptions = [
      recognition.addListener("result", (event) => {
        const text = event.results[0]?.transcript ?? "";
        if (event.isFinal) finalText = `${finalText} ${text}`.trim();
        onDraft(event.isFinal ? finalText : `${finalText} ${text}`.trim());
      }),
      recognition.addListener("end", () => {
        captureActive = false;
        onEnd();
      }),
      recognition.addListener("error", (event) => {
        if (event.error !== "aborted") onError(event.message || event.error);
      }),
    ];
    captureActive = true;
    recognition.start({
      lang: language,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      recordingOptions: { persist: false },
    });
  },
  async stopCapture() {
    subscriptions.forEach((s) => s.remove());
    subscriptions = [];
    if (!captureActive) return;
    // Wait for the recognizer to release the microphone before playback or a new owner.
    await new Promise<void>((resolve, reject) => {
      const end = recognition.addListener("end", () => {
        clearTimeout(timeout);
        end.remove();
        captureActive = false;
        resolve();
      });
      const timeout = setTimeout(() => {
        end.remove();
        reject(
          new Error("Microphone is still closing. Tap pause, then retry."),
        );
      }, 3000);
      recognition.abort();
    });
  },
  async speak(text, language, onEnd, onError) {
    // Platform TTS limits vary. Queue bounded chunks so long tutor turns remain playable.
    const chunks = text.match(/[\s\S]{1,900}(?:\s|$)|[\s\S]{1,900}/g) ?? [];
    chunks.forEach((chunk, index) =>
      Speech.speak(chunk, {
        language,
        rate: 0.9,
        onDone: index === chunks.length - 1 ? onEnd : undefined,
        onStopped: onEnd,
        onError: (error) => {
          void Speech.stop().finally(() =>
            onError(error.message || "Pronunciation playback is unavailable."),
          );
        },
      }),
    );
    if (!chunks.length) onEnd();
  },
  async stopSpeaking() {
    await Speech.stop();
  },
};
export const audio = new AudioCoordinator(driver);

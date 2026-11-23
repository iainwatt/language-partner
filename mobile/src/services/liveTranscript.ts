import { ExpoSpeechRecognitionModule as recognition } from "expo-speech-recognition";

// Transcribing one long stretch of speech, for a live reading. The phone's
// recogniser stops by itself every so often, after a silence or simply after
// a minute or so of listening. It is started again each time and the pieces
// are joined, so the learner reads on without noticing. Deciding that the
// learner has gone quiet for too long is the caller's job.
export type LiveTranscript = { text: () => string; stop: () => Promise<string> };
const join = (a: string, b: string) => `${a} ${b}`.replace(/\s+/g, " ").trim();
const fatal = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

export async function startLiveTranscript(
  language: string,
  onText: (text: string) => void,
  onError: (message: string) => void,
): Promise<LiveTranscript> {
  if (!recognition.isRecognitionAvailable()) throw new Error("Speech recognition is unavailable on this phone.");
  const permissions = await recognition.requestPermissionsAsync();
  if (!permissions.granted) throw new Error("Allow the microphone and speech recognition, in Settings, to do a live reading.");
  let done = "", draft = "", active = true, failures = 0;
  let restart: ReturnType<typeof setTimeout> | undefined;
  const begin = () =>
    recognition.start({ lang: language, interimResults: true, continuous: true, addsPunctuation: false, recordingOptions: { persist: false } });
  const subscriptions = [
    recognition.addListener("result", (event) => {
      const text = event.results[0]?.transcript ?? "";
      failures = 0;
      if (event.isFinal) { done = join(done, text); draft = ""; } else draft = text;
      onText(join(done, draft));
    }),
    recognition.addListener("end", () => {
      // Whatever was still a draft when it stopped is kept.
      done = join(done, draft);
      draft = "";
      if (active) restart = setTimeout(() => { if (active) begin(); }, 250);
    }),
    recognition.addListener("error", (event) => {
      if (!active || event.error === "aborted") return;
      if (fatal.has(event.error) || ++failures >= 6) {
        active = false;
        onError(event.message || "The phone stopped listening.");
      }
    }),
  ];
  begin();
  return {
    text: () => join(done, draft),
    async stop() {
      const wasActive = active;
      active = false;
      clearTimeout(restart);
      // Stopping, not aborting, lets the last words arrive.
      await new Promise<void>((resolve) => {
        const end = recognition.addListener("end", () => { clearTimeout(timeout); end.remove(); resolve(); });
        const timeout = setTimeout(() => { end.remove(); resolve(); }, 2000);
        try { if (wasActive) recognition.stop(); else recognition.abort(); } catch { clearTimeout(timeout); end.remove(); resolve(); }
      });
      subscriptions.forEach((subscription) => subscription.remove());
      return join(done, draft);
    },
  };
}

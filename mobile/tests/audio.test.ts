import test from "node:test";
import assert from "node:assert/strict";
import { AudioCoordinator, type AudioDriver } from "../src/core/audio";
function fixture() {
  const log: string[] = [];
  let microphone = false,
    speaker = false;
  const captures: {
    language: string;
    draft: (s: string) => void;
    end: () => void;
    error: (s: string) => void;
  }[] = [];
  const playback: (() => void)[] = [];
  const driver: AudioDriver = {
    async stopCapture() {
      microphone = false;
      log.push("stop mic");
    },
    async stopSpeaking() {
      speaker = false;
      log.push("stop speaker");
    },
    async capture(language, draft, end, error) {
      assert.equal(speaker, false, "TTS cannot be captured");
      microphone = true;
      captures.push({ language, draft, end, error });
      log.push(`capture ${language}`);
    },
    async speak(text, language, end) {
      assert.equal(microphone, false, "mic released before playback");
      speaker = true;
      playback.push(end);
      log.push(`speak ${text}`);
    },
  };
  return {
    audio: new AudioCoordinator(driver),
    captures,
    playback,
    log,
    driver,
  };
}
test("translator reroutes capture, ignores stale chat callbacks, then resumes target language", async () => {
  const f = fixture();
  let chat = "",
    translation = "",
    starts = 0;
  await f.audio.listen(
    "chat",
    "es-ES",
    (value) => (chat = value),
    () => starts++,
  );
  f.captures[0].draft("Hola");
  await f.audio.listen("translator", "en-US", (value) => (translation = value));
  f.captures[0].draft("stale audio");
  f.captures[1].draft("Hello");
  assert.equal(chat, "Hola");
  assert.equal(translation, "Hello");
  await f.audio.play("translator", "Hola", "es-ES");
  f.captures[1].draft("echo");
  assert.equal(translation, "Hello");
  await f.audio.closeTranslator();
  assert.equal(f.audio.owner, "chat");
  assert.equal(f.audio.state, "listening");
  assert.equal(f.captures[2].language, "es-ES");
  assert.equal(starts, 2);
  f.playback[0]();
  assert.equal(
    f.audio.state,
    "listening",
    "stale playback end must not pause resumed chat",
  );
});
test("closing a typed lookup leaves chat capture active", async () => {
  const f = fixture();
  await f.audio.listen("chat", "es-ES", () => {});
  const count = f.log.length;
  await f.audio.closeTranslator();
  assert.equal(f.audio.state, "listening");
  assert.equal(f.log.length, count);
});
test("rapid interrupts only start the last requested capture and stop invalidates callbacks", async () => {
  const f = fixture();
  await Promise.all([
    f.audio.listen("chat", "es-ES", () => {}),
    f.audio.listen("translator", "en-US", () => {}),
  ]);
  assert.equal(f.captures.length, 1);
  assert.equal(f.captures[0].language, "en-US");
  await f.audio.stop();
  f.captures[0].error("late error");
  assert.equal(f.audio.state, "idle");
});
test("permission failure is visible and an explicit retry reconnects", async () => {
  const f = fixture();
  const capture = f.driver.capture;
  f.driver.capture = async () => {
    throw new Error("Permission denied");
  };
  await f.audio.listen("chat", "es-ES", () => {});
  assert.equal(f.audio.state, "error");
  assert.match(f.audio.error, /Permission/);
  f.driver.capture = capture;
  await f.audio.listen("chat", "es-ES", () => {});
  assert.equal(f.audio.state, "listening");
  assert.equal(f.audio.error, "");
});
test("unsafe microphone shutdown blocks playback", async () => {
  const f = fixture();
  await f.audio.listen("chat", "es-ES", () => {});
  f.driver.stopCapture = async () => {
    throw new Error("still closing");
  };
  await f.audio.play("translator", "test", "en-US");
  assert.equal(f.playback.length, 0);
  assert.equal(f.audio.state, "error");
});

test("TTS errors surface and pausing clears a previous error", async () => {
  const f = fixture();
  f.driver.speak = async (_text, _language, _end, error) =>
    error("Voice unavailable");
  await f.audio.play("translator", "Hola", "es-ES");
  assert.equal(f.audio.state, "error");
  assert.equal(f.audio.error, "Voice unavailable");
  await f.audio.pause();
  assert.equal(f.audio.error, "");
});

test("all playback sends a clean spoken copy while retaining the source text", async () => {
  const f = fixture();
  const text = "Скажи **«Привет!»** и <<до свидания>>.";
  for (const owner of ["chat", "translator"] as const) {
    await f.audio.play(owner, text, "ru-RU");
    assert.equal(f.log.at(-1), "speak Скажи Привет! и до свидания.");
    assert.equal(f.audio.state, "speaking");
    f.playback.at(-1)!();
    assert.equal(f.audio.state, "paused");
  }
  assert.equal(text, "Скажи **«Привет!»** и <<до свидания>>.");
});

test("decorative-only playback releases the microphone without getting stuck speaking", async () => {
  const f = fixture();
  await f.audio.listen("chat", "ru-RU", () => {});
  await f.audio.play("chat", "«» <<>>", "ru-RU");
  assert.equal(f.playback.length, 0);
  assert.equal(f.audio.state, "paused");
  await f.audio.listen("chat", "ru-RU", () => {});
  assert.equal(f.audio.state, "listening");
});

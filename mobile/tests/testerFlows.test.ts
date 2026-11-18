import test from "node:test";
import assert from "node:assert/strict";
import { initialSnapshot, providers } from "../src/core/domain";
import { managedSettings } from "../src/core/managedAi";
import { feedbackRequestSchema } from "../src/core/feedback";
import { saveFeedback } from "../server/feedback";
import { assertGoogleIdentity } from "../src/core/googleIdentity";

const feedback = { id: "attempt-1", transcript: "  La traduction est lente.  ", language: "fr-FR", targetLanguage: "it-IT", screen: "chat", appVersion: "1.0.0", platform: "ios" };
function memoryStore() {
  const records = new Map<string, Record<string, unknown>>();
  return { records,
    async create(key: string, document: Record<string, unknown>) {
      const existing = records.get(key);
      if (existing) return { created: false, same: existing.fingerprint === document.fingerprint, translated: existing.translationStatus === "complete" };
      records.set(key, document);
      return { created: true, same: true, translated: document.translationStatus === "complete" };
    },
    async translated(key: string, english: string) { Object.assign(records.get(key)!, { englishTranslation: english, translationStatus: "complete" }); },
  };
}

test("managed live practice migrates old provider/sample settings without touching language preferences", () => {
  const old = { ...initialSnapshot().settings, provider: "claude" as const, model: "old-model", autoSpeak: false };
  const next = managedSettings(old, true);
  assert.equal(next.mode, "api"); assert.equal(next.provider, "openai"); assert.equal(next.model, providers.openai.models[0]);
  assert.equal(next.target, old.target); assert.equal(next.native, old.native); assert.equal(next.autoSpeak, false);
  assert.equal(old.provider, "claude");
  assert.equal(managedSettings(old, false).mode, "demo");
});

test("feedback rejects audio, caller identities, unknown metadata and blank text", () => {
  for (const patch of [{ audio: "file:///recording.wav" }, { uid: "someone-else" }, { recordingUrl: "https://example.com/audio" }, { transcript: " " }, { transcript: "x".repeat(6001) }, { language: "xx-XX" }])
    assert.equal(feedbackRequestSchema.safeParse({ ...feedback, ...patch }).success, false);
});

test("feedback is saved before translation; translation failures retain the original", async () => {
  const store = memoryStore();
  const result = await saveFeedback("tester-a", feedback, store, async () => {
    assert.equal(store.records.size, 1);
    assert.equal([...store.records.values()][0].originalTranscript, "La traduction est lente.");
    throw new Error("Provider unavailable");
  });
  assert.deepEqual(result, { saved: true, translationStatus: "pending" });
  const record = [...store.records.values()][0];
  assert.equal(record.uid, "tester-a"); assert.equal(record.status, "new"); assert.equal(record.englishTranslation, "");
  assert.equal("audio" in record, false);
});

test("retries deduplicate feedback, retry pending translations and retain the original alongside English", async () => {
  const store = memoryStore(); let translations = 0;
  await saveFeedback("tester-a", feedback, store, async () => { throw new Error("offline"); });
  const translate = async () => { translations++; return "Translation is slow."; };
  await saveFeedback("tester-a", feedback, store, translate);
  await saveFeedback("tester-a", feedback, store, translate);
  assert.equal(translations, 1); assert.equal(store.records.size, 1);
  const record = [...store.records.values()][0];
  assert.equal(record.englishTranslation, "Translation is slow."); assert.equal(record.originalTranscript, "La traduction est lente.");
  await assert.rejects(() => saveFeedback("tester-a", { ...feedback, transcript: "Different" }, store, translate), /different content/);
  await saveFeedback("tester-b", feedback, store, translate);
  assert.equal(store.records.size, 2);
});

test("English feedback avoids an AI call and invalid translations leave a saved pending report", async () => {
  const store = memoryStore();
  const result = await saveFeedback("tester-a", { ...feedback, language: "en-US", transcript: "Please make text larger." }, store, async () => { throw new Error("Must not call AI"); });
  assert.equal(result.translationStatus, "complete");
  for (const value of ["", "x".repeat(12001)]) {
    const pending = await saveFeedback("tester-a", { ...feedback, id: `attempt-${value.length}` }, store, async () => value);
    assert.equal(pending.saved, true); assert.equal(pending.translationStatus, "pending");
  }
});

test("Google account linking rejects account changes and mismatched identities", () => {
  assert.doesNotThrow(() => assertGoogleIdentity(null, null, null, "tester@gmail.com"));
  assert.doesNotThrow(() => assertGoogleIdentity("uid-a", "uid-a", "Tester@gmail.com", "tester@gmail.com"));
  assert.throws(() => assertGoogleIdentity("uid-a", "uid-b", "tester@gmail.com", "tester@gmail.com"), /account changed/);
  assert.throws(() => assertGoogleIdentity(null, "uid-b", null, "tester@gmail.com"), /account changed/);
  assert.throws(() => assertGoogleIdentity("uid-a", "uid-a", "tester@gmail.com", "other@gmail.com"), /same email/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { initialSnapshot, saveEntry } from "../src/core/domain";
import { languageView, startLanguageConversation } from "../src/core/conversations";
import { bundledGrammarTopics, makeGrammarConversation } from "../src/core/grammar";

const targets = ["en-US", "fr-FR", "es-ES", "de-DE", "it-IT"];

test("switching among learning languages preserves history, vocabulary and lesson snapshots", () => {
  let snapshot = initialSnapshot();
  snapshot.entries = saveEntry([], {
    phrase: "bonjour", meaning: "hello", native: "en-US", target: "fr-FR",
  }).entries;
  const original = structuredClone(snapshot);
  for (const target of targets) {
    const native = target === "en-US" ? "fr-FR" : "en-US";
    snapshot = startLanguageConversation(snapshot, native, target);
    const active = snapshot.conversations.find((item) => item.id === snapshot.activeConversationId)!;
    assert.equal(active.native, native);
    assert.equal(active.target, target);
    assert.deepEqual(active.messages, []);
    assert.equal(snapshot.settings.target, target);
    const lesson = makeGrammarConversation(bundledGrammarTopics(target)[0], native, target);
    snapshot.conversations.push(lesson);
  }
  assert.deepEqual(snapshot.entries, original.entries);
  assert.deepEqual(snapshot.conversations.find((item) => item.id === original.activeConversationId), original.conversations[0]);
  assert.equal(snapshot.conversations.filter((item) => item.grammar).length, 5);
  assert.equal(original.conversations.length, 1);
});

test("invalid and identical language pairs cannot change saved settings", () => {
  const snapshot = initialSnapshot();
  const original = structuredClone(snapshot);
  assert.throws(() => startLanguageConversation(snapshot, "en-US", "en-US"), /different/);
  assert.throws(() => startLanguageConversation(snapshot, "en-US", "xx-XX"), /supported/);
  assert.deepEqual(snapshot, original);
});

test("five learning languages have distinct curricula with usable examples and stable topic IDs", () => {
  const curricula = targets.map(bundledGrammarTopics);
  for (const topics of curricula) {
    assert.ok(topics.length >= 5);
    assert.equal(new Set(topics.map((topic) => topic.id)).size, topics.length);
    assert.ok(topics.every((topic) => topic.reminder.includes("\n")));
    for (const id of ["past-events", "questions", "plans-intentions"])
      assert.ok(topics.some((topic) => topic.id === id), `Keep existing cloud document ID ${id}`);
  }
  assert.equal(new Set(curricula.map((topics) => topics.find((topic) => topic.id === "past-events")!.reminder)).size, 5);
  assert.match(curricula[3][0].reminder, /second constituent, not second word/);
  assert.match(curricula[2].find((topic) => topic.id === "ser-estar")!.prompt, /not reduce.*permanent versus temporary/);
});

test("each practice language shows only its own conversations, words and saved conversations", () => {
  let snapshot = initialSnapshot();
  const russianChat = snapshot.conversations[0];
  const saved = (id: string, target: string) => ({
    id, title: id, description: "", summary: "", summarySourceMessageId: "",
    native: "en-US", target, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  });
  snapshot.entries = saveEntry([], { phrase: "привет", meaning: "hello", native: "en-US", target: "ru-RU" }).entries;
  snapshot.savedConversations = [saved("russian-topic", "ru-RU")];
  snapshot = startLanguageConversation(snapshot, "en-US", "es-ES");
  snapshot.entries = saveEntry(snapshot.entries, { phrase: "hola", meaning: "hello", native: "en-US", target: "es-ES" }).entries;
  snapshot.savedConversations.push(saved("spanish-topic", "es-ES"));

  const spanish = languageView(snapshot);
  assert.deepEqual(spanish.conversations.map((chat) => chat.target), ["es-ES"]);
  assert.deepEqual(spanish.entries.map((entry) => entry.phrase), ["hola"]);
  assert.deepEqual(spanish.savedConversations.map((context) => context.id), ["spanish-topic"]);
  assert.equal(snapshot.entries.length, 2, "nothing is deleted from the full snapshot");

  const russian = languageView({ ...snapshot, activeConversationId: russianChat.id });
  assert.deepEqual(russian.conversations, [russianChat]);
  assert.deepEqual(russian.entries.map((entry) => entry.phrase), ["привет"]);
  assert.deepEqual(russian.savedConversations.map((context) => context.id), ["russian-topic"]);

  const empty = languageView({ ...snapshot, conversations: [], settings: { ...snapshot.settings, target: "fr-FR" } });
  assert.deepEqual([empty.conversations, empty.entries, empty.savedConversations], [[], [], []]);
});

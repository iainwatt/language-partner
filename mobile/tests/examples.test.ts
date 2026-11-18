import test from "node:test";
import assert from "node:assert/strict";
import { isSelectionExample, selectionExample } from "../src/core/examples";
import {
  entrySchema,
  initialSnapshot,
  review,
  saveEntry,
  type Message,
} from "../src/core/domain";
import {
  cloudEntry,
  commitWrites,
  dictionaryChanges,
} from "../src/core/cloudDictionary";
import { Repository } from "../src/storage/repository";

const message: Message = {
  id: "source",
  role: "assistant",
  final: true,
  createdAt: "2026-09-15T12:00:00Z",
  text: "Важно быть вежливым и уважительным к коллегам, потому что атмосфера влияет на результат.",
};
function select(text: string, source = message) {
  const start = source.text.indexOf(text);
  return { start, end: start + text.length };
}
const input = {
  phrase: "уважительным",
  meaning: "respectful",
  native: "en-US",
  target: "ru-RU",
};
const example = {
  text: "уважительным к коллегам",
  translation: "respectful to colleagues",
};

test("source examples keep a few surrounding words and stop at clause boundaries", () => {
  const range = select(input.phrase);
  assert.equal(
    selectionExample(message, range),
    "вежливым и уважительным к коллегам",
  );
  assert.equal(isSelectionExample(message, range, example.text), true);
  assert.equal(
    isSelectionExample(message, range, "уважительным к незнакомцам"),
    false,
  );
  assert.equal(isSelectionExample(message, range, "к коллегам"), false);
  const beginning = { ...message, text: "Уважительным к коллегам. Это важно." };
  assert.equal(
    selectionExample(beginning, select("Уважительным", beginning)),
    "Уважительным к коллегам",
  );
});

test("examples retain the selected occurrence, Unicode, and multiword phrases", () => {
  const source = {
    ...message,
    text: "Мы пьём кофе дома. Они пьют кофе с друзьями.\nПривет 🌍 мой друг!",
  };
  const start = source.text.lastIndexOf("кофе");
  const range = { start, end: start + 4 };
  assert.equal(selectionExample(source, range), "Они пьют кофе с друзьями");
  assert.equal(isSelectionExample(source, range, "пьём кофе дома"), false);
  assert.equal(
    selectionExample(source, select("🌍", source)),
    "Привет 🌍 мой друг",
  );
  assert.equal(
    selectionExample(message, select("уважительным к коллегам")),
    "вежливым и уважительным к коллегам",
  );
  assert.equal(
    selectionExample(message, { start: 0, end: message.text.length }),
    "",
  );
  const long = { ...message, text: "а".repeat(601) };
  assert.equal(selectionExample(long, { start: 0, end: 601 }), "");
  assert.throws(() =>
    selectionExample({ ...message, final: false }, select(input.phrase)),
  );
});

test("examples survive duplicate saves and reviews; a new chosen example replaces only the example", () => {
  const original = saveEntry([], { ...input, conversationId: "topic" }).entry;
  const reviewed = review(original, "good");
  const saved = saveEntry([reviewed], {
    ...input,
    example,
    conversationId: "another",
  });
  assert.equal(saved.duplicate, true);
  assert.deepEqual(saved.entry.example, example);
  assert.deepEqual(saved.entry.history, reviewed.history);
  assert.equal(saved.entry.meaning, reviewed.meaning);
  assert.deepEqual(saveEntry(saved.entries, input).entry.example, example);
  assert.deepEqual(review(saved.entry, "easy").example, example);
  assert.equal(entrySchema.parse(original).example, undefined);
  assert.throws(() =>
    saveEntry([], { ...input, example: { ...example, translation: "" } }),
  );
});

test("cloud examples are bounded, removable and excluded from all local dictionary storage", async () => {
  const entry = saveEntry([], { ...input, example }).entry;
  assert.deepEqual(cloudEntry(entry).example, example);
  const added = JSON.stringify(
    commitWrites("db", "a", [{ id: entry.id, entry }]),
  );
  assert.match(added, /respectful to colleagues/);
  const { example: removed, ...without } = entry;
  const removal = JSON.stringify(
    commitWrites("db", "a", [{ id: entry.id, entry: without }]),
  );
  assert.match(removal, /"example"/); // Field mask removes the omitted value.
  assert.equal(removal.includes("respectful to colleagues"), false);
  const changed = dictionaryChanges([entry], [without]);
  assert.equal(changed[0].exampleChanged, true);
  const grading = JSON.stringify(
    commitWrites(
      "db",
      "a",
      dictionaryChanges([entry], [review(entry, "good")]),
    ),
  );
  assert.equal(grading.includes('"example"'), false);
  assert.throws(() =>
    entrySchema.parse({
      ...entry,
      example: { ...example, text: "x".repeat(601) },
    }),
  );
  let raw = "";
  const repository = new Repository({
    async get() {
      return raw;
    },
    async set(_, value) {
      raw = value;
    },
  });
  await repository.save("account", {
    ...initialSnapshot(false),
    entries: [entry],
  });
  assert.equal(raw.includes(example.text), false);
  assert.equal(raw.includes(example.translation), false);
  assert.deepEqual((await repository.load("account"))?.snapshot.entries, []);
});

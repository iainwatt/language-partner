import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  addDays,
  initialSnapshot,
  localDay,
  makeConversation,
  review,
  saveEntry,
  selectedSpan,
  type Message,
} from "../src/core/domain";
import { Repository } from "../src/storage/repository";
import {
  conversationTitle,
  recentConversationThreads,
  recentConversations,
} from "../src/core/conversations";
import { demoTranslation } from "../src/core/demo";
import { phraseRange } from "../src/core/selection";
const message: Message = {
  id: "m",
  role: "user",
  text: "Hola 🌍. Café, café.\n¿Qué te apetece?",
  final: true,
  createdAt: "2026-09-07T21:00:00Z",
};
const input = {
  phrase: "café",
  meaning: "coffee",
  native: "en-US",
  target: "es-ES",
  context: message.text,
  messageId: "m",
  conversationId: "c",
  start: 14,
  end: 18,
};
test("recents use readable titles and the latest turn without reordering stored conversations", () => {
  const blank = makeConversation("en-US", "ru-RU", false);
  assert.equal(conversationTitle(blank), "New conversation");
  const earlier = {
    ...blank,
    id: "earlier",
    title: "First lesson",
    createdAt: "2026-09-08T10:00:00Z",
  };
  const active = {
    ...blank,
    id: "active",
    createdAt: "2026-09-07T10:00:00Z",
    messages: [
      {
        ...message,
        text: "  Учу   русский\nкаждый день. ",
        createdAt: "2026-09-10T10:00:00Z",
      },
    ],
  };
  assert.equal(conversationTitle(active), "Учу русский каждый день.");
  assert.equal(conversationTitle(earlier), "First lesson");
  const stored = [earlier, active];
  assert.deepEqual(
    recentConversations(stored).map((item) => item.id),
    ["active", "earlier"],
  );
  assert.deepEqual(
    stored.map((item) => item.id),
    ["earlier", "active"],
  );
});
test("drawer recents collapse repeat practice chats under the saved conversation", () => {
  const original = {
    ...makeConversation("en-US", "ru-RU", false),
    id: "topic",
    title: "What makes a good employee?",
    createdAt: "2026-09-07T10:00:00Z",
    messages: [
      {
        ...message,
        text: "A good employee is reliable.",
        createdAt: "2026-09-07T10:10:00Z",
      },
    ],
  };
  const firstPractice = {
    ...makeConversation("en-US", "ru-RU", false),
    id: "practice-1",
    title: original.title,
    practiceOf: original.id,
    createdAt: "2026-09-08T10:00:00Z",
    messages: [
      {
        ...message,
        id: "practice-message-1",
        text: "Let's review reliable.",
        createdAt: "2026-09-08T10:05:00Z",
      },
    ],
  };
  const secondPractice = {
    ...makeConversation("en-US", "ru-RU", false),
    id: "practice-2",
    title: original.title,
    practiceOf: original.id,
    createdAt: "2026-09-09T10:00:00Z",
    messages: [
      {
        ...message,
        id: "practice-message-2",
        text: "Let's review respectful.",
        createdAt: "2026-09-09T10:05:00Z",
      },
    ],
  };
  const unrelated = {
    ...makeConversation("en-US", "ru-RU", false),
    id: "unrelated",
    title: "Travel chat",
    createdAt: "2026-09-08T12:00:00Z",
  };
  const blank = {
    ...makeConversation("en-US", "ru-RU", false),
    id: "blank",
    createdAt: "2026-09-10T10:00:00Z",
  };
  const recents = recentConversationThreads([
    original,
    firstPractice,
    unrelated,
    secondPractice,
    blank,
  ], [original.id]);
  assert.deepEqual(
    recents.map((item) => item.id),
    ["practice-2"],
  );
  assert.equal(
    recents.filter((item) => conversationTitle(item) === original.title).length,
    1,
  );
});
test("arbitrary selection preserves exact boundaries, repeated occurrence and both roles", () => {
  for (const role of ["user", "assistant"] as const) {
    const second = message.text.lastIndexOf("café");
    assert.equal(
      selectedSpan({ ...message, role }, second, second + 4),
      "café",
    );
    assert.equal(
      selectedSpan({ ...message, role }, 0, message.text.length),
      message.text,
    );
  }
  assert.equal(selectedSpan(message, 5, 7), "🌍");
  for (const range of [
    [6, 7],
    [5, 6],
    [-1, 3],
    [4, 4],
    [2.5, 4],
    [1, 200],
  ])
    assert.throws(() => selectedSpan(message, ...(range as [number, number])));
  assert.throws(() => selectedSpan({ ...message, final: false }, 0, 4));
});
test("direct selection keeps exact occurrence and rejects stale or mismatched native events", () => {
  const start = message.text.lastIndexOf("café");
  const event = {
    start,
    end: start + 4,
    text: "café",
    sourceText: message.text,
  };
  assert.deepEqual(phraseRange(message, event), { start, end: start + 4 });
  assert.equal(phraseRange({ ...message, final: false }, event), null);
  assert.equal(
    phraseRange({ ...message, text: `New ${message.text}` }, event),
    null,
  );
  assert.equal(phraseRange(message, { ...event, text: message.text }), null);
  assert.equal(
    phraseRange(message, { ...event, start: 6, end: 7, text: "🌍" }),
    null,
  );
});
test("dictionary saves phrase and translation without transcript copies; duplicates keep their schedule", () => {
  const first = saveEntry([], input, new Date(2026, 8, 7, 23, 59));
  assert.equal(first.entry.due, "2026-09-08");
  const repeat = saveEntry(first.entries, { ...input, phrase: " CAFÉ " });
  assert.equal(repeat.duplicate, true);
  assert.equal(repeat.entry.id, first.entry.id);
  assert.equal(repeat.entries.length, 1);
  assert.equal(
    saveEntry(first.entries, { ...input, native: "fr-FR" }).entries.length,
    2,
  );
  for (const key of [
    "context",
    "conversationId",
    "messageId",
    "start",
    "end",
  ] as const)
    assert.equal(first.entry[key], undefined);
  assert.equal(first.entry.phrase, "café");
  assert.equal(first.entry.meaning, "coffee");
});

test("calendar scheduling crosses DST, leap days and years without 24-hour arithmetic", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "Europe/London";
    assert.equal(addDays("2026-03-28", 1), "2026-03-29");
    assert.equal(addDays("2026-10-24", 2), "2026-10-26");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2026-12-31", 1), "2027-01-01");
    process.env.TZ = "America/Los_Angeles";
    const instant = new Date("2026-09-08T02:00:00Z");
    assert.equal(localDay(instant), "2026-09-07");
    assert.equal(saveEntry([], input, instant).entry.due, "2026-09-08");
  } finally {
    if (original) process.env.TZ = original;
    else delete process.env.TZ;
  }
});
test("deterministic grading lengthens success and shortens difficulty; history is append-only", () => {
  const first = saveEntry([], input).entry,
    at = new Date(2026, 8, 8, 9);
  const good = review(first, "good", at);
  assert.equal(good.interval, 3);
  assert.equal(good.due, "2026-09-11");
  const twice = review(good, "good", at);
  assert.equal(twice.interval, 6);
  assert.equal(review(twice, "hard", at).interval, 3);
  assert.equal(review(twice, "again", at).interval, 1);
  assert.equal(review(twice, "easy", at).interval, 18);
  assert.deepEqual(review(first, "good", at), good);
  assert.equal(first.history.length, 0);
  assert.equal(twice.history.length, 2);
});
test("local storage preserves conversations, isolates accounts and never persists dictionary entries", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT)");
  const store = {
    async get(key: string) {
      return (
        (db.prepare("SELECT value FROM kv WHERE key = ?").get(key)
          ?.value as string) ?? null
      );
    },
    async set(key: string, value: string) {
      db.prepare("INSERT OR REPLACE INTO kv VALUES (?, ?)").run(key, value);
    },
  };
  const repo = new Repository(store),
    snapshot = initialSnapshot();
  snapshot.stats = { talkTimeMs: 125000, talkTimeByDay: {} };
  snapshot.entries = saveEntry([], input).entries;
  await Promise.all([
    repo.save("a", snapshot, 4),
    repo.save("b", initialSnapshot(false), 0),
    repo.save(
      "a",
      { ...snapshot, entries: [review(snapshot.entries[0], "easy")] },
      5,
    ),
  ]);
  const reopened = new Repository(store);
  assert.equal((await reopened.load("a"))?.revision, 5);
  assert.deepEqual((await reopened.load("a"))?.snapshot.entries, []);
  const raw = await store.get("workspace:a");
  assert.deepEqual(JSON.parse(raw!).snapshot.entries, []);
  assert.ok(!raw!.includes('"meaning":"coffee"'));
  assert.deepEqual(
    (await reopened.load("a"))?.snapshot.conversations,
    snapshot.conversations,
  );
  assert.deepEqual((await reopened.load("a"))?.snapshot.stats, snapshot.stats);
  assert.equal((await reopened.load("b"))?.snapshot.entries.length, 0);
  assert.equal(await reopened.load("c"), null);
  db.close();
});
test("write failures surface and corrupted storage is never silently replaced", async () => {
  const repo = new Repository({
    async get() {
      return "{broken";
    },
    async set() {
      throw new Error("Disk full");
    },
  });
  await assert.rejects(repo.load("a"));
  await assert.rejects(repo.save("a", initialSnapshot()), /Disk full/);
});
test("demo translates known phrases only and never invents unknown meanings", () => {
  assert.equal(
    demoTranslation("I'm looking forward to it.", "en-US", "es-ES"),
    "Tengo muchas ganas.",
  );
  assert.equal(
    demoTranslation("te apetece", "es-ES", "en-US"),
    "you feel like",
  );
  assert.equal(demoTranslation("unseen phrase", "en-US", "es-ES"), undefined);
  assert.equal(demoTranslation("bonjour", "fr-FR", "en-US"), undefined);
  assert.equal(
    demoTranslation("I'm looking forward to it.", "en-US", "ru-RU"),
    "С нетерпением жду.",
  );
  assert.equal(
    demoTranslation("Я учу русский язык.", "ru-RU", "en-US"),
    "I'm learning Russian.",
  );
  assert.equal(demoTranslation("unseen phrase", "en-US", "ru-RU"), undefined);
  assert.equal(demoTranslation("te apetece", "es-ES", "ru-RU"), undefined);
});

test("a failed write does not prevent reopening previously saved data", async () => {
  let value: string | null = null,
    fail = false;
  const repo = new Repository({
    async get() {
      return value;
    },
    async set(_key, next) {
      if (fail) throw new Error("Disk full");
      value = next;
    },
  });
  const original = initialSnapshot(false);
  await repo.save("a", original);
  fail = true;
  await assert.rejects(repo.save("a", initialSnapshot()), /Disk full/);
  assert.deepEqual((await repo.load("a"))?.snapshot, original);
});

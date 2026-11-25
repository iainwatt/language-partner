import test from "node:test";
import assert from "node:assert/strict";
import { activitySchema } from "../src/core/activity";
import { readingSchema } from "../src/core/reading";
import { badges, conversationDays, nextBadges, shadowingDays, streak } from "../src/core/streaks";

// Noon, so the day is the same wherever the test is run.
const at = (day: string) => new Date(`${day}T12:00:00`).toISOString();
const reading = (day: string, source: "lesson" | "video", seconds: number, complete = true) => readingSchema.parse({
  id: `r-${day}-${source}-${seconds}`, source, sourceId: "abc", title: "T", language: "ru-RU", level: "all", complete,
  durationMs: seconds * 1000, wordsSpoken: 10, accuracy: 80, wordsExpected: 10, wordsMatched: 8, wordsInScript: 10, transcript: "", createdAt: at(day),
});
const take = (day: string, source: "lesson" | "video", seconds: number, kind: "recording" | "watch" = "recording") => activitySchema.parse({
  id: `a-${day}-${source}-${seconds}-${kind}`, kind, source, sourceId: "abc", title: "T", language: "ru-RU", durationMs: seconds * 1000, createdAt: at(day),
});

test("a day of shadowing is a minute of recorded video practice, however it is made up", () => {
  const days = shadowingDays(
    [reading("2026-11-20", "video", 70), reading("2026-11-21", "video", 30, false), reading("2026-11-22", "lesson", 300), reading("2026-11-23", "video", 59)],
    [take("2026-11-21", "video", 35), take("2026-11-22", "lesson", 300), take("2026-11-23", "video", 600, "watch")],
  );
  // The 21st adds up across a reading and a take; scripts and watching do not count.
  assert.deepEqual([...days].sort(), ["2026-11-20", "2026-11-21"]);
});

test("a day of conversation is five spoken turns", () => {
  const tally = (day: string, spokenTurns: number) => ({ day, spokenTurns, updatedAt: at(day) });
  assert.deepEqual([...conversationDays([tally("2026-11-20", 5), tally("2026-11-21", 4), tally("2026-11-22", 12)])].sort(), ["2026-11-20", "2026-11-22"]);
});

test("a streak runs to today, stays alive until the day is over, and resets after a missed day", () => {
  const days = new Set(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-20", "2026-11-21", "2026-11-22"]);
  assert.deepEqual(streak(days, "2026-11-22"), { current: 3, best: 4, doneToday: true });
  // Not yet done today: yesterday's run still stands.
  assert.deepEqual(streak(days, "2026-11-23"), { current: 3, best: 4, doneToday: false });
  // A day was missed.
  assert.deepEqual(streak(days, "2026-11-24"), { current: 0, best: 4, doneToday: false });
  assert.deepEqual(streak(new Set(), "2026-11-24"), { current: 0, best: 0, doneToday: false });
  // The run crosses a month end.
  assert.equal(streak(days, "2026-11-02").current, 4);
});

test("badges are earned by reaching their mark, and the next in each group is in reach", () => {
  const all = badges({ shadowingBest: 7, conversationBest: 2, recordings: 12, words: 49, watchMs: 5.5 * 3600000 });
  const earned = all.filter((badge) => badge.earned).map((badge) => badge.id);
  assert.deepEqual(earned, ["shadowing-3", "shadowing-7", "recordings-1", "recordings-10", "words-10", "watching-1", "watching-5"]);
  assert.deepEqual(nextBadges(all).map((badge) => badge.id), ["shadowing-14", "conversation-3", "recordings-25", "words-50", "watching-10"]);
});

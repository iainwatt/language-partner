import test from "node:test";
import assert from "node:assert/strict";
import { activitySchema, practiceLevel, practiceTotals } from "../src/core/activity";
import { readingSchema } from "../src/core/reading";

let next = 0;
const reading = (source: "lesson" | "video", minutes: number, complete = true, accuracy = 80) => readingSchema.parse({
  id: `r${next++}`, source, sourceId: "abc", title: "T", language: "ru-RU", level: "all", complete,
  durationMs: minutes * 60000, wordsSpoken: 100, accuracy, wordsExpected: 100, wordsMatched: accuracy, wordsInScript: 100, transcript: "", createdAt: "2026-11-21T10:00:00.000Z",
});
const activity = (kind: "watch" | "recording", minutes: number) => activitySchema.parse({
  id: `a${next++}`, kind, source: "video", sourceId: "abc", title: "T", language: "ru-RU", durationMs: minutes * 60000, createdAt: "2026-11-21T10:00:00.000Z",
});

test("a level needs its minutes of both video and script reading, and minutes carry over", () => {
  assert.equal(practiceLevel([]).level, 0);
  assert.equal(practiceLevel([reading("video", 5)]).level, 0);
  // Several short scripts add up; so do several videos.
  const one = [reading("video", 3), reading("video", 2), reading("lesson", 2), reading("lesson", 3)];
  assert.equal(practiceLevel(one).level, 1);
  const two = [...one, reading("video", 5), reading("lesson", 5)];
  assert.equal(practiceLevel(two).level, 2);
  assert.deepEqual(practiceLevel(two).next, { level: 3, minutes: 20, video: 0.5, script: 0.5 });
  const three = [...two, reading("video", 10), reading("lesson", 10)];
  assert.equal(practiceLevel(three).level, 3);
  assert.equal(practiceLevel(three).next, undefined);
});

test("unfinished readings, and ones where almost nothing was heard, do not count toward a level", () => {
  const progress = practiceLevel([reading("video", 5, false), reading("video", 5, true, 10), reading("lesson", 5)]);
  assert.equal(progress.level, 0);
  assert.equal(progress.videoMs, 0);
});

test("totals keep videos and conversations apart, and count every attempt's time", () => {
  const totals = practiceTotals(
    [reading("video", 4), reading("video", 2, false), reading("lesson", 3)],
    [activity("watch", 12), activity("watch", 3), activity("recording", 2), activity("recording", 1)],
  );
  assert.deepEqual([totals.video.watchMs, totals.video.readingMs, totals.video.completed, totals.video.readings], [900000, 360000, 1, 2]);
  assert.deepEqual([totals.lesson.readingMs, totals.recordings, totals.recordingMs, totals.wordsSpoken], [180000, 2, 180000, 300]);
});

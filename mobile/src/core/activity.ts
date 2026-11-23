import { z } from "zod";
import { documentIdSchema, languages } from "./domain";
import type { Reading } from "./reading";

// Time the learner spent on things other than talking and live reading, which
// have records of their own: watching a video, and filming themselves reading.
// One record per sitting, logged when it ends.
const language = z.enum(languages.map((item) => item.code) as [string, ...string[]]);
export const activitySchema = z.object({
  id: documentIdSchema,
  kind: z.enum(["watch", "recording"]),
  // What it was done with: a video, or a saved lesson's script.
  source: z.enum(["lesson", "video"]),
  sourceId: z.string().min(1).max(160),
  title: z.string().max(200),
  language,
  durationMs: z.number().int().min(0).max(86400000),
  createdAt: z.string().max(40),
});
export type Activity = z.infer<typeof activitySchema>;
// Anything shorter is a slip of the finger, not practice.
export const shortestActivity = 5000;

// A reading counts toward a level if it was finished and the phone heard at
// least this share of it. The bar is low on purpose: it is there to rule out
// pressing start and saying nothing, not to punish being misheard.
export const countingAccuracy = 30;
// Minutes of counted live reading each level needs, of videos and of scripts alike.
export const levelMinutes = [5, 10, 20];

export function practiceTotals(readings: Reading[], activity: Activity[]) {
  const sum = <T,>(items: T[], value: (item: T) => number) => items.reduce((total, item) => total + value(item), 0);
  const counted = readings.filter((reading) => reading.complete && reading.accuracy >= countingAccuracy);
  const of = (source: "lesson" | "video") => ({
    readingMs: sum(readings.filter((reading) => reading.source === source), (reading) => reading.durationMs),
    readings: readings.filter((reading) => reading.source === source).length,
    completed: readings.filter((reading) => reading.source === source && reading.complete).length,
    countedMs: sum(counted.filter((reading) => reading.source === source), (reading) => reading.durationMs),
  });
  const recordings = activity.filter((item) => item.kind === "recording");
  return {
    video: { ...of("video"), watchMs: sum(activity.filter((item) => item.kind === "watch"), (item) => item.durationMs) },
    lesson: of("lesson"),
    recordings: recordings.length,
    recordingMs: sum(recordings, (item) => item.durationMs),
    wordsSpoken: sum(readings, (reading) => reading.wordsSpoken),
  };
}

// The level reached, and how far along the next one is. A level needs its
// minutes of video reading and of script reading both; minutes carry over
// from one level to the next.
export function practiceLevel(readings: Reading[]) {
  const totals = practiceTotals(readings, []);
  const videoMs = totals.video.countedMs, scriptMs = totals.lesson.countedMs;
  const level = levelMinutes.filter((minutes) => videoMs >= minutes * 60000 && scriptMs >= minutes * 60000).length;
  const next = levelMinutes[level];
  return {
    level,
    top: levelMinutes.length,
    videoMs,
    scriptMs,
    ...(next ? { next: { level: level + 1, minutes: next, video: Math.min(1, videoMs / (next * 60000)), script: Math.min(1, scriptMs / (next * 60000)) } } : {}),
  };
}

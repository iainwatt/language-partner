import { z } from "zod";
import { documentIdSchema, languages } from "./domain";
import { wordLevels } from "./practice";
import { withoutStress } from "./script";

// A live reading: the learner reads a script or a section of a video aloud
// from start to finish while the phone transcribes them. Each attempt is
// logged, finished or not, because the time spent reading aloud and the words
// spoken are what is being counted. Accuracy is kept as a guide only: the
// recogniser mishears, and other voices and noise get in.
const language = z.enum(languages.map((item) => item.code) as [string, ...string[]]);
export const readingSchema = z.object({
  id: documentIdSchema,
  // What was read: a saved lesson's script, or part of a video's transcript.
  source: z.enum(["lesson", "video"]),
  sourceId: z.string().min(1).max(160),
  title: z.string().max(200),
  language,
  // How much help was on screen.
  level: z.enum(wordLevels),
  // False when the learner stopped or left before the end.
  complete: z.boolean(),
  // Time spent reading aloud, and every word the phone heard in that time.
  durationMs: z.number().int().min(0),
  wordsSpoken: z.number().int().min(0),
  // Of the words reached in the script, how many were heard, as a percentage.
  accuracy: z.number().int().min(0).max(100),
  wordsExpected: z.number().int().min(0),
  wordsMatched: z.number().int().min(0),
  // The whole script's length, to show how far an unfinished attempt got.
  wordsInScript: z.number().int().min(0),
  // Words a minute for a lesson; absent for a video, which sets its own pace.
  speed: z.number().int().min(1).max(400).optional(),
  // For a video: the section read, in seconds from its start.
  section: z.object({ from: z.number().int().min(0), to: z.number().int().min(0) }).optional(),
  transcript: z.string().max(20000),
  createdAt: z.string().max(40),
});
export type Reading = z.infer<typeof readingSchema>;

// Words as they are compared: no capitals, punctuation or stress marks, and ё as е.
export function readingWords(text: string): string[] {
  return withoutStress(text).toLowerCase().replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu) ?? [];
}

// Whether a heard word counts as the script's word. A letter out in a word of
// four or more, or two in a word of seven or more, is let through: that covers
// most recognition slips, and it is deliberately generous.
export function sameWord(expected: string, heard: string): boolean {
  if (expected === heard) return true;
  const allowed = expected.length >= 7 ? 2 : expected.length >= 4 ? 1 : 0;
  if (!allowed || Math.abs(expected.length - heard.length) > allowed) return false;
  let previous = Array.from({ length: heard.length + 1 }, (_, index) => index);
  for (let i = 1; i <= expected.length; i++) {
    const row = [i];
    let least = i;
    for (let j = 1; j <= heard.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (expected[i - 1] === heard[j - 1] ? 0 : 1));
      least = Math.min(least, row[j]);
    }
    if (least > allowed) return false;
    previous = row;
  }
  return previous[heard.length] <= allowed;
}

// How many of the expected words were heard, in order. Extra words, repeats
// and restarts cost nothing; a word skipped or not recognised is simply missed.
export function matchedWords(expected: string[], heard: string[]): number {
  let previous = new Array<number>(heard.length + 1).fill(0);
  for (let i = 1; i <= expected.length; i++) {
    const row = new Array<number>(heard.length + 1).fill(0);
    for (let j = 1; j <= heard.length; j++)
      row[j] = sameWord(expected[i - 1], heard[j - 1]) ? previous[j - 1] + 1 : Math.max(previous[j], row[j - 1]);
    previous = row;
  }
  return previous[heard.length];
}

// The measurements for one attempt. `reached` is how many of the script's
// words had gone past when it ended; an unfinished attempt is marked only on those.
export function measureReading(script: string, transcript: string, reached?: number) {
  const all = readingWords(script);
  const expected = all.slice(0, Math.max(0, Math.min(all.length, Math.round(reached ?? all.length))));
  const heard = readingWords(transcript);
  const wordsMatched = matchedWords(expected, heard);
  return {
    wordsSpoken: heard.length,
    wordsExpected: expected.length,
    wordsMatched,
    wordsInScript: all.length,
    accuracy: expected.length ? Math.round((wordsMatched / expected.length) * 100) : 0,
  };
}

// Totals for the stats page.
export function readingTotals(readings: Reading[]) {
  const levels = wordLevels.map((level) => {
    const at = readings.filter((reading) => reading.level === level && reading.wordsExpected > 0);
    return { level, attempts: at.length, accuracy: at.length ? Math.round(at.reduce((sum, reading) => sum + reading.accuracy, 0) / at.length) : undefined };
  });
  return {
    attempts: readings.length,
    complete: readings.filter((reading) => reading.complete).length,
    durationMs: readings.reduce((sum, reading) => sum + reading.durationMs, 0),
    wordsSpoken: readings.reduce((sum, reading) => sum + reading.wordsSpoken, 0),
    levels,
  };
}

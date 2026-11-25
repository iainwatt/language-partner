import { z } from "zod";
import type { Activity } from "./activity";
import { localDay } from "./domain";
import type { Reading } from "./reading";

// Streaks, today's numbers and badges. There are two streaks, for the two
// things that show a learner is really practising: recording themselves
// shadowing a video, and talking with the partner out loud. A day is the
// phone's own calendar day. Miss a day and the streak starts again.

// One day's tally of what is not recorded anywhere else: turns spoken to the
// partner. Typed turns are never counted.
export const dayTallySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  spokenTurns: z.number().int().min(0).max(100000),
  updatedAt: z.string().max(40),
});
export type DayTally = z.infer<typeof dayTallySchema>;

// A minute of recorded shadowing, or five spoken turns, makes the day count.
export const shadowingMsForDay = 60000;
export const spokenTurnsForDay = 5;

// The learner's calendar day on which something stamped in universal time happened.
export const dayOf = (stamp: string) => {
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? "" : localDay(date);
};
const before = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return localDay(new Date(year, month - 1, date - 1));
};

// Time spent recorded shadowing a video on each day: practice takes that were
// kept, and live readings of a video, finished or not.
export function shadowingByDay(readings: Reading[], activity: Activity[]): Record<string, number> {
  const days: Record<string, number> = {};
  const add = (stamp: string, ms: number) => {
    const day = dayOf(stamp);
    if (day) days[day] = (days[day] ?? 0) + ms;
  };
  for (const reading of readings) if (reading.source === "video") add(reading.createdAt, reading.durationMs);
  for (const item of activity) if (item.kind === "recording" && item.source === "video") add(item.createdAt, item.durationMs);
  return days;
}
export const shadowingDays = (readings: Reading[], activity: Activity[]) =>
  new Set(Object.entries(shadowingByDay(readings, activity)).filter(([, ms]) => ms >= shadowingMsForDay).map(([day]) => day));
export const conversationDays = (tallies: DayTally[]) =>
  new Set(tallies.filter((tally) => tally.spokenTurns >= spokenTurnsForDay).map((tally) => tally.day));

// The run of days up to now, and the longest there has been. A streak is
// still alive through today if yesterday counted, so it does not read as
// broken before the learner has had the chance to keep it.
export function streak(days: Set<string>, today: string) {
  const doneToday = days.has(today);
  let current = 0;
  for (let day = doneToday ? today : before(today); days.has(day); day = before(day)) current++;
  let best = 0;
  for (const day of days) {
    if (days.has(before(day))) continue;
    // `day` starts a run: count along it.
    let length = 0;
    const date = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
    while (days.has(localDay(date))) { length++; date.setDate(date.getDate() + 1); }
    best = Math.max(best, length);
  }
  return { current, best: Math.max(best, current), doneToday };
}

export type Badge = { id: string; group: string; label: string; earned: boolean; goal: number; have: number };
const hours = (ms: number) => ms / 3600000;
// Every badge there is, earned or not, in a fixed order.
export function badges(have: { shadowingBest: number; conversationBest: number; recordings: number; words: number; watchMs: number }): Badge[] {
  const steps = (group: string, id: string, reached: number, goals: number[], label: (goal: number) => string): Badge[] =>
    goals.map((goal) => ({ id: `${id}-${goal}`, group, label: label(goal), earned: reached >= goal, goal, have: reached }));
  const days = [3, 7, 14, 30, 60, 100];
  return [
    ...steps("Shadowing streak", "shadowing", have.shadowingBest, days, (goal) => `${goal} days shadowing`),
    ...steps("Conversation streak", "conversation", have.conversationBest, days, (goal) => `${goal} days talking`),
    ...steps("Recordings", "recordings", have.recordings, [1, 10, 25, 50, 100], (goal) => (goal === 1 ? "First recording" : `${goal} recordings`)),
    ...steps("Words saved", "words", have.words, [10, 50, 100, 250, 500], (goal) => `${goal} words saved`),
    ...steps("Watching", "watching", Math.floor(hours(have.watchMs) * 100) / 100, [1, 5, 10, 25], (goal) => `${goal} ${goal === 1 ? "hour" : "hours"} watched`),
  ];
}
// In each group, the first badge not yet earned: what is within reach.
export const nextBadges = (all: Badge[]) =>
  [...new Set(all.map((badge) => badge.group))].flatMap((group) => all.find((badge) => badge.group === group && !badge.earned) ?? []);

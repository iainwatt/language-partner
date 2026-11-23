import { addDays, localDay, type Stats } from "./domain";

export type TalkTimeRange = "daily" | "weekly" | "monthly";
export type TalkTimePoint = {
  key: string;
  label: string;
  ms: number;
};

function localDate(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, 12);
}

function daysBetween(start: string, end: string) {
  return Math.round(
    (localDate(end).getTime() - localDate(start).getTime()) / 86400000,
  );
}

function startOfWeek(day: string) {
  const value = localDate(day);
  const mondayOffset = (value.getDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

function monthKey(day: string) {
  return day.slice(0, 7);
}

function addMonths(day: string, months: number) {
  const value = localDate(day);
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  return localDay(value);
}

export function addTalkTime(stats: Stats, day: string, elapsedMs: number, language?: string): Stats {
  const elapsed = Math.max(0, Math.floor(elapsedMs));
  if (!elapsed) return stats;
  return {
    ...stats,
    ...(language
      ? {
          talkTimeByLanguage: {
            ...stats.talkTimeByLanguage,
            [language]: (stats.talkTimeByLanguage?.[language] ?? 0) + elapsed,
          },
        }
      : {}),
    talkTimeMs: stats.talkTimeMs + elapsed,
    talkTimeByDay: {
      ...stats.talkTimeByDay,
      [day]: (stats.talkTimeByDay[day] ?? 0) + elapsed,
    },
  };
}

export function talkTimeSummary(stats: Stats, today = localDay()) {
  let week = 0;
  let month = 0;
  for (const [day, ms] of Object.entries(stats.talkTimeByDay)) {
    const difference = daysBetween(day, today);
    if (difference >= 0 && difference < 7) week += ms;
    if (monthKey(day) === monthKey(today)) month += ms;
  }
  return {
    day: stats.talkTimeByDay[today] ?? 0,
    week,
    month,
    total: stats.talkTimeMs,
  };
}

export function talkTimeSeries(
  stats: Stats,
  range: TalkTimeRange,
  today = localDay(),
): TalkTimePoint[] {
  if (range === "daily")
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(today, index - 6);
      return {
        key: day,
        label: localDate(day).toLocaleDateString(undefined, {
          weekday: "narrow",
        }),
        ms: stats.talkTimeByDay[day] ?? 0,
      };
    });

  if (range === "weekly") {
    const currentWeek = startOfWeek(today);
    return Array.from({ length: 6 }, (_, index) => {
      const start = addDays(currentWeek, (index - 5) * 7);
      let ms = 0;
      for (let offset = 0; offset < 7; offset++)
        ms += stats.talkTimeByDay[addDays(start, offset)] ?? 0;
      return {
        key: start,
        label: localDate(start).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        ms,
      };
    });
  }

  const currentMonth = `${monthKey(today)}-01`;
  return Array.from({ length: 6 }, (_, index) => {
    const start = addMonths(currentMonth, index - 5);
    const key = monthKey(start);
    const ms = Object.entries(stats.talkTimeByDay).reduce(
      (sum, [day, value]) => sum + (monthKey(day) === key ? value : 0),
      0,
    );
    return {
      key,
      label: localDate(start).toLocaleDateString(undefined, {
        month: "short",
      }),
      ms,
    };
  });
}

// All-time talk time per language, longest first. `earlier` is time recorded
// before languages were tracked, so the rows always add up to the total.
export function talkTimeByLanguage(stats: Stats) {
  const languages = Object.entries(stats.talkTimeByLanguage ?? {})
    .filter(([, ms]) => ms > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([language, ms]) => ({ language, ms }));
  const tracked = languages.reduce((sum, { ms }) => sum + ms, 0);
  return { languages, earlier: Math.max(0, stats.talkTimeMs - tracked) };
}

// Count the time recorded before languages were tracked as one language's.
export function assignEarlierTalkTime(stats: Stats, language: string): Stats {
  const { earlier } = talkTimeByLanguage(stats);
  if (!earlier) return stats;
  const byLanguage = stats.talkTimeByLanguage ?? {};
  return { ...stats, talkTimeByLanguage: { ...byLanguage, [language]: (byLanguage[language] ?? 0) + earlier } };
}

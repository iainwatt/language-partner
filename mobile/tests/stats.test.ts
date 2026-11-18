import test from "node:test";
import assert from "node:assert/strict";
import { snapshotSchema, type Stats } from "../src/core/domain";
import {
  addTalkTime,
  talkTimeByLanguage,
  talkTimeSeries,
  talkTimeSummary,
} from "../src/core/stats";

test("talk time keeps lifetime history and derives daily, weekly and monthly totals", () => {
  let stats: Stats = { talkTimeMs: 0, talkTimeByDay: {} };
  stats = addTalkTime(stats, "2026-09-18", 60 * 60000);
  stats = addTalkTime(stats, "2026-09-17", 30 * 60000);
  stats = addTalkTime(stats, "2026-09-11", 5 * 60000);
  stats = addTalkTime(stats, "2026-08-20", 120 * 60000);

  assert.deepEqual(talkTimeSummary(stats, "2026-09-18"), {
    day: 60 * 60000,
    week: 90 * 60000,
    month: 95 * 60000,
    total: 215 * 60000,
  });

  const daily = talkTimeSeries(stats, "daily", "2026-09-18");
  assert.equal(daily.length, 7);
  assert.equal(daily.at(-1)?.key, "2026-09-18");
  assert.equal(daily.at(-1)?.ms, 60 * 60000);

  const weekly = talkTimeSeries(stats, "weekly", "2026-09-18");
  assert.equal(weekly.length, 6);
  assert.equal(weekly.at(-1)?.ms, 90 * 60000);

  const monthly = talkTimeSeries(stats, "monthly", "2026-09-18");
  assert.equal(monthly.length, 6);
  assert.equal(monthly.at(-1)?.key, "2026-09");
  assert.equal(monthly.at(-1)?.ms, 95 * 60000);
});

test("legacy snapshots retain their lifetime total and start with empty daily history", () => {
  const parsed = snapshotSchema.parse({
    version: 1,
    settings: {
      native: "en-US",
      target: "ru-RU",
      provider: "openai",
      model: "gpt-5.4-mini",
      mode: "demo",
      autoSpeak: true,
    },
    conversations: [],
    activeConversationId: "",
    entries: [],
    savedConversations: [],
    stats: { talkTimeMs: 125000 },
  });
  assert.equal(parsed.stats.talkTimeMs, 125000);
  assert.deepEqual(parsed.stats.talkTimeByDay, {});
});

test("talk time is totalled overall and per practice language", () => {
  let stats: Stats = { talkTimeMs: 600000, talkTimeByDay: {} };
  stats = addTalkTime(stats, "2026-11-17", 120000, "es-ES");
  stats = addTalkTime(stats, "2026-11-17", 300000, "ru-RU");
  stats = addTalkTime(stats, "2026-11-18", 60000, "es-ES");
  assert.equal(stats.talkTimeMs, 1080000);
  assert.deepEqual(talkTimeByLanguage(stats), {
    languages: [{ language: "ru-RU", ms: 300000 }, { language: "es-ES", ms: 180000 }],
    earlier: 600000,
  });
  assert.deepEqual(talkTimeByLanguage({ talkTimeMs: 0, talkTimeByDay: {} }), { languages: [], earlier: 0 });
});

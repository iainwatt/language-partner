import test from "node:test";
import assert from "node:assert/strict";
import { matchedWords, measureReading, readingSchema, readingTotals, readingWords, sameWord } from "../src/core/reading";

test("words are compared without capitals, punctuation, stress or ё", () => {
  assert.deepEqual(readingWords("Всё хорошо\u0301, Ёлка!"), ["все", "хорошо", "елка"]);
  assert.deepEqual(readingWords("Привет, мир! 5 раз."), ["привет", "мир", "5", "раз"]);
});

test("a heard word a letter or two out still counts, short words must be exact", () => {
  assert.ok(sameWord("квартире", "квартира"));
  assert.ok(sameWord("понимаю", "понемаю"));
  assert.ok(sameWord("дома", "дом"));
  assert.ok(!sameWord("он", "она"));
  assert.ok(!sameWord("квартире", "кварт"));
  assert.ok(!sameWord("кот", "кит"));
});

test("matching follows the order of the script and forgives extras and repeats", () => {
  const script = readingWords("Мы живём в нашей квартире уже год");
  assert.equal(matchedWords(script, readingWords("мы мы живем в нашей э квартира уже год")), 7);
  assert.equal(matchedWords(script, readingWords("год уже квартире")), 1);
  assert.equal(matchedWords(script, []), 0);
});

test("an unfinished attempt is marked only on the words it reached", () => {
  const whole = measureReading("Мы живём в нашей квартире уже год. Там очень уютно.", "мы живем в нашей квартире");
  assert.deepEqual([whole.wordsExpected, whole.wordsMatched, whole.accuracy, whole.wordsSpoken, whole.wordsInScript], [10, 5, 50, 5, 10]);
  const part = measureReading("Мы живём в нашей квартире уже год. Там очень уютно.", "мы живем в нашей квартире", 5);
  assert.deepEqual([part.wordsExpected, part.accuracy, part.wordsInScript], [5, 100, 10]);
  assert.equal(measureReading("", "привет").accuracy, 0);
});

test("totals count time and words for every attempt, finished or not", () => {
  const reading = (level: string, complete: boolean, accuracy: number) => readingSchema.parse({
    id: `r${Math.random().toString(36).slice(2)}`, source: "lesson", sourceId: "abc", title: "T", language: "ru-RU", level, complete,
    durationMs: 60000, wordsSpoken: 80, accuracy, wordsExpected: 100, wordsMatched: accuracy, wordsInScript: 100, transcript: "", createdAt: "2026-11-21T10:00:00.000Z",
  });
  const totals = readingTotals([reading("all", true, 90), reading("all", false, 70), reading("openers", true, 40)]);
  assert.deepEqual([totals.attempts, totals.complete, totals.durationMs, totals.wordsSpoken], [3, 2, 180000, 240]);
  assert.deepEqual(totals.levels.map((item) => [item.level, item.attempts, item.accuracy]), [["all", 2, 80], ["keys", 0, undefined], ["rest", 0, undefined], ["openers", 1, 40]]);
});

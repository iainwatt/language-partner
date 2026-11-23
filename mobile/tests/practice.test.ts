import test from "node:test";
import assert from "node:assert/strict";
import { scriptPieces } from "../src/core/script";
import { keyRuns, meaningKey, missingMeanings, missingRests, restKey, sentenceRests, shownPieces, wordLevelNumber } from "../src/core/practice";

const script = "Мы живём [s,pre:в наш|ей квартир|е] уже год. Там [d:очень уютно]! Да.";
const { pieces, sentences } = scriptPieces(script);
const text = (shown: { text: string }[]) => shown.map((piece) => piece.text).join("");

test("saved phrases are found whole, with their sentence", () => {
  assert.deepEqual(keyRuns(pieces, sentences).map((run) => [run.text, run.sentence]), [
    ["в нашей квартире", "Мы живём в нашей квартире уже год."],
    ["очень уютно", "Там очень уютно!"],
  ]);
  assert.deepEqual(missingMeanings(pieces, sentences, { "очень уютно": "very cosy" }).map((item) => item.text), ["в нашей квартире"]);
});

test("everything is shown at the first level", () => {
  assert.equal(text(shownPieces(pieces, "all")), "Мы живём в нашей квартире уже год. Там очень уютно! Да.");
});

test("saved phrases with a known meaning are given in the learner's language", () => {
  const shown = shownPieces(pieces, "keys", { [meaningKey("В нашей  квартире")]: "in our flat" });
  assert.equal(text(shown), "Мы живём in our flat уже год. Там очень уютно! Да.");
  assert.deepEqual(shown.filter((piece) => piece.translated).map((piece) => piece.text), ["in our flat"]);
});

test("only the first three words of a longer sentence stay readable", () => {
  const shown = shownPieces(pieces, "openers");
  assert.equal(text(shown), "Мы живём в нашей квартире уже год. Там очень уютно! Да.");
  // Each hidden word stands alone, so the learner can count what is to come.
  // A stem and its ending are two pieces of one word, so they hide as one bar.
  assert.deepEqual(shown.filter((piece) => piece.hidden).map((piece) => piece.text), ["наш", "ей", "квартир", "е", "уже", "год"]);
  assert.equal(text(shown.filter((piece) => !piece.hidden)), "Мы живём в    . Там очень уютно! Да.");
});

test("the rest of a sentence can be given in the learner's language, and is hidden until it is known", () => {
  assert.deepEqual(sentenceRests(pieces).map((item) => [item.start, item.rest]), [["Мы живём в", "нашей квартире уже год."]]);
  assert.deepEqual(missingRests(pieces, {}), [{ start: "Мы живём в", rest: "нашей квартире уже год." }]);
  const meanings = { [restKey("нашей квартире уже год.")]: "our flat for a year now." };
  assert.deepEqual(missingRests(pieces, meanings), []);
  const shown = shownPieces(pieces, "rest", meanings);
  assert.equal(text(shown), "Мы живём в our flat for a year now. Там очень уютно! Да.");
  assert.deepEqual(shown.filter((piece) => piece.aside).map((piece) => piece.text), ["our flat for a year now. "]);
  assert.equal(shownPieces(pieces, "rest").filter((piece) => piece.hidden).length, 6);
  assert.deepEqual((["all", "keys", "rest", "openers"] as const).map(wordLevelNumber), [4, 3, 2, 1]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { splitCorrections } from "../src/core/corrections";
import { chatPrompt, chatPromptVersion } from "../server/prompts";
import { chatPromptV0 } from "../server/prompts/chat.v0";

test("the hidden log is removed from the reply and parsed into corrections", () => {
  const { text, corrections } = splitCorrections(
    "Понимаю! Лучше сказать: я рассказываю ей сказки на ночь.\n\nА какие сказки она любит?\n<log>\ncase | рассказываю её сказки | рассказываю ей сказки\nWord Choice | смешная девушка | смешная девочка\nmisheard | sky | Скай\n</log>",
  );
  assert.equal(text, "Понимаю! Лучше сказать: я рассказываю ей сказки на ночь.\n\nА какие сказки она любит?");
  assert.deepEqual(corrections, [
    { category: "case", said: "рассказываю её сказки", better: "рассказываю ей сказки" },
    { category: "word choice", said: "смешная девушка", better: "смешная девочка" },
    { category: "misheard", said: "sky", better: "Скай" },
  ]);
});

test("a reply without a log, or with a malformed or unclosed one, is never lost", () => {
  assert.deepEqual(splitCorrections("Отлично! Что дальше?"), { text: "Отлично! Что дальше?", corrections: [] });
  assert.deepEqual(
    splitCorrections("Хорошо.\n<log>\nnonsense line\ninvented category | а | б\ncase | в парк | в парке"),
    { text: "Хорошо.", corrections: [{ category: "case", said: "в парк", better: "в парке" }] },
  );
});

test("the versioned chat prompt in use covers dictation slips and the log; v0 stays as shipped", () => {
  assert.equal(chatPromptVersion, "v1");
  const prompt = chatPrompt("English", "Русский");
  assert.match(prompt, /Converse in Русский/);
  assert.match(prompt, /recognition slip/);
  assert.match(prompt, /<log>\ncategory \| the learner's words \| the corrected words\n<\/log>/);
  assert.match(prompt, /misheard/);
  assert.doesNotMatch(chatPromptV0("English", "Русский"), /<log>|DICTATION/);
});

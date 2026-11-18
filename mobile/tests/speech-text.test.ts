import test from "node:test";
import assert from "node:assert/strict";
import { prepareSpeechText, stripEmphasis } from "../src/core/speechText";

test("Russian quotation marks and ASCII quote wrappers do not reach speech", () => {
  for (const phrase of [
    "Он сказал: «Привет, как дела?»",
    "Он сказал: <<Привет, как дела?>>",
    "Он сказал: „Привет, как дела?“",
    'Он сказал: "Привет, как дела?"',
    "Он сказал: “Привет, как дела?”",
  ]) {
    assert.equal(prepareSpeechText(phrase), "Он сказал: Привет, как дела?");
  }
  assert.equal(
    prepareSpeechText("Выражение«доброе утро» — это приветствие."),
    "Выражение доброе утро — это приветствие.",
  );
  assert.equal(prepareSpeechText("«да», «нет»."), "да, нет.");
});

test("speech retains the words inside common LLM formatting and paragraph pauses", () => {
  assert.equal(
    prepareSpeechText(
      "## Полезные выражения\n\n- **«Доброе утро»** — приветствие.\n• *Спасибо!*\n- __Пожалуйста.__\n\n`До встречи!`",
    ),
    "Полезные выражения\n\nДоброе утро — приветствие.\nСпасибо!\nПожалуйста.\n\nДо встречи!",
  );
  assert.equal(prepareSpeechText("**Очень _хорошо_!**"), "Очень хорошо!");
  assert.equal(prepareSpeechText("«**Да!**» <<_Нет._>>"), "Да! Нет.");
  assert.equal(prepareSpeechText("```text\nПривет!\n```"), "Привет!");
});

test("speech cleanup preserves meaningful punctuation, numbers and Unicode", () => {
  for (const text of [
    "Не делай этого! Почему? Подожди… Да, хорошо.",
    "Don't stop. It’s Jean-Luc’s turn; l’été est là.",
    "Кто-то сказал: ёж, ещё, всё. 中文 日本語 العربية.",
    "2 < 3; 5 > 4; 2 * 3 * 4 = 24; -5 + 2 = -3.",
    "Цена: 12,50 €; скидка 10%; время 12:30; дата 17.09.2026.",
    'A 5" screen and a 7" screen. file_name, C#, C++.',
  ]) {
    assert.equal(prepareSpeechText(text), text);
  }
});

test("empty or decorative-only replies produce no speech text", () => {
  for (const text of ["", " \n\t", "«»", "<<>>", "***", "* * *", "---", "___"]) {
    assert.equal(prepareSpeechText(text), "");
  }
});

test("emoji and arrows are not spoken, and correction lists lose their emphasis markers", () => {
  assert.equal(prepareSpeechText("Понимаю 🙂 Здесь можно сказать так:"), "Понимаю Здесь можно сказать так:");
  assert.equal(prepareSpeechText("Отлично! 👍🏽 👨‍👩‍👧 ❤️ 🇪🇸"), "Отлично!");
  assert.equal(
    prepareSpeechText("Небольшие исправления:\n- **sky** → **Скай**\n- **смешная девушка** → для ребёнка лучше **смешная девочка**"),
    "Небольшие исправления:\nsky, Скай\nсмешная девушка, для ребёнка лучше смешная девочка",
  );
  assert.equal(prepareSpeechText("2 * 3 = 6, №5, 10:30"), "2 * 3 = 6, №5, 10:30");
});

test("replies are stored without emphasis markers but otherwise unchanged", () => {
  assert.equal(
    stripEmphasis("А, поняла 🙂\n\n**Она убегает от меня.**\n- **sky** → **Скай**\n2 * 3 * 4"),
    "А, поняла 🙂\n\nОна убегает от меня.\n- sky → Скай\n2 * 3 * 4",
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { initialSnapshot, languages, providers, translatesReplies } from "../src/core/domain";
import {
  bundledGrammarTopics,
  makeGrammarConversation,
} from "../src/core/grammar";
import { executeLlm, llmRequestSchema } from "../server/llm";
import { grammarAccentRanges } from "../src/core/grammarAccent";

function accentedText(text: string, topicId: string, guideOnly = false) {
  return grammarAccentRanges(text, topicId, guideOnly).map(({ start, end }) =>
    text.slice(start, end),
  );
}

test("each supported language has valid starter topics and can open a focused conversation", () => {
  for (const { code } of languages) {
    const topics = bundledGrammarTopics(code);
    assert.ok(topics.length >= 3);
    assert.ok(topics.every((topic) => topic.language === code));
    const conversation = makeGrammarConversation(
      topics[0],
      "en-US",
      code,
    );
    assert.equal(conversation.title, topics[0].title);
    assert.equal(conversation.grammar?.prompt, topics[0].prompt);
    assert.equal(conversation.grammar?.reminder, topics[0].reminder);
    assert.deepEqual(conversation.messages, []);
  }
});

test("grammar guides accent the target forms without changing their text", () => {
  const past = "он работал\nона работала\nони работали\nоно работало";
  assert.deepEqual(accentedText(past, "past-events"), ["л", "ла", "ли", "ло"]);

  const future = "я буду читать · ты будешь читать · я прочитаю";
  assert.deepEqual(accentedText(future, "plans-intentions"), [
    "буду",
    "будешь",
    "ю",
  ]);

  const aspect =
    "читать → прочитать · делать → сделать · решать → решить · Я прочитал книгу";
  assert.deepEqual(accentedText(aspect, "verb-aspects"), [
    "про",
    "с",
    "решить",
    "про",
  ]);

  assert.deepEqual(
    accentedText("с новыми друзьями", "instrumental-plural"),
    ["ыми", "ьями"],
  );

  const opening =
    "Guide: он работал.\nExercise:\nЧто ты делал вчера?";
  assert.deepEqual(accentedText(opening, "past-events", true), ["л"]);
  assert.equal(opening, `${opening}`);
});

test("Russian has the complete language-specific grammar curriculum", () => {
  const topics = bundledGrammarTopics("ru-RU");
  assert.deepEqual(
    topics.map(({ title }) => title),
    [
      "Past Tense",
      "Future Tense",
      "Verb Aspects (Perfective/Imperfective)",
      "Instrumental Case (Singular)",
      "Instrumental Case (Plural)",
    ],
  );
  for (const topic of topics) {
    assert.ok(topic.reminder.length > 0);
    assert.ok(topic.reminder.length <= 2000);
    assert.match(topic.prompt, /LESSON GOAL AND SCOPE/);
    assert.match(topic.prompt, /LEARNER CONTEXT/);
    assert.match(topic.prompt, /FIRST ASSISTANT TURN — COMPACT REFERENCE/);
    assert.match(topic.prompt, /INITIAL EXERCISE EXAMPLES/);
    assert.match(topic.prompt, /PRACTICE FLOW/);
    assert.match(topic.prompt, /EXERCISE VARIATIONS/);
    assert.match(topic.prompt, /CORRECTION GUIDE/);
    assert.match(topic.prompt, /PROMPTING GUIDE/);
    assert.doesNotMatch(topic.prompt, /Exercise \(Русский\):|English:/);
    assert.ok(topic.prompt.length <= 10000);
  }
  assert.match(topics[0].prompt, /do not change for first, second or third person/i);
  assert.match(topics[1].prompt, /буду\/будешь\/будет\/будем\/будете\/будут/);
  assert.match(topics[1].reminder, /Imperfective: conjugated быть/i);
  assert.match(topics[1].reminder, /я буду читать · ты будешь читать/);
  assert.match(topics[1].prompt, /Show an English reminder/i);
  assert.match(topics[2].prompt, /process or repetition/i);
  assert.match(topics[2].prompt, /supported free conversation/i);
  assert.match(topics[2].prompt, /Supply 6–8 aspect pairs/i);
  assert.match(topics[2].prompt, /Do not limit verb choices to an A2–B1 vocabulary list/i);
  assert.match(topics[2].prompt, /relatively common Russian verbs from a broad range/i);
  assert.match(topics[2].prompt, /Negation of Process or Habit/i);
  assert.match(topics[2].prompt, /English translation directly on the next line/i);
  assert.doesNotMatch(topics[2].prompt, /Закончите два предложения|___/);
  assert.match(topics[3].prompt, /F -а\/-я → -ой\/-ей/);
  assert.match(topics[4].prompt, /Most plural nouns → -ами\/-ями/);
});

test("grammar lesson data is validated and included in the model instruction", async () => {
  const grammar = bundledGrammarTopics("ru-RU")[0];
  const settings = {
    ...initialSnapshot(false).settings,
    mode: "api" as const,
    provider: "openai" as const,
    model: providers.openai.models[0],
  };
  const request = llmRequestSchema.parse({
    action: "generate",
    settings,
    messages: [
      {
        id: "m",
        role: "user",
        text: "I went to work.",
        final: true,
        createdAt: "2026-09-18T10:00:00.000Z",
      },
    ],
    grammar,
  });
  if (request.action !== "generate") throw new Error("Expected generate request");
  let body: any;
  const result = await executeLlm(
    request,
    { openai: "test-secret" },
    async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({
        output: [{ content: [{ type: "output_text", text: "Хорошо." }] }],
      });
    },
  );
  assert.deepEqual(result, { text: "Хорошо." });
  assert.match(body.instructions, /focused grammar lesson/i);
  assert.match(body.instructions, /curriculum's reminder field/i);
  assert.match(body.instructions, /choose or adapt one/i);
  assert.match(body.instructions, /follow that order exactly/i);
  assert.match(body.instructions, /without colour or formatting markers/i);
  assert.match(body.instructions, /rule explanations must be in English/i);
  assert.match(body.instructions, /FIRST ASSISTANT TURN — COMPACT REFERENCE/);
  assert.match(body.instructions, /past-tense verb formation/i);
  assert.match(body.instructions, /BILINGUAL EXERCISE FORMAT/);
  assert.match(
    body.instructions,
    /Exercise:\n<target-language task>\n<native-language translation>/,
  );
  assert.match(body.instructions, /Do not add language-name labels/i);
  assert.doesNotMatch(body.instructions, /English:\n<native-language translation>/);
  assert.match(body.instructions, /do not add an answer or extra hint/i);
  assert.match(body.instructions, /translation directly below every target-language model sentence/i);
  assert.doesNotMatch(JSON.stringify(body.input), /past-tense verb formation/i);
});

test("translations default to on only across writing systems, and the learner's choice wins per language", async () => {
  const base = { ...initialSnapshot(false).settings, mode: "api" as const };
  assert.equal(translatesReplies({ ...base, native: "en-US", target: "ru-RU" }), true);
  assert.equal(translatesReplies({ ...base, native: "en-US", target: "ja-JP" }), true);
  assert.equal(translatesReplies({ ...base, native: "en-US", target: "es-ES" }), false);
  assert.equal(translatesReplies({ ...base, native: "fr-FR", target: "de-DE" }), false);
  const chosen = { ...base, translateReplies: { "ru-RU": false, "es-ES": true } };
  assert.equal(translatesReplies({ ...chosen, target: "ru-RU" }), false);
  assert.equal(translatesReplies({ ...chosen, target: "es-ES" }), true);
  assert.equal(translatesReplies({ ...chosen, target: "ja-JP" }), true);

  const instruction = async (settings: typeof base & { translateReplies?: Record<string, boolean> }) => {
    const request = llmRequestSchema.parse({
      action: "generate", settings, grammar: bundledGrammarTopics(settings.target)[0],
      messages: [{ id: "m", role: "user", text: "Hola", final: true, createdAt: "2026-09-18T10:00:00.000Z" }],
    });
    if (request.action !== "generate") throw new Error("Expected generate request");
    let body: any;
    await executeLlm(request, { openai: "test-secret" }, async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text: "Vale." }] }] });
    });
    return body.instructions as string;
  };
  assert.match(await instruction({ ...base, target: "es-ES" }), /TRANSLATIONS OFF: .*in Español only, with no English translation/);
  assert.doesNotMatch(await instruction({ ...base, target: "ru-RU" }), /TRANSLATIONS OFF/);
  assert.match(await instruction({ ...chosen, target: "ru-RU" }), /TRANSLATIONS OFF/);
  assert.doesNotMatch(await instruction({ ...chosen, target: "es-ES" }), /TRANSLATIONS OFF/);
});

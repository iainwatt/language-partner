import test from "node:test";
import assert from "node:assert/strict";
import { splitCorrections } from "../src/core/corrections";
import { chatPrompt, chatPrompts, chatPromptVersion } from "../server/prompts";
import { executeLlm, llmRequestSchema, naturalAndLiteral, reviewVerdict } from "../server/llm";
import { reviewPrompt, scriptPrompt, translatePrompt } from "../server/prompts";
import { commitWrites } from "../src/core/cloudDictionary";
import { entrySchema, markReviewed, saveEntry, unreviewed } from "../src/core/domain";
import { mistakeDocuments } from "../server/mistakes";
import { initialSnapshot } from "../src/core/domain";
import { judge } from "../evals/checks";
import { russianCases } from "../evals/cases.ru";
import { report } from "../evals/report";

const tagged =
  "Понимаю!\n\n<corrections>\nОна постоянно забирается на дерево, и я рассказываю ей сказки.\nна дереве → на дерево\n- рассказываю её → рассказываю ей (дательный падеж)\n</corrections>\n\nА какие сказки она любит?\n<misheard>\nsky → Скай\n</misheard>";

test("tagged sections are separated from the reply and each fix is read", () => {
  assert.deepEqual(splitCorrections(tagged), {
    text: "Понимаю!\n\nА какие сказки она любит?",
    shown: "Она постоянно забирается на дерево, и я рассказываю ей сказки.\nна дереве → на дерево\n- рассказываю её → рассказываю ей (дательный падеж)",
    natural: "Она постоянно забирается на дерево, и я рассказываю ей сказки.",
    corrections: [
      { said: "sky", better: "Скай", misheard: true },
      { said: "на дереве", better: "на дерево", misheard: false },
      { said: "рассказываю её", better: "рассказываю ей", note: "дательный падеж", misheard: false },
    ],
    position: "middle",
  });
});

test("a reply without tags, or with an unclosed one, is never lost", () => {
  assert.deepEqual(splitCorrections("Отлично! Что дальше?"), {
    text: "Отлично! Что дальше?", shown: "", corrections: [], position: "none",
  });
  const unclosed = splitCorrections("Хорошо. А потом?\n<corrections>\nв парк -> в парке");
  assert.equal(unclosed.text, "Хорошо. А потом?");
  assert.equal(unclosed.position, "last");
  assert.deepEqual(unclosed.corrections, [{ said: "в парк", better: "в парке", misheard: false }]);
});

test("the prompt in use tags corrections and hidden slips; earlier versions stay as shipped", () => {
  // The app uses the version that worked. v6 added rules against echoing and
  // for supplying a word; they patched trouble made by other instructions.
  assert.equal(chatPromptVersion, "v5");
  const prompt = chatPrompt("English", "Русский");
  assert.match(prompt, /Converse in Русский/);
  assert.match(prompt, /<corrections>\nthe learner's words → the corrected words \(short reason\)\n<\/corrections>/);
  assert.match(prompt, /<misheard>/);
  assert.match(prompt, /<meant> section saying, in English, what the learner meant/);
  assert.doesNotMatch(chatPrompts.v2("English", "Русский"), /<meant>/);
  assert.doesNotMatch(chatPrompts.v0("English", "Русский"), /<corrections>|DICTATION/);
  assert.match(chatPrompts.v1("English", "Русский"), /<log>/);
});

test("the server returns the corrections block and one account document per fix, with the sentence", async () => {
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const request = llmRequestSchema.parse({
    action: "generate", settings,
    messages: [{ id: "m", role: "user", text: "я рассказываю её сказки sky", final: true, createdAt: "2026-11-18T10:00:00.000Z" }],
  });
  if (request.action !== "generate") throw new Error("Expected generate request");
  const answer = (text: string) => executeLlm(request, { openai: "test-secret" }, async () =>
    Response.json({ output: [{ content: [{ type: "output_text", text }] }] }));
  const result: any = await answer("А что потом?\n<corrections>\nЯ рассказываю ей сказки.\nрассказываю её → рассказываю ей\n</corrections>\n<misheard>\nsky → Скай\n</misheard>");
  assert.equal(result.text, "А что потом?");
  assert.equal(result.corrections, "Я рассказываю ей сказки.\nрассказываю её → рассказываю ей");
  assert.deepEqual(await answer("Отлично!"), { text: "Отлично!" });
  const turn = { sentence: "я рассказываю её сказки sky", natural: result.natural, native: "en-US", target: "ru-RU" };
  assert.deepEqual(mistakeDocuments(result.fixes, turn, new Date("2026-11-18T10:00:00.000Z")), [
    { said: "sky", better: "Скай", misheard: true, sentence: turn.sentence, native: "en-US", target: "ru-RU", createdAt: "2026-11-18T10:00:00.000Z", promptVersion: chatPromptVersion },
    { said: "рассказываю её", better: "рассказываю ей", misheard: false, sentence: turn.sentence, natural: "Я рассказываю ей сказки.", native: "en-US", target: "ru-RU", createdAt: "2026-11-18T10:00:00.000Z", promptVersion: chatPromptVersion },
  ]);
});

const find = (id: string) => russianCases.find((item) => item.id === id)!;

test("the eval judges slips, errors and clean turns from the reply alone", () => {
  const slip = find("slip-name");
  assert.equal(judge(slip, "Три года — чудесный возраст! Какая сказка у Скай любимая?\n<misheard>\nsky → Скай\n</misheard>").checks["slip left alone"], true);
  assert.equal(judge(slip, "Здорово!\n<misheard>\nsky → Скай\n</misheard>").observed.slipsFlagged, true);
  assert.equal(judge(slip, "Здорово!\n<corrections>\nsky → Скай\n</corrections>").checks["slip left alone"], false);
  assert.equal(judge(slip, "Небольшая поправка: не sky, а Скай. Какая сказка любимая?").checks["slip left alone"], false);

  const several = find("error-several");
  const all = "Понятно!\n<corrections>\nВчера я пошёл в магазин и купил много продуктов.\nидти → пошел\nкупить → купил\nмного продукты → много продуктов\n</corrections>\nЧто ты купил?";
  assert.equal(judge(several, all).checks["error corrected"], true);
  assert.equal(judge(several, all.replace("купить → купил\n", "")).checks["error corrected"], false);
  assert.equal(judge(several, "Понятно!\n<misheard>\nидти → пошёл\n</misheard>").checks["error corrected"], false);
  assert.deepEqual(judge(several, all).observed.position, "middle");

  const clean = find("clean-past");
  assert.equal(judge(clean, "Отлично! А что ещё ты купил?").checks["clean turn untouched"], true);
  assert.equal(judge(clean, "Хорошо.\n<corrections>\nхлеб → хлеба\n</corrections>").checks["clean turn untouched"], false);

  assert.equal(judge(find("ambiguous-bank"), "Ясно.\n<corrections>\nв банки → в банке\n</corrections>").observed.ambiguous, "corrected");
  assert.equal(judge(find("ambiguous-bank"), "Ясно. А кем?").observed.ambiguous, "left alone");
});

test("the eval flags Markdown, emoji and leaked tags, and reports lengths", () => {
  const clean = find("clean-past");
  assert.deepEqual(judge(clean, "Отлично! А что ещё?").checks, { format: true, "plain text": true, "clean turn untouched": true });
  assert.equal(judge(clean, "**Отлично!** А что ещё?").checks["plain text"], false);
  assert.equal(judge(clean, "Отлично 🙂 А что ещё?").checks["plain text"], false);
  assert.equal(judge(clean, "Отлично! <log>\ncase | а | б\n</log>").checks.format, false);
  assert.equal(judge(clean, "Хорошо.\n<corrections>\nПросто текст.\nЕщё текст без стрелки.\n</corrections>").checks.format, false);
  const verdict = judge(clean, "Отлично! А что ещё ты купил?");
  assert.deepEqual([verdict.observed.replyWords, verdict.observed.correctionWords, verdict.observed.endsWithQuestion], [6, 0, true]);
});

test("every case is well formed and the report compares versions", () => {
  assert.equal(new Set(russianCases.map((item) => item.id)).size, russianCases.length);
  for (const item of russianCases) {
    if (item.kind === "slip") assert.ok(item.slips?.length, item.id);
    if (item.kind === "error") assert.ok(item.errors?.length, item.id);
    if (item.kind === "ambiguous") assert.ok(item.watch, item.id);
    assert.equal(item.turn, item.turn.toLowerCase(), `${item.id} is written as dictation delivers it`);
  }
  const clean = find("clean-past");
  const runs = [
    { version: "v1", caseId: clean.id, raw: "**Да!**", verdict: judge(clean, "**Да!**") },
    { version: "v2", caseId: clean.id, raw: "Да! А потом?", verdict: judge(clean, "Да! А потом?") },
    { version: "v2", caseId: clean.id, raw: "", failure: "timeout" },
  ];
  const { summary, document } = report(["v1", "v2"], [clean], runs, 1);
  assert.match(summary, /\| plain text \| 0\/1 \(0%\) \| 1\/1 \(100%\) \|/);
  assert.match(summary, /\| model calls that failed \| 0 \| 1 \|/);
  assert.match(document, /### v1, run 1 — FAILED: plain text/);
  assert.match(document, /Call failed: timeout/);
});

test("the hidden note of what was meant is split off, returned to the app and never shown", async () => {
  const raw = "Какая милая! А что она любит?\n<corrections>\nеё зовут → её зовут\n</corrections>\n<meant>\nMy daughter is called Skye.\nShe is three.\n</meant>";
  const reply = splitCorrections(raw);
  assert.equal(reply.meant, "My daughter is called Skye. She is three.");
  assert.equal(reply.text, "Какая милая! А что она любит?");
  assert.equal(reply.position, "last");
  assert.doesNotMatch(`${reply.text}${reply.shown}`, /Skye|meant/);
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const request = llmRequestSchema.parse({
    action: "generate", settings,
    messages: [{ id: "m", role: "user", text: "мою дочь зовут скай ей три года", final: true, createdAt: "2026-11-18T10:00:00.000Z" }],
  });
  const result: any = await executeLlm(request as any, { openai: "test-secret" }, async () =>
    Response.json({ output: [{ content: [{ type: "output_text", text: raw }] }] }));
  assert.equal(result.meant, "My daughter is called Skye. She is three.");
  assert.equal(judge(find("clean-past"), "Отлично! А потом?\n<meant>I went to the shop.</meant>").observed.noted, true);
  assert.equal(judge(find("clean-past"), "Отлично! А потом?\n<meant>Я ходил в магазин.</meant>").observed.noted, false);
  assert.equal(judge(find("clean-past"), "Отлично! А потом?").observed.noted, false);
});

test("the partner asks once whether the learner is a man or a woman, and the app remembers the answer", async () => {
  const unknown = chatPrompt("English", "Русский", { name: "Iain", ask: true });
  assert.match(unknown, /You do not yet know whether the learner is a man or a woman/);
  assert.match(unknown, /Ask once now/);
  assert.match(unknown, /Their name is Iain\. If that name makes the answer clear, do not ask openly/);
  assert.match(unknown, /<speaker>male<\/speaker> or <speaker>female<\/speaker>/);
  assert.doesNotMatch(chatPrompt("English", "Русский", { ask: true }), /Their name is/);
  const known = chatPrompt("English", "Русский", { speaker: "female" });
  assert.match(known, /THE LEARNER is a woman/);
  assert.doesNotMatch(known, /Ask once now|<speaker>/);

  const reply = splitCorrections("Отлично! Тогда буду обращаться к тебе в мужском роде.\n<meant>Yes, I'm a man.</meant>\n<speaker>male</speaker>");
  assert.equal(reply.speaker, "male");
  assert.doesNotMatch(reply.text, /speaker|male/);
  assert.equal(splitCorrections("Привет!").speaker, undefined);
  assert.equal(splitCorrections("Привет! <speaker>unsure</speaker>").text, "Привет! unsure");

  // The name and the known answer both reach the model's instruction.
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const messages = [{ id: "m", role: "user", text: "привет", final: true, createdAt: "2026-11-19T10:00:00.000Z" }];
  let body: any;
  const answer = (request: unknown, text: string) =>
    executeLlm(llmRequestSchema.parse(request) as any, { openai: "test-secret" }, async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text }] }] });
    });
  const first: any = await answer({ action: "generate", settings, messages, learnerName: "Iain" }, "Привет!\n<speaker>male</speaker>");
  assert.match(body.instructions, /Their name is Iain/);
  assert.deepEqual(first, { text: "Привет!", speaker: "male" });
  await answer({ action: "generate", settings: { ...settings, speaker: "male" }, messages }, "Привет!");
  assert.match(body.instructions, /THE LEARNER is a man/);
  assert.match(scriptPrompt("English", "Русский", [], "male"), /THE SPEAKER is a man/);
  assert.match(scriptPrompt("English", "Русский"), /You do not know whether the learner is a man or a woman/);
});

test("asking how to say something gets the natural version first, and the close one beside it", async () => {
  assert.deepEqual(naturalAndLiteral("побыть рядом с мамой или папой\nLITERAL: момент близости с родителем"), {
    text: "побыть рядом с мамой или папой", literal: "момент близости с родителем",
  });
  assert.deepEqual(naturalAndLiteral(" Спасибо "), { text: "Спасибо" });
  assert.deepEqual(naturalAndLiteral("Спасибо\nLITERAL: спасибо"), { text: "Спасибо" });
  assert.match(translatePrompt("English", "Русский", "a man"), /Do not translate the English wording; translate the meaning/);
  assert.match(translatePrompt("English", "Русский", "a man"), /The speaker is a man/);
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  let body: any;
  const answer = (request: unknown, text: string) =>
    executeLlm(llmRequestSchema.parse(request) as any, { openai: "test-secret" }, async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text }] }] });
    });
  const asked = { action: "translate", settings, text: "a moment of closeness with a parent", source: "en-US", target: "ru-RU", context: [] };
  assert.deepEqual(await answer({ ...asked, natural: true }, "побыть рядом с родителями\nLITERAL: момент близости с родителем"), {
    text: "побыть рядом с родителями", literal: "момент близости с родителем",
  });
  assert.match(body.instructions, /what a native speaker of Русский would actually say/);
  // Every other translation in the app is unchanged.
  assert.deepEqual(await answer(asked, "момент близости с родителем"), { text: "момент близости с родителем" });
  assert.match(body.instructions, /^Translate the supplied text from English into Русский/);
});

test("a saved phrase is reviewed, and a better one waits on its card until accepted or dismissed", async () => {
  assert.deepEqual(reviewVerdict("OK", "спасибо"), {});
  assert.deepEqual(reviewVerdict("BETTER: побыть рядом с родителями | REASON: The original sounds like a textbook.", "момент близости с родителем"), {
    suggestion: { phrase: "побыть рядом с родителями", reason: "The original sounds like a textbook." },
  });
  // The same phrase back, or a reply in no known form, is not a suggestion.
  assert.deepEqual(reviewVerdict("BETTER: Спасибо! | REASON: none", "спасибо"), {});
  assert.deepEqual(reviewVerdict("It looks fine to me.", "спасибо"), {});
  assert.match(reviewPrompt("English", "Русский"), /If it is fine, reply with exactly: OK/);
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  let body: any;
  const result = await executeLlm(
    llmRequestSchema.parse({ action: "review", settings, phrase: "момент близости с родителем", meaning: "a moment of closeness with a parent", example: "Ей нравится момент близости с родителем." }) as any,
    { openai: "test-secret" },
    async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text: "BETTER: побыть рядом с родителями | REASON: Stiff." }] }] });
    },
  );
  assert.deepEqual(result, { suggestion: { phrase: "побыть рядом с родителями", reason: "Stiff." } });
  assert.match(JSON.stringify(body.input), /Ей нравится момент близости/);

  // The suggestion is stored with the entry, and clearing it removes the field in the account.
  const { entry } = saveEntry([], { phrase: "момент близости с родителем", meaning: "a moment of closeness with a parent", native: "en-US", target: "ru-RU" });
  const suggested = entrySchema.parse({ ...entry, suggestion: { phrase: "побыть рядом с родителями", reason: "Stiff." } });
  const write = (value: typeof entry): any => commitWrites("projects/p/databases/(default)", "uid1", [{ id: value.id, entry: value }])[0];
  assert.ok(write(suggested).update.fields.suggestion);
  assert.ok(write(suggested).updateMask.fieldPaths.includes("suggestion"));
  assert.equal(write(entry).update.fields.suggestion, undefined);
  assert.ok(write(entry).updateMask.fieldPaths.includes("suggestion"));
  const rules = (await import("node:fs")).readFileSync("firestore.rules", "utf8");
  assert.match(rules, /'conversationIds', 'example', 'suggestion', 'reviewed'\]\)/);
});

test("the script writer fits saved phrases to the sentence instead of pasting them in", () => {
  const prompt = scriptPrompt("English", "Русский", [], "male");
  assert.match(prompt, /Fit each one to the sentence, never the sentence to it/);
  assert.match(prompt, /"потому что она такая она очень дружелюбная" is the result of doing that, and is wrong/);
  assert.match(prompt, /An entry may be a single word or a whole phrase/);
});

test("phrases saved before reviews existed can be checked once each, oldest first", async () => {
  let entries = saveEntry([], { phrase: "спасибо", meaning: "thank you", native: "en-US", target: "ru-RU" }, new Date("2026-01-01T00:00:00Z")).entries;
  entries = saveEntry(entries, { phrase: "момент близости", meaning: "a moment of closeness", native: "en-US", target: "ru-RU" }, new Date("2026-02-01T00:00:00Z")).entries;
  assert.deepEqual(unreviewed(entries).map((entry) => entry.phrase), ["спасибо", "момент близости"]);
  const [older, newer] = unreviewed(entries);
  entries = markReviewed(entries, older.id);
  entries = markReviewed(entries, newer.id, { phrase: "побыть рядом", reason: "Stiff." });
  assert.deepEqual(unreviewed(entries), []);
  assert.equal(entries.find((entry) => entry.id === older.id)!.suggestion, undefined);
  assert.equal(entries.find((entry) => entry.id === newer.id)!.suggestion!.phrase, "побыть рядом");
  // Accepting or dismissing a suggestion later does not put the phrase back in the queue.
  const { suggestion, ...settled } = entries.find((entry) => entry.id === newer.id)!;
  assert.deepEqual(unreviewed([settled]), []);
  assert.match((await import("node:fs")).readFileSync("firestore.rules", "utf8"), /'reviewed' in d\) \|\| d.reviewed is bool/);
});

test("the question about the learner's forms is asked once, then never again", async () => {
  const { chatInstruction } = await import("../server/llm");
  const settings = { native: "en-US", target: "ru-RU", provider: "openai", model: "gpt-5.4-mini", mode: "api", autoSpeak: false } as const;
  const instruction = (extra: object) => chatInstruction({ action: "generate", settings, messages: [], ...extra } as any);
  assert.match(instruction({ askSpeaker: true }), /Ask once now/);
  // An app from before the change sends nothing, and behaves as it did.
  assert.match(instruction({}), /Ask once now/);
  const told = instruction({ askSpeaker: false });
  assert.doesNotMatch(told, /Ask once now/);
  assert.match(told, /They have been asked before, so do not ask/);
  assert.match(told, /<speaker>male<\/speaker>/);
  const known = chatInstruction({ action: "generate", settings: { ...settings, speaker: "male" }, messages: [], askSpeaker: true } as any);
  assert.match(known, /THE LEARNER is a man/);
  assert.doesNotMatch(known, /Ask once now/);
});

test("hints from the learner's words are taken out of the reply and kept apart", async () => {
  const reply = splitCorrections("А что ей больше всего нравится делать вместе?\nWhat does she like doing together most?\n<hints>\n- гулять вместе — to go for a walk together\n2. читать книги — to read books\n</hints>\n<meant>She is quite independent.</meant>");
  assert.equal(reply.text, "А что ей больше всего нравится делать вместе?\nWhat does she like doing together most?");
  assert.equal(reply.hints, "гулять вместе — to go for a walk together\nчитать книги — to read books");
  assert.equal(reply.meant, "She is quite independent.");
  assert.equal(splitCorrections("Привет!").hints, undefined);
  assert.equal(splitCorrections("Привет! <hints>\n</hints>").hints, undefined);
  const { chatInstruction } = await import("../server/llm");
  const settings = { native: "en-US", target: "ru-RU", provider: "openai", model: "gpt-5.4-mini", mode: "api", autoSpeak: false } as const;
  const told = chatInstruction({ action: "generate", settings, messages: [], lexicon: [{ phrase: "вместе", meaning: "together" }] } as any);
  // The chat prompt is told the words as context and given no rules about them:
  // choosing hints is a request of its own.
  assert.match(told, /For context, these are words and phrases the learner has saved and is trying to learn: \["вместе"\]/);
  assert.doesNotMatch(told, /HINTS|<hints>|THEIR WORDS|SHORT TURNS|TRANSLATION:/);
  const { chosenHints } = await import("../src/core/corrections");
  const theirs = [{ phrase: "вместе", meaning: "together" }, { phrase: "Гулять", meaning: "to go for a walk" }];
  assert.equal(chosenHints('["гулять", "вместе", "площадка"]', theirs), "Гулять — to go for a walk\nвместе — together");
  assert.equal(chosenHints("Here you go: [\"вместе\"]", theirs), "вместе — together");
  assert.equal(chosenHints("[]", theirs), "");
  assert.equal(chosenHints("none of them", theirs), "");
  // A tag the model doubled, as it once did, leaves nothing behind in the message or the hints.
  const doubled = splitCorrections("Что она любит?\n<hints>\n<hints>\nдеятельность — activity\n</hints>\n</hints>");
  assert.equal(doubled.text, "Что она любит?");
  assert.equal(doubled.hints, "деятельность — activity");
  // Only the learner's own words are kept, allowing for a changed ending.
  const { knownHints } = await import("../src/core/corrections");
  const saved = [{ phrase: "деятельность" }, { phrase: "гулять вместе" }];
  assert.equal(knownHints("детская площадка — playground\nдеятельности — activity\nгуляем — we walk", saved), "деятельности — activity\nгуляем — we walk");
  assert.equal(knownHints("детская площадка — playground", saved), "");
  assert.doesNotMatch(chatInstruction({ action: "generate", settings, messages: [] } as any), /saved and is trying to learn/);
});

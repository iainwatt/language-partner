import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { annotateScript, applyWordCases, applyWordStress, paragraphs, replaceParagraph, scriptCases, scriptPieces, scriptSegments, scriptText, turnNotes, withoutStress } from "../src/core/script";
import { annotatePrompt, annotatePrompts, scriptPrompt, scriptPrompts, summaryPrompt, summaryPrompts } from "../server/prompts";
import { judgeOutline, judgeRevision, judgeScript } from "../evals/script.checks";
import { russianScriptCases } from "../evals/script.cases.ru";
import { executeLlm, llmRequestSchema, outlineStep } from "../server/llm";
import { initialSnapshot, providers, savedConversationSchema } from "../src/core/domain";
import { managedModel } from "../src/core/managedAi";
import { defaultReadingSpeed, practicePace, readingSpeeds } from "../src/core/practice";

test("marks in a script become coloured runs, and the spoken text has none", () => {
  const script = "Я рассказываю [s,dat:дочке] сказки [pre:на ночь]. Она [d:постоянно] смеётся [oops:x] [1].";
  assert.deepEqual(scriptSegments(script), [
    { text: "Я рассказываю ", marks: [] },
    { text: "дочке", marks: ["s", "dat"] },
    { text: " сказки ", marks: [] },
    { text: "на ночь", marks: ["pre"] },
    { text: ". Она ", marks: [] },
    { text: "постоянно", marks: ["d"] },
    { text: " смеётся [oops:x] [1].", marks: [] },
  ]);
  assert.equal(scriptText(script), "Я рассказываю дочке сказки на ночь. Она постоянно смеётся [oops:x] [1].");
  assert.deepEqual(scriptSegments("Просто текст."), [{ text: "Просто текст.", marks: [] }]);
});

test("the summary is made in three steps in the learner's language; the script follows it without a length limit", () => {
  const { points, write, check, revise } = summaryPrompt;
  for (const prompt of [points, write, check, revise]) assert.match(prompt("English"), /written in English, the learner's native language/);
  assert.match(points("English"), /YOUR STEP: list what the learner said/);
  assert.match(points("English"), /write it once, in its fullest form/);
  assert.match(points("English"), /Group the statements by theme/);
  // The writer is told the wording is not the learner's, and is given licence to rewrite it.
  assert.match(write("English"), /None of that wording is theirs/);
  assert.match(write("English"), /raw material, not a draft to tidy up/);
  assert.match(write("English"), /You are a skilled writer/);
  assert.match(write("English"), /one sentence at a time is a failure/);
  assert.match(write("English"), /THE ONE LIMIT: Do not bring in facts/);
  assert.match(write("English"), /Never state the same idea twice/);
  assert.match(write("English"), /Work the idea of every saved word into the piece/);
  assert.match(write("English"), /consider opening with a sentence or two/);
  assert.match(write("English"), /short paragraphs with a blank line between them/);
  // The check only looks for omissions, so it cannot flatten the writing.
  assert.match(check("English"), /do not edit it for style/);
  assert.match(check("English"), /return the draft exactly as it stands/);
  assert.match(revise("English"), /do not make the smallest edit/);
  assert.match(revise("English"), /spoken aloud and is informal/);
  assert.match(revise("English"), /Return the whole revised piece/);
  assert.match(summaryPrompt.reviseParagraph!("English"), /Never return the whole piece/);
  const russian = scriptPrompt("English", "Русский", scriptCases["ru-RU"]);
  assert.match(russian, /first-person monologue/);
  assert.match(russian, /Follow the outline for content and order/);
  assert.match(russian, /do not shorten or summarise it/);
  assert.doesNotMatch(russian, /100 to 200 words/);
  assert.match(russian, /CASES: .*genitive, dative, accusative, instrumental, prepositional\./);
  // The nominative is never asked for or given a mark.
  assert.doesNotMatch(russian, /nom for|CASES: [^.]*nominative/i);
  assert.doesNotMatch(scriptPrompt("English", "Español"), /CASES:|genitive/);
});

test("the server runs each step with only the data that step needs", async () => {
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const messages = [{ id: "m", role: "user", text: "я рассказываю её сказки", final: true, createdAt: "2026-11-18T10:00:00.000Z" }];
  const saved = [{ phrase: "сказка", meaning: "fairy tale" }];
  let body: any;
  const answer = (request: unknown, text: string) =>
    executeLlm(llmRequestSchema.parse(request) as any, { openai: "test-secret" }, async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text }] }] });
    });
  const sent = () => JSON.parse(body.input.at(-1).content.at(-1).text ?? body.input.at(-1).content);
  assert.deepEqual(await answer({ action: "outline", step: "points", settings, messages }, " # Evenings\nI tell her fairy tales. "), { text: "# Evenings\nI tell her fairy tales." });
  assert.match(body.instructions, /YOUR STEP: list what the learner said/);
  assert.match(JSON.stringify(body.input), /рассказываю/);
  await answer({ action: "outline", step: "write", settings, points: "# Evenings\nI tell her fairy tales.", saved }, "x");
  assert.match(body.instructions, /YOUR STEP: write the piece/);
  assert.match(JSON.stringify(body.input), /fairy tale/);
  assert.doesNotMatch(JSON.stringify(body.input), /рассказываю/);
  await answer({ action: "outline", step: "check", settings, points: "p", saved, draft: "First draft." }, "x");
  assert.match(body.instructions, /YOUR STEP: verify the draft/);
  assert.match(JSON.stringify(body.input), /First draft/);
  await answer({ action: "outline", step: "revise", settings, draft: "First draft.", feedback: "Mention the cat" }, "x");
  assert.match(JSON.stringify(body.input), /Mention the cat/);
  assert.throws(() => llmRequestSchema.parse({ action: "outline", step: "write", settings }));
  assert.throws(() => llmRequestSchema.parse({ action: "outline", step: "check", settings, points: "p" }));
  assert.throws(() => llmRequestSchema.parse({ action: "outline", step: "points", settings }));
  const script = await answer({
    action: "script", settings, messages, outline: "I tell her fairy tales.",
    saved, dictionary: [{ phrase: "постоянно", meaning: "constantly" }],
  }, "Я рассказываю [dat:ей] [s:сказки].");
  assert.deepEqual(script, { text: "Я рассказываю [dat:ей] [s:сказки]." });
  assert.match(body.instructions, /read aloud and learn by heart/);
  assert.match(JSON.stringify(body.input), /постоянно/);
});

test("a saved conversation can carry its outline and script, and the rules allow exactly its fields", () => {
  const base = { id: "c1", title: "About Skye", description: "", summary: "", native: "en-US", target: "ru-RU", createdAt: "x", updatedAt: "x" };
  assert.equal(savedConversationSchema.parse(base).script, undefined);
  assert.equal(savedConversationSchema.parse({ ...base, outline: "I…", outlineSourceMessageId: "m9", outlinePoints: "# A\nB", script: "Я…" }).outlineSourceMessageId, "m9");
  const rules = readFileSync("firestore.rules", "utf8");
  const fields = rules.match(/function validConversation[\s\S]*?hasOnly\(\[([^\]]+)\]/)![1].replace(/['\s]/g, "").split(",");
  assert.deepEqual(fields.sort(), Object.keys(savedConversationSchema.shape).sort());
});

const daughter = russianScriptCases[0];
const goodOutline = "My daughter is called Skye and she is three. She loves fairy tales, and I tell her stories every evening. She is funny and cheeky, and she runs away from me when I dress her. We also have a cat that keeps climbing the tree in our garden, which always makes me laugh when I see it.";
const goodScript = "Мою [acc:дочку] зовут Скай, [dat:ей] три года. Она очень [s:дерзкая] и постоянно [s:убегает] от [gen:меня], когда я её одеваю. Каждый вечер я рассказываю ей [s:сказки] перед [ins:сном]. Мы много [d:смеёмся] вместе, и я очень люблю эти вечера. Иногда она просит ещё одну историю, и я не могу отказать. Потом она засыпает, а я сижу рядом и думаю о [pre:нашем дне]. Это самое спокойное время. Утром всё начинается снова, и она опять бегает по дому. Я стараюсь не сердиться, потому что она ещё маленькая и ей всё интересно.";

test("the script eval scores each step from the text alone", () => {
  assert.ok(Object.values(judgeOutline(daughter, goodOutline)).every(Boolean), JSON.stringify(judgeOutline(daughter, goodOutline)));
  const twice = goodOutline + " Sometimes you need perseverance when you are tired and bored. Today especially, you need perseverance when you feel tiredness and boredom.";
  assert.equal(judgeOutline(daughter, twice)["outline: no sentence said twice"], false);
  assert.equal(judgeOutline(daughter, goodOutline.replace("cheeky", "naughty"))["outline: saved words' ideas included"], false);
  assert.equal(judgeOutline(daughter, goodOutline.replace(/cat/g, "pet"))["outline: covers what was said"], false);
  assert.equal(judgeOutline(daughter, "Моя дочь Скай любит сказки.")["outline: in the native language"], false);
  const revised = "She is cheeky and runs away when I dress her. My daughter Skye is three and loves fairy tales.";
  assert.deepEqual(judgeRevision(daughter, revised), {
    "revision: in the native language": true, "revision: removed what was asked": true, "revision: reordered as asked": true,
  });
  assert.equal(judgeRevision(daughter, goodOutline)["revision: removed what was asked"], false);
  assert.equal(judgeRevision(daughter, goodOutline)["revision: reordered as asked"], false);

  const verdict = judgeScript(daughter, goodScript);
  assert.ok(Object.values(verdict).every(Boolean), JSON.stringify(verdict));
  assert.equal(judgeScript(daughter, goodScript.replace("[s:убегает]", "убегает"))["script: every saved word used and marked"], false);
  assert.equal(judgeScript(daughter, goodScript.replace("[ins:сном]", "сном"))["script: every case shown"], false);
  assert.equal(judgeScript(daughter, goodScript + " У нас есть кошка.")["script: leaves out what was removed"], false);
  assert.equal(judgeScript(daughter, goodScript.replace("[dat:ей]", "[dat:ей"))["script: marks well formed"], false);
  assert.equal(judgeScript(daughter, "My daughter is called Skye.")["script: in the language being learned"], false);
  for (const item of russianScriptCases) {
    assert.ok(item.turns.some((turn) => turn.role === "user") && item.saved.length && item.scriptCovers.length, item.id);
  }
});

test("the outline is written from the per-turn notes when the chat has them", () => {
  const message = (role: "user" | "assistant", text: string, meant?: string) =>
    ({ id: text, role, text, final: true, createdAt: "2026-11-18T10:00:00.000Z", ...(meant ? { meant } : {}) });
  const chat = [
    message("assistant", "Привет!"),
    message("user", "привет"),
    message("assistant", "О чём поговорим?"),
    message("user", "мою дочь зовут скай"),
    message("assistant", "Красивое имя!", "My daughter is called Skye."),
    message("user", "ей три года"),
    message("assistant", "Чудесный возраст!", "She is three."),
    message("user", "она любит сказки"),
  ];
  // The greeting has no note, so the learner's own words stand in; the unanswered last turn is not included.
  assert.deepEqual(turnNotes(chat), ["привет", "My daughter is called Skye.", "She is three."]);
  assert.equal(turnNotes(chat.map(({ meant, ...rest }: any) => rest)), undefined);
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const withNotes = llmRequestSchema.parse({ action: "outline", step: "points", settings, notes: turnNotes(chat) });
  if (withNotes.action !== "outline") throw new Error("Expected outline request");
  const step = outlineStep(withNotes);
  assert.deepEqual(JSON.parse(step.data), { notes: ["привет", "My daughter is called Skye.", "She is three."] });
  assert.match(step.instruction, /The JSON gives either "notes"/);
});

test("the summary and script use the larger model; mechanical steps, chat and translation keep the fast one", () => {
  assert.equal(managedModel("outline").model, "gpt-5.4");
  assert.equal(managedModel("outline", "write").model, "gpt-5.4");
  assert.equal(managedModel("outline", "check").model, "gpt-5.4");
  assert.equal(managedModel("outline", "check").effort, "medium");
  assert.equal(managedModel("outline", "points").model, "gpt-5.4-mini");
  assert.equal(managedModel("outline", "points").effort, "low");
  assert.equal(managedModel("script").model, "gpt-5.4");
  assert.equal(managedModel("script", "cases").model, "gpt-5.4-mini");
  assert.equal(managedModel("script", "cases").effort, "low");
  assert.equal(managedModel("review").model, "gpt-5.4-mini");
  assert.equal(managedModel("review").effort, "low");
  assert.equal(managedModel("generate").model, "gpt-5.4-mini");
  assert.equal(managedModel("generate").effort, "low");
  assert.equal(managedModel("translate").model, "gpt-5.4-mini");
  assert.equal(managedModel("translate").effort, "none");
  assert.ok(providers.openai.models.includes(managedModel("outline").model));
});

test("meanings and rests use Structured Outputs and map back to aligned arrays", async () => {
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  let body: any;
  const answer = (request: unknown, payload: unknown) =>
    executeLlm(llmRequestSchema.parse(request) as any, { openai: "test-secret" }, async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(payload) }] }] });
    });
  const meanings = (await answer(
    { action: "script", step: "meanings", settings, text: "Мы живём в нашей квартире.", phrases: ["в нашей квартире"] },
    { items: [{ phrase: "в нашей квартире", meaning: "in our flat" }] },
  )) as { text: string };
  assert.equal(body.text.format.name, "script_meanings");
  assert.equal(body.reasoning.effort, "none");
  assert.deepEqual(JSON.parse(meanings.text), ["in our flat"]);

  const rests = (await answer(
    { action: "script", step: "rests", settings, sentences: [{ start: "Мы живём", rest: "в нашей квартире." }] },
    { items: [{ index: 0, meaning: "in our flat." }] },
  )) as { text: string };
  assert.equal(body.text.format.name, "script_rests");
  assert.deepEqual(JSON.parse(rests.text), ["in our flat."]);
});

test("one paragraph of the summary can be changed or removed without touching the rest", () => {
  const whole = "My daughter is Skye.\n\nShe climbs everything.\n\n\nWe have a cat.";
  assert.deepEqual(paragraphs(whole), ["My daughter is Skye.", "She climbs everything.", "We have a cat."]);
  assert.equal(replaceParagraph(whole, 1, "She never sits still."), "My daughter is Skye.\n\nShe never sits still.\n\nWe have a cat.");
  assert.equal(replaceParagraph(whole, 1, "One.\n\nTwo."), "My daughter is Skye.\n\nOne.\n\nTwo.\n\nWe have a cat.");
  assert.equal(replaceParagraph(whole, 2, ""), "My daughter is Skye.\n\nShe climbs everything.");
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const saved = [{ phrase: "стена", meaning: "wall" }];
  const request = llmRequestSchema.parse({ action: "outline", step: "revise", settings, draft: "She climbs everything.", feedback: "Mention the walls", whole, points: "# Skye\nShe climbs walls.", saved });
  if (request.action !== "outline") throw new Error("Expected outline request");
  // One paragraph has its own prompt and is given what the learner originally said.
  const step = outlineStep(request);
  assert.deepEqual(JSON.parse(step.data), { paragraph: "She climbs everything.", feedback: "Mention the walls", whole, points: "# Skye\nShe climbs walls.", saved });
  assert.match(step.instruction, /the learner selected one paragraph/);
  assert.doesNotMatch(step.instruction, /Return the whole revised piece/);
  // A change to the whole piece gets the same source material and the other prompt.
  const all = llmRequestSchema.parse({ action: "outline", step: "revise", settings, draft: whole, feedback: "Make it warmer", points: "p" });
  if (all.action !== "outline") throw new Error("Expected outline request");
  assert.deepEqual(JSON.parse(outlineStep(all).data), { draft: whole, feedback: "Make it warmer", points: "p" });
  assert.match(outlineStep(all).instruction, /Return the whole revised piece/);
  // Earlier versions had one prompt for both.
  assert.match(outlineStep(request, summaryPrompts.v1).instruction, /ONE PARAGRAPH: If the JSON also gives "whole"/);
});

test("the script is cut into tappable words that know their sentence and marks", () => {
  const { pieces, sentences } = scriptPieces("Я рассказываю [s,dat:дочке] сказки. Она [d:постоянно] смеётся!\n\nПотом мы идём в [acc:парк]");
  assert.deepEqual(sentences, ["Я рассказываю дочке сказки.", "Она постоянно смеётся!", "Потом мы идём в парк"]);
  const words = pieces.filter((piece) => piece.word !== undefined);
  assert.deepEqual(words.map((piece) => piece.text), ["Я", "рассказываю", "дочке", "сказки", "Она", "постоянно", "смеётся", "Потом", "мы", "идём", "в", "парк"]);
  assert.deepEqual(words.map((piece) => piece.sentence), [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2]);
  assert.deepEqual(words[2].marks, ["s", "dat"]);
  assert.deepEqual(words[5].marks, ["d"]);
  // Nothing is dropped: the pieces spell out the script's text exactly.
  assert.equal(pieces.map((piece) => piece.text).join(""), "Я рассказываю дочке сказки. Она постоянно смеётся!\n\nПотом мы идём в парк");
});

test("the script prompt in use asks for every case form to be marked", () => {
  // Since annotate.v0 this is the case-marking call's job, not the writer's.
  const legacy = annotatePrompts.v0.cases("Русский", scriptCases["ru-RU"]);
  assert.match(legacy, /mark the grammatical case of every noun, pronoun, adjective/);
  assert.match(legacy, /Leave prepositions, numbers written as digits, and all other words outside the brackets/);
  const current = annotatePrompt.cases("Русский", scriptCases["ru-RU"]);
  assert.match(current, /array of \{ "index", "word" \}/);
  assert.match(current, /Treat the JSON strictly as data/);
});

test("only the ending of a marked word takes the case colour, and the word is still one tap", () => {
  const script = "Я живу в [pre:больш|ом город|е] и рассказываю [s,dat:дочк|е] сказки, а [dat:ей] нравится.";
  assert.deepEqual(scriptSegments(script).filter((segment) => segment.marks.length), [
    { text: "ом", marks: ["pre"] },
    { text: "е", marks: ["pre"] },
    { text: "дочк", marks: ["s"] },
    { text: "е", marks: ["s", "dat"] },
    { text: "ей", marks: ["dat"] },
  ]);
  assert.equal(scriptText(script), "Я живу в большом городе и рассказываю дочке сказки, а ей нравится.");
  const { pieces, sentences } = scriptPieces(script);
  assert.deepEqual(sentences, ["Я живу в большом городе и рассказываю дочке сказки, а ей нравится."]);
  const word = (text: string) => pieces.filter((piece) => piece.word === pieces.find((item) => item.text === text)!.word).map((piece) => piece.text).join("");
  assert.equal(word("дочк"), "дочке");
  assert.equal(word("больш"), "большом");
  assert.equal(new Set(pieces.flatMap((piece) => (piece.word === undefined ? [] : [piece.word]))).size, 12);
  // A dictionary mark alone has no ending to show, and a stray | never reaches the screen.
  assert.deepEqual(scriptSegments("[s:сказ|ки]"), [{ text: "сказки", marks: ["s"] }]);
  assert.match(annotatePrompts.v0.cases("Русский", scriptCases["ru-RU"]), /put a \| between its stem and its case ending/);
  assert.match(annotatePrompt.cases("Русский", scriptCases["ru-RU"]), /"stem" and "ending"/);
});

test("a preposition or number caught inside a case mark stays plain; a pronoun on its own is coloured whole", () => {
  // Taken from a real script: "в 60 метрах" marked as one saved, prepositional phrase.
  assert.deepEqual(scriptSegments("Примерно [s,pre:в 60 метр|ах] от [gen:их] [gen:главн|ого дом|а]").filter((segment) => segment.marks.length), [
    { text: "в 60 метр", marks: ["s"] },
    { text: "ах", marks: ["s", "pre"] },
    { text: "их", marks: ["gen"] },
    { text: "ого", marks: ["gen"] },
    { text: "а", marks: ["gen"] },
  ]);
  assert.equal(scriptText("[s,pre:в 60 метр|ах] от [gen:их] [gen:главн|ого дом|а]"), "в 60 метрах от их главного дома");
  const legacy = annotatePrompts.v0.cases("Русский", scriptCases["ru-RU"]);
  assert.match(legacy, /must spell the word exactly as it is written/);
  assert.match(legacy, /Words in the nominative are not marked/);
  const current = annotatePrompt.cases("Русский", scriptCases["ru-RU"]);
  assert.match(current, /Omit words in the nominative/);
  assert.match(current, /spells "word" verbatim/);
});

test("facts are fixed for the writer and verified against what was actually said", () => {
  const { points, write, check, revise } = summaryPrompt;
  assert.match(points("English"), /Begin the list with a group headed "# People"/);
  assert.match(points("English"), /"my wife's father" must not become "my father"/);
  assert.match(write("English"), /FACTS ARE FIXED/);
  assert.match(write("English"), /You are a skilled writer/);
  assert.match(check("English"), /1\. FACTS\. Go through the draft person by person/);
  assert.match(check("English"), /do not edit it for style/);
  assert.match(revise("English"), /When the feedback corrects a fact/);
  // The check is sent the learner's own words as well as the points drawn from them.
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const request = llmRequestSchema.parse({ action: "outline", step: "check", settings, notes: ["Dan is Rodica's husband."], points: "# People\nDan: Rodica's husband", draft: "Dan is Diana's husband." });
  if (request.action !== "outline") throw new Error("Expected outline request");
  assert.deepEqual(JSON.parse(outlineStep(request).data), {
    notes: ["Dan is Rodica's husband."], points: "# People\nDan: Rodica's husband", saved: [], draft: "Dan is Diana's husband.",
  });
  const house = russianScriptCases.find((item) => item.id === "family-house")!;
  const right = "I want to tell you about Dan and Rodica. Rodica is my wife's sister and Dan is her husband. My wife's father, Ilarion, bought a small house six or seven months ago, about sixty metres from their main house. My wife and I live in one room, so we hoped to live there. Then I saw Dan working in the garden. Nobody told us anything, and later we found out from my mother-in-law that he had given it to them.";
  assert.equal(judgeOutline(house, right)["outline: no wrong facts"], true);
  assert.equal(judgeOutline(house, right)["outline: covers what was said"], true);
  assert.equal(judgeOutline(house, right.replace("My wife's father, Ilarion, bought", "My father bought"))["outline: no wrong facts"], false);
});

const A = "\u0301";
test("case endings and stress are laid over the written script without changing a letter", () => {
  const written = "Я живу в большом городе.\n\nЯ рассказываю [s:дочке] сказки, а [d:потом] иду домой.";
  const cases = "Я живу в [pre:больш|ом город|е].\n\nЯ рассказываю [dat:дочк|е] [acc:сказк|и], а потом иду домой.";
  const stress = `Я живу${A} в большо${A}м го${A}роде.\n\nЯ расска${A}зываю до${A}чке ска${A}зки, а пото${A}м иду${A} домо${A}й.`;
  const { script, applied } = annotateScript(written, { cases, stress });
  assert.deepEqual(applied, { cases: 1, stress: 1 });
  // The words are untouched; only marks were added.
  assert.equal(scriptText(script), scriptText(written));
  assert.equal(script, `Я живу${A} в больш[pre:о${A}м] го${A}род[pre:е].\n\nЯ расска${A}зываю [s:до${A}чк][s,dat:е] ска${A}зк[acc:и], а [d:пото${A}м] иду${A} домо${A}й.`);
  const { pieces } = scriptPieces(script);
  const word = (start: string) => pieces.filter((piece) => piece.word === pieces.find((item) => withoutStress(item.text).startsWith(start))!.word);
  assert.equal(withoutStress(word("дочк").map((piece) => piece.text).join("")), "дочке");
  assert.deepEqual(word("дочк").map((piece) => piece.marks), [["s"], ["s", "dat"]]);
  assert.equal(word("больш").map((piece) => piece.text).join(""), `большо${A}м`);
});

test("a layer that changed the text is dropped, for that paragraph only", () => {
  const written = "Мой отец дома.\n\nЯ иду в парк.";
  // The first paragraph came back misspelt ("отцец"); the second is intact.
  const cases = "Мой отц|ец дома.\n\nЯ иду в [acc:парк].";
  const { script, applied } = annotateScript(written, { cases, stress: "Совсем другой текст." });
  assert.equal(applied.cases, 0.5);
  assert.equal(applied.stress, 0);
  assert.equal(script, "Мой отец дома.\n\nЯ иду в [acc:парк].");
  assert.equal(annotateScript(written, {}).script, written);
});

test("the writer no longer marks cases; separate prompts mark cases and stress on indexed words", async () => {
  const writer = scriptPrompt("English", "Русский", scriptCases["ru-RU"]);
  assert.match(writer, /Do not mark cases or stress; that is done afterwards/);
  assert.doesNotMatch(writer, /\|/);
  assert.match(scriptPrompts.v5("English", "Русский", scriptCases["ru-RU"]), /put a \| between the stem/);
  assert.match(annotatePrompts.v0.cases("Русский", scriptCases["ru-RU"]), /Return exactly the same text with marks added/);
  assert.match(annotatePrompts.v0.cases("Русский", scriptCases["ru-RU"]), /gen for genitive, dat for dative/);
  assert.match(annotatePrompts.v0.stress("Русский"), /combining acute accent \(the character U\+0301\) immediately after the stressed vowel/);
  assert.match(annotatePrompt.cases("Русский", scriptCases["ru-RU"]), /gen for genitive, dat for dative/);
  assert.match(annotatePrompt.stress("Русский"), /combining acute accent \(U\+0301\)/);

  // Indexed word annotation never alters original characters even on imperfect splits or invalid indices.
  const plain = "Я иду в большом городе, и ей хорошо.";
  const marked = applyWordCases(plain, [
    { index: 3, mark: "pre", stem: "больш", ending: "ом" },
    { index: 4, mark: "pre", stem: "typo", ending: "е" },
    { index: 6, mark: "dat", stem: "", ending: "ей" },
    { index: 99, mark: "gen", stem: "x", ending: "y" },
  ]);
  assert.equal(scriptText(marked), plain);
  assert.equal(marked, "Я иду в [pre:больш|ом] [pre:город|е], и [dat:ей] хорошо.");

  const stressed = applyWordStress("Я иду домой.", [
    { index: 1, stressed: `иду${A}` },
    { index: 2, stressed: "другое" },
  ]);
  assert.equal(withoutStress(stressed), "Я иду домой.");
  assert.equal(stressed, `Я иду${A} домой.`);

  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  let body: any;
  const answer = (request: unknown, payload: unknown) =>
    executeLlm(llmRequestSchema.parse(request) as any, { openai: "test-secret" }, async (_url, options) => {
      body = JSON.parse(String(options?.body));
      return Response.json({ output: [{ content: [{ type: "output_text", text: JSON.stringify(payload) }] }] });
    });
  assert.deepEqual(
    await answer({ action: "script", step: "stress", settings, text: "Я иду домой." }, { items: [{ index: 1, stressed: `иду${A}` }, { index: 2, stressed: `домо${A}й` }] }),
    { text: `Я иду${A} домо${A}й.` },
  );
  assert.equal(body.text.format.name, "script_stress");
  assert.match(body.instructions, /where the stress falls/);
  assert.match(JSON.stringify(body.input), /Я иду домой\./);
  assert.doesNotMatch(JSON.stringify(body.input), /outline/);
  const caseResult = await answer(
    { action: "script", step: "cases", settings, text: "Я иду домой." },
    { items: [] },
  );
  assert.deepEqual(caseResult, { text: "Я иду домой." });
  assert.equal(body.text.format.name, "script_cases");
  assert.match(body.instructions, /grammatical case/);
  assert.throws(() => llmRequestSchema.parse({ action: "script", step: "cases", settings }));
  assert.throws(() => llmRequestSchema.parse({ action: "script", settings }));
});

test("practice mode scrolls a script past the reading line at the chosen words a minute", () => {
  // 160 words at 80 a minute take two minutes, so 2,400 points of text move at 20 a second.
  assert.equal(practicePace(160, 2400, 80), 20);
  assert.equal(practicePace(160, 2400, 160), 40);
  assert.equal(practicePace(0, 2400, 80), 0);
  assert.equal(practicePace(160, 0, 80), 0);
  assert.ok(readingSpeeds.includes(defaultReadingSpeed));
  assert.deepEqual([...readingSpeeds].sort((a, b) => a - b), readingSpeeds);
});

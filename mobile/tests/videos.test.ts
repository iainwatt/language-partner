import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { clock, lineAt, linesFromRows, parseTime, videoSchema, youtubeId } from "../src/core/videos";
import { readXlsx } from "../scripts/xlsx";

test("times in a subtitle export are read in every form it uses", () => {
  assert.equal(parseTime("0s"), 0);
  assert.equal(parseTime("59s"), 59);
  assert.equal(parseTime("1:04"), 64);
  assert.equal(parseTime("1:02:03"), 3723);
  assert.equal(parseTime("00:01:07.500"), 67.5);
  assert.equal(parseTime(12), 12);
  // A spreadsheet time is a fraction of a day.
  assert.equal(parseTime(64 / 86400), 64);
  assert.equal(parseTime("Time"), undefined);
  assert.equal(clock(64), "1:04");
});

test("export rows become timed lines, and the line being spoken can be found", () => {
  const lines = linesFromRows([
    ["Голландец пытается говорить по русски"],
    ["Time", "Subtitle", "Machine Translation"],
    ["0s", "Привет всем, меня зовут Ари.", "Hello everyone, my name is Ari."],
    ["7s", "Я из Голландии.", "I'm from Holland."],
    ["1:04", "И, конечно, потому что я тогда ничего не знал."],
    [undefined, "no time"],
    ["11s", "  "],
  ]);
  assert.deepEqual(lines, [
    { start: 0, text: "Привет всем, меня зовут Ари.", translation: "Hello everyone, my name is Ari." },
    { start: 7, text: "Я из Голландии.", translation: "I'm from Holland." },
    { start: 64, text: "И, конечно, потому что я тогда ничего не знал." },
  ]);
  assert.deepEqual([0, 6.9, 7, 30, 64, 500].map((seconds) => lineAt(lines, seconds)), [0, 0, 1, 1, 2, 2]);
  assert.equal(videoSchema.parse({ id: "abc123XYZ_-", youtubeId: "abc123XYZ_-", title: "Ари", language: "ru-RU", lines, createdAt: "2026-11-19T00:00:00.000Z" }).lines.length, 3);
});

test("a YouTube video ID is found in the usual link shapes", () => {
  for (const link of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s", "https://youtu.be/dQw4w9WgXcQ?si=x",
    "https://www.youtube.com/embed/dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ",
  ]) assert.equal(youtubeId(link), "dQw4w9WgXcQ", link);
  assert.equal(youtubeId("https://example.com/video"), undefined);
});

// A minimal .xlsx: a zip holding the shared strings and one sheet.
function zip(files: Record<string, string>) {
  const parts: Buffer[] = [], directory: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const raw = Buffer.from(text, "utf8"), packed = deflateRawSync(raw), file = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(file.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(file.length, 28); central.writeUInt32LE(offset, 42);
    parts.push(local, file, packed);
    directory.push(central, file);
    offset += 30 + file.length + packed.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(Buffer.concat(directory).length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}

test("the first sheet of an .xlsx export is read: shared strings, inline text, numbers and gaps", () => {
  const file = zip({
    "xl/sharedStrings.xml": `<sst><si><t>Time</t></si><si><t>Subtitle</t></si><si><t>0s</t></si><si><r><t>Привет </t></r><r><t xml:space="preserve">всем &amp; вам</t></r></si><si><t>1:04</t></si></sst>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData>
      <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>
      <row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c><c r="C2" t="inlineStr"><is><t>Hello all</t></is></c></row>
      <row r="3"><c r="A3" t="s"><v>4</v></c><c r="C3"><v>42</v></c></row>
    </sheetData></worksheet>`,
  });
  assert.deepEqual(readXlsx(file), [
    ["Time", "Subtitle"],
    ["0s", "Привет всем & вам", "Hello all"],
    ["1:04", undefined, 42],
  ]);
  assert.deepEqual(linesFromRows(readXlsx(file)), [{ start: 0, text: "Привет всем & вам", translation: "Hello all" }]);
  assert.throws(() => readXlsx(Buffer.from("not a spreadsheet")), /not an \.xlsx/);
});

test("signed-in learners can read the video library and nobody can write to it from the app", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  assert.match(rules, /match \/videos\/\{language\}\/items\/\{videoId\} \{\s+allow read: if request\.auth != null[^}]*?allow create, update: if false;[^}]*?allow delete: if request\.auth != null\s+&& exists\(\/databases\/\$\(database\)\/documents\/admins\/\$\(request\.auth\.uid\)\);/);
  assert.match(rules, /match \/admins\/\{uid\} \{[^}]*?allow list, write: if false;/);
});

test("saved phrases are marked as whole words, longest first", async () => {
  const { savedRanges } = await import("../src/core/videos");
  const text = "Я не понимаю русских девушек, не понимаю.";
  assert.deepEqual(savedRanges(text, ["не понимаю", "понимаю", "рус"]), [
    { start: 2, end: 12 },
    { start: 30, end: 40 },
  ]);
  assert.deepEqual(savedRanges("Привет", []), []);
});

test("a transcript becomes a script in short paragraphs, free of script marks", async () => {
  const { transcriptScript, thumbnail } = await import("../src/core/videos");
  const lines = ["[музыка] Привет,", "меня зовут Ари.", "Я из Голландии.", "А вы", "откуда?"].map((text, index) => ({ start: index, text }));
  assert.equal(transcriptScript(lines), "(музыка) Привет, меня зовут Ари. Я из Голландии.\n\nА вы откуда?");
  assert.equal(thumbnail("pyqW-FJwKDE"), "https://i.ytimg.com/vi/pyqW-FJwKDE/mqdefault.jpg");
});

test("a transcript marks saved phrases, and unpunctuated subtitles keep their lines", async () => {
  const { transcriptScript } = await import("../src/core/videos");
  const lines = (texts: string[]) => texts.map((text, index) => ({ start: index, text }));
  assert.equal(transcriptScript(lines(["Я не понимаю русских девушек."]), ["не понимаю"]), "Я [d:не понимаю] русских девушек.");
  assert.equal(transcriptScript(lines(["привет всем", "меня зовут ари", "я из голландии"])), "привет всем\nменя зовут ари\nя из голландии");
});

test("a video has one discussion, whose lexicon is the words saved from it", async () => {
  const { linkVideoEntries, makeVideoConversation, videoContext, videoContextId, videoPractice } = await import("../src/core/videos");
  const { saveEntry } = await import("../src/core/domain");
  const { chatInstruction } = await import("../server/llm");
  const video = videoSchema.parse({
    id: "pyqW-FJwKDE", youtubeId: "pyqW-FJwKDE", title: "Голландец импровизирует", language: "ru-RU", createdAt: "2026-11-19T00:00:00.000Z",
    lines: [{ start: 0, text: "Я не понимаю русских девушек." }, { start: 4, text: "Это очень  сложно." }],
  });
  const word = (phrase: string, example: string) => ({ phrase, meaning: "meaning", native: "en-US", target: "ru-RU", example: { text: example, translation: "translation" } });
  let entries = saveEntry([], word("не понимаю", "Я не понимаю русских девушек.")).entries;
  entries = saveEntry(entries, word("сложно", "очень сложно")).entries;
  entries = saveEntry(entries, word("кошка", "У меня есть кошка.")).entries;

  const linked = linkVideoEntries(entries, video);
  assert.equal(linked.linked, 2);
  assert.equal(linkVideoEntries(linked.entries, video).linked, 0);

  const conversation = makeVideoConversation(video, "en-US");
  assert.equal(conversation.id, videoContextId(video.youtubeId));
  assert.equal(videoContext(video, "en-US").id, conversation.id);
  const practice = videoPractice(conversation, linked.entries)!;
  assert.deepEqual(practice.words.map((item) => item.phrase).sort(), ["не понимаю", "сложно"]);

  const settings = { native: "en-US", target: "ru-RU", provider: "openai", model: "gpt-5.4-mini", mode: "api", autoSpeak: false } as const;
  // Opening the discussion: the prompt as it always was, then plain facts. The
  // video is described in a few sentences, never by its transcript.
  const opening = chatInstruction({ action: "generate", settings: { ...settings, level: { "ru-RU": "lower intermediate" } }, messages: [], video: { ...practice, summary: "A Dutch comedian improvises in Russian.", transcript: "СЕКРЕТ" } } as any);
  assert.match(opening, /The learner's level in .+ is lower intermediate\./);
  // A video can have a hundred saved words, so its discussion is not given the list.
  assert.doesNotMatch(opening, /saved and is trying to learn/);
  assert.match(opening, /The learner has just watched a video in .+ called "Голландец импровизирует"\. What it is about: "A Dutch comedian improvises in Russian\."\. Start the conversation with one short question about it\./);
  assert.doesNotMatch(opening, /СЕКРЕТ|SHORT TURNS|TRANSLATION:|HINTS|THEIR WORDS/);
  // Once the partner has spoken, the video is not mentioned again: it is an ordinary chat.
  const later = chatInstruction({ action: "generate", settings, messages: [{ id: "a", role: "assistant", text: "Тебе понравилось?", final: true, createdAt: "" }], video: practice } as any);
  assert.doesNotMatch(later, /has just watched a video/);
  // An ordinary chat is told the same two facts and nothing more.
  const plain = chatInstruction({ action: "generate", settings, messages: [], lexicon: [{ phrase: "не понимаю", meaning: "I don't understand" }] } as any);
  assert.ok(plain.includes("не понимаю"));
  assert.doesNotMatch(plain, /level in|has just watched/);
});

test("caption tracks are read in both of the shapes YouTube sends", async () => {
  const { captionLines, withTranslations } = await import("../src/core/videos");
  const json = JSON.stringify({ events: [
    { tStartMs: 0, dDurationMs: 900 },
    { tStartMs: 1200, segs: [{ utf8: "Привет," }, { utf8: " меня зовут" }, { utf8: " Ари" }] },
    { tStartMs: 3000, aAppend: 1, segs: [{ utf8: "\n" }] },
    { tStartMs: 4500, segs: [{ utf8: "Я из\nГолландии" }] },
  ] });
  assert.deepEqual(captionLines(json), [{ start: 1.2, text: "Привет, меня зовут Ари" }, { start: 4.5, text: "Я из Голландии" }]);
  const xml = `<?xml version="1.0"?><transcript><text start="1.2" dur="2">Tom &amp;amp; Ари &amp;#39;ok&amp;#39;</text><text start="4.5" dur="1">Я <b>из</b> Голландии</text></transcript>`;
  assert.deepEqual(captionLines(xml), [{ start: 1.2, text: "Tom & Ари 'ok'" }, { start: 4.5, text: "Я из Голландии" }]);
  assert.deepEqual(captionLines(`<timedtext><body><p t="1200" d="900">Привет</p></body></timedtext>`), [{ start: 1.2, text: "Привет" }]);
  assert.deepEqual(captionLines("not captions"), []);
  assert.deepEqual(
    withTranslations(captionLines(json), [{ start: 1.2, text: "Hi, my name is Ari" }]),
    [{ start: 1.2, text: "Привет, меня зовут Ари", translation: "Hi, my name is Ari" }, { start: 4.5, text: "Я из Голландии" }],
  );
});

test("a YouTube search asks for embeddable videos in the language, and reads lengths", async () => {
  const { detailsUrl, isoSeconds, searchKey, searchResults, searchUrl, searchYouTube } = await import("../server/videoSearch");
  const search = { query: "русский  Стендап", language: "ru-RU", length: "medium" as const, subtitled: true };
  const url = new URL(searchUrl(search, "KEY"));
  assert.deepEqual(
    ["type", "relevanceLanguage", "videoEmbeddable", "videoDuration", "videoCaption", "q"].map((name) => url.searchParams.get(name)),
    ["video", "ru", "true", "medium", "closedCaption", "русский  Стендап"],
  );
  assert.equal(new URL(searchUrl({ ...search, length: "any", subtitled: false }, "KEY")).searchParams.has("videoDuration"), false);
  assert.equal(searchKey(search), searchKey({ ...search, query: "РУССКИЙ стендап" }));
  assert.notEqual(searchKey(search), searchKey({ ...search, subtitled: false }));
  assert.deepEqual(["PT5M3S", "PT1H2M3S", "PT45S", "P0D", "live"].map(isoSeconds), [303, 3723, 45, 0, 0]);

  const details = { items: [
    { id: "bbbbbbbbbbb", snippet: { title: "Second &amp; last", channelTitle: "Chan", liveBroadcastContent: "none" }, contentDetails: { duration: "PT4M" } },
    { id: "aaaaaaaaaaa", snippet: { title: "First", channelTitle: "Chan", liveBroadcastContent: "none" }, contentDetails: { duration: "PT5M3S" } },
    { id: "ccccccccccc", snippet: { title: "Live now", channelTitle: "Chan", liveBroadcastContent: "live" }, contentDetails: { duration: "P0D" } },
  ] };
  assert.deepEqual(searchResults(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"], details), [
    { youtubeId: "aaaaaaaaaaa", title: "First", channel: "Chan", seconds: 303 },
    { youtubeId: "bbbbbbbbbbb", title: "Second & last", channel: "Chan", seconds: 240 },
  ]);
  const asked: string[] = [];
  const transport = (async (address: string) => {
    asked.push(address);
    return { ok: true, json: async () => (address.includes("/search?") ? { items: [{ id: { videoId: "aaaaaaaaaaa" } }] } : details) };
  }) as unknown as typeof fetch;
  assert.equal((await searchYouTube(search, "KEY", transport)).length, 1);
  assert.equal(asked[1], detailsUrl(["aaaaaaaaaaa"], "KEY"));
});

test("a pasted link becomes a saved video, and a day's additions are counted", async () => {
  const { addedToday, linksPerDay, savedFromLink, youtubeId } = await import("../src/core/videos");
  const now = new Date("2026-11-23T10:00:00.000Z");
  const id = youtubeId("https://youtu.be/pyqW-FJwKDE?si=abc")!;
  const video = savedFromLink(id, { title: "  Голландец  ", channel: "Ari" }, "ru-RU", now);
  assert.deepEqual([video.id, video.title, video.channel, video.status, video.lines.length], ["pyqW-FJwKDE", "Голландец", "Ari", "pending", 0]);
  assert.equal(savedFromLink(id, { title: "" }, "ru-RU", now).title, "YouTube video");
  const yesterday = { ...video, id: "aaaaaaaaaaa", youtubeId: "aaaaaaaaaaa", createdAt: "2026-11-22T23:00:00.000Z" };
  assert.equal(addedToday([video, yesterday], now), 1);
  assert.equal(linksPerDay, 10);
});

test("subtitles read from the player become a transcript once the wanted language arrives", async () => {
  const { captionReader } = await import("../src/ui/CaptionFetcher");
  const track = (texts: string[]) => JSON.stringify({ events: texts.map((text, index) => ({ tStartMs: index * 2000, segs: [{ utf8: text }] })) });
  const got: unknown[] = [], other: string[] = [];
  const reader = captionReader("ru-RU", "en-US", (lines) => got.push(lines), (language) => other.push(language));
  reader.receive({ captions: { url: "https://www.youtube.com/api/timedtext?v=x&lang=en&fmt=json3", body: track(["Hello"]) } });
  assert.deepEqual([got.length, other], [0, ["en"]]);
  reader.receive("hd720");
  reader.receive({ captions: { url: "https://www.youtube.com/api/timedtext?v=x&lang=ru&kind=asr&fmt=json3", body: track(["Привет", "Как дела"]) } });
  assert.equal(got.length, 0);
  reader.receive({ captions: { url: "https://www.youtube.com/api/timedtext?v=x&lang=ru&kind=asr&fmt=json3&tlang=en", body: track(["Hi", "How are you"]) } });
  assert.deepEqual(got, [[{ start: 0, text: "Привет", translation: "Hi" }, { start: 2, text: "Как дела", translation: "How are you" }]]);
  reader.stop();
});

test("saved meanings are found in a line's translation, in any of the ways they were put", async () => {
  const { meaningRanges } = await import("../src/core/videos");
  const line = "I don't understand why the flat is so cold.";
  const found = meaningRanges(line, ["to understand", "apartment, flat (home)", "x"]);
  assert.deepEqual(found.map((range) => line.slice(range.start, range.end)), ["understand", "flat"]);
  assert.deepEqual(meaningRanges(line, ["warm"]), []);
});

test("a video's discussion is given prepared questions, each from the sentence a saved word came from", async () => {
  const { asksQuestion, makeVideoConversation, nextQuestion, videoContextId, wordsNeedingQuestions } = await import("../src/core/videos");
  const { saveEntry } = await import("../src/core/domain");
  const { chatInstruction } = await import("../server/llm");
  const video = videoSchema.parse({
    id: "pyqW-FJwKDE", youtubeId: "pyqW-FJwKDE", title: "Sabrina", language: "ru-RU", createdAt: "2026-11-19T00:00:00.000Z",
    lines: [{ start: 0, text: "Её любимая деятельность это детская площадка." }, { start: 4, text: "Она уже одевается сама." }],
  });
  const id = videoContextId(video.youtubeId);
  let entries = saveEntry([], { phrase: "деятельность", meaning: "activity", native: "en-US", target: "ru-RU", conversationId: id, example: { text: "Её любимая деятельность", translation: "Her favourite activity" } }).entries;
  entries = saveEntry(entries, { phrase: "одевается", meaning: "gets dressed", native: "en-US", target: "ru-RU", conversationId: id }).entries;
  entries = saveEntry(entries, { phrase: "кошка", meaning: "cat", native: "en-US", target: "ru-RU" }).entries;
  const chat = makeVideoConversation(video, "en-US");

  // The saved example where there is one, otherwise the line of the transcript; words from elsewhere are left out.
  assert.deepEqual(wordsNeedingQuestions(chat, entries, video).map((item) => [item.phrase, item.sentence]).sort(), [
    ["деятельность", "Её любимая деятельность"],
    ["одевается", "Она уже одевается сама."],
  ]);
  const question = { phrase: "деятельность", meaning: "activity", question: "Какое занятие твоя дочь любит больше всего?" };
  const prepared = { ...chat, questions: [question] };
  assert.deepEqual(wordsNeedingQuestions(prepared, entries, video).map((item) => item.phrase), ["одевается"]);

  const said = (role: "user" | "assistant", text: string) => ({ id: text, role, text, final: true, createdAt: "" });
  // In the order of the video, whatever order the words were saved in; then round again, least asked first.
  const later = { phrase: "одевается", meaning: "gets dressed", question: "Что она уже делает сама?", at: 4 };
  const earlier = { ...question, at: 0 };
  assert.equal(nextQuestion({ ...chat, questions: [later, earlier] })?.phrase, "деятельность");
  assert.equal(nextQuestion({ ...chat, questions: [later, { ...earlier, times: 1 }] })?.phrase, "одевается");
  assert.equal(nextQuestion({ ...chat, questions: [{ ...later, times: 1 }, { ...earlier, times: 1 }] })?.phrase, "деятельность");
  assert.equal(nextQuestion(chat), undefined);
  // The words still to be given a question come in the order of the video too.
  assert.deepEqual(wordsNeedingQuestions(chat, [...entries].reverse(), video).map((item) => [item.phrase, item.at]), [["деятельность", 0], ["одевается", 4]]);

  assert.ok(asksQuestion("Понятно! А какое занятие твоя дочь любит больше всего?", question.question));
  assert.ok(asksQuestion("А какие занятия любит твоя дочка больше всего?", question.question));
  assert.ok(!asksQuestion("Здорово, что она любит площадку. Вы часто туда ходите?", question.question));
  assert.ok(!asksQuestion("Какое занятие твоя дочь любит больше всего.", question.question));

  const settings = { native: "en-US", target: "ru-RU", provider: "openai", model: "gpt-5.4-mini", mode: "api", autoSpeak: false } as const;
  const history = [said("assistant", "Тебе понравилось видео?"), said("user", "Да")];
  const told = chatInstruction({ action: "generate", settings, messages: history, suggestedQuestion: question.question, lexicon: [{ phrase: "деятельность", meaning: "activity" }] } as any);
  assert.match(told, /go with them for a few turns at most and then come back to the questions\. The next question: "Какое занятие/);
  assert.doesNotMatch(told, /asked it before/);
  assert.match(chatInstruction({ action: "generate", settings, messages: history, suggestedQuestion: question.question, suggestedAgain: true } as any), /ask it again in different words/);
  // Asked again, it will be reworded, so a looser likeness counts.
  assert.ok(!asksQuestion("Чем она больше всего любит заниматься?", question.question));
  assert.ok(asksQuestion("Чем она больше всего любит заниматься?", question.question, true));
  // The question stands in for the list of words.
  assert.doesNotMatch(told, /saved and is trying to learn/);
});

test("a video's questions are written from the angle its kind of video calls for", async () => {
  const { executeLlm, llmRequestSchema } = await import("../server/llm");
  const settings = { native: "en-US", target: "ru-RU", provider: "openai", model: "gpt-5.4", mode: "api", autoSpeak: false } as const;
  const sent: any[] = [];
  const transport = (async (_url: string, options: any) => {
    const body = JSON.parse(options.body);
    sent.push(body);
    // The first request is for what the video is about; the second for the questions.
    const text = sent.length === 1
      ? "A couple talk about their daughter turning three. People talking about their own lives."
      : JSON.stringify({ items: [{ phrase: "одевается", question: "Что твой ребёнок уже делает сам?" }] });
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ output_text: text, output: [{ content: [{ type: "output_text", text }] }], usage: {} }), text: async () => "" };
  }) as unknown as typeof fetch;
  const request = llmRequestSchema.parse({
    action: "questions", settings,
    items: [{ phrase: "одевается", meaning: "gets dressed", sentence: "Она уже одевается сама." }],
    video: { youtubeId: "pyqW-FJwKDE", title: "Sabrina Is Turning 3!", transcript: "Она уже одевается сама." },
  });
  const result: any = await executeLlm(request as any, { openai: "test-secret" }, transport);
  assert.deepEqual(result.questions, ["Что твой ребёнок уже делает сам?"]);
  // The account of the video is handed back to be kept, and was given to the question writer.
  assert.match(result.videoSummary, /People talking about their own lives/);
  const asked = JSON.stringify(sent[1]);
  assert.ok(asked.includes("Sabrina Is Turning 3!") && asked.includes("People talking about their own lives"));
  assert.ok(asked.includes("First consider what kind of video this is"));
});

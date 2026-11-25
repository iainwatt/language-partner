import { z } from "zod";
import { documentIdSchema, languages, linkEntry, makeConversation, savedConversationSchema, type Conversation, type Entry, type SavedConversation } from "./domain";

// A video to watch and repeat: a YouTube video and its timed transcript. The
// library is filled by the owner (scripts/add-video.ts); the app only reads it.
const language = z.enum(languages.map((item) => item.code) as [string, ...string[]]);
export const videoLineSchema = z.object({
  // Seconds from the start of the video at which the line begins. A line
  // lasts until the next one starts.
  start: z.number().min(0),
  text: z.string().trim().min(1).max(600),
  translation: z.string().max(600).optional(),
});
export type VideoLine = z.infer<typeof videoLineSchema>;
export const videoSchema = z.object({
  id: documentIdSchema,
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
  title: z.string().trim().min(1).max(200),
  language,
  // Empty for a video the learner saved whose transcript has not arrived, or never will.
  lines: z.array(videoLineSchema).max(2000),
  createdAt: z.string().max(40),
  // For a video the learner found and saved themselves:
  channel: z.string().max(200).optional(),
  seconds: z.number().int().min(0).max(864000).optional(),
  // "pending" while its transcript is being fetched, "none" if there is none to be had.
  status: z.enum(["pending", "ready", "none"]).optional(),
  // Why there is no transcript, in a few words, for whoever looks into it.
  note: z.string().max(200).optional(),
});
export type Video = z.infer<typeof videoSchema>;

// The video ID from any of the usual YouTube link shapes, or a bare ID.
export function youtubeId(link: string): string | undefined {
  const text = link.trim();
  const match = text.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{6,20})/);
  return match?.[1] ?? (/^[A-Za-z0-9_-]{11}$/.test(text) ? text : undefined);
}

// "7s", "1:04", "1:02:03", a number of seconds, or a spreadsheet time (a fraction of a day).
export function parseTime(value: string | number): number | undefined {
  if (typeof value === "number") return value >= 0 ? (value < 1 ? Math.round(value * 86400) : value) : undefined;
  const text = value.trim();
  const seconds = text.match(/^(\d+(?:\.\d+)?)\s*s?$/i);
  if (seconds) return Number(seconds[1]);
  if (!/^\d+(:\d{1,2}){1,2}(\.\d+)?$/.test(text)) return undefined;
  return text.split(":").reduce((total, part) => total * 60 + Number(part), 0);
}

// Rows of a subtitle export (time, subtitle, optional translation) as lines.
// Header rows and rows without a time or text are skipped.
export function linesFromRows(rows: (string | number | undefined)[][]): VideoLine[] {
  const lines: VideoLine[] = [];
  for (const [time, text, translation] of rows) {
    const start = time === undefined ? undefined : parseTime(time);
    if (start === undefined || typeof text !== "string" || !text.trim()) continue;
    const translated = typeof translation === "string" ? translation.trim().slice(0, 600) : "";
    lines.push({ start, text: text.trim().slice(0, 600), ...(translated ? { translation: translated } : {}) });
  }
  return lines.sort((a, b) => a.start - b.start);
}

// The line being spoken at a moment in the video: the last one to have started.
export function lineAt(lines: VideoLine[], seconds: number): number {
  let index = 0;
  while (index + 1 < lines.length && lines[index + 1].start <= seconds) index++;
  return index;
}
export const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

// Where phrases the learner has already saved appear in a line, for marking
// them. Longest phrases win where two overlap; case is ignored.
export function savedRanges(text: string, phrases: string[]): { start: number; end: number }[] {
  const lower = text.toLowerCase();
  const ranges: { start: number; end: number }[] = [];
  for (const phrase of [...new Set(phrases.map((item) => item.trim().toLowerCase()).filter(Boolean))].sort((a, b) => b.length - a.length)) {
    // Lower-casing can change a string's length in a few scripts; skip marking then.
    if (lower.length !== text.length) break;
    for (let at = lower.indexOf(phrase); at >= 0; at = lower.indexOf(phrase, at + phrase.length)) {
      const end = at + phrase.length;
      const letter = /[\p{L}\p{N}]/u;
      const whole = !(at > 0 && letter.test(lower[at - 1])) && !(end < lower.length && letter.test(lower[end]));
      if (whole && !ranges.some((range) => at < range.end && end > range.start)) ranges.push({ start: at, end });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

// YouTube's own still for a video, 320 by 180.
export const thumbnail = (youtubeId: string) => `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;

// The transcript as a script to read aloud: subtitle lines run together into
// short paragraphs, each ending where a sentence does when it can.
// Each subtitle line as script text: tidied, and with the phrases the learner
// has saved marked as dictionary words. Automatic subtitles often have no full
// stops; then `punctuated` is false, and each line counts as a sentence.
const sentenceEnd = /[.!?…]["»”)]*$/;
export function markedLines(lines: VideoLine[], phrases: string[] = []): { texts: string[]; punctuated: boolean } {
  // Square brackets are the script's own marking; a subtitle's "[music]" is made round.
  const plain = lines.map((line) => line.text.replace(/\s+/g, " ").replace(/\[/g, "(").replace(/\]/g, ")").trim());
  const texts = plain.map((text) => {
    let marked = "", from = 0;
    for (const range of savedRanges(text, phrases)) {
      marked += `${text.slice(from, range.start)}[d:${text.slice(range.start, range.end)}]`;
      from = range.end;
    }
    return marked + text.slice(from);
  });
  return { texts, punctuated: plain.filter((text) => sentenceEnd.test(text)).length * 5 >= plain.length };
}
// Phrases the learner has saved are marked as dictionary words where they appear.
export function transcriptScript(lines: VideoLine[], phrases: string[] = []): string {
  const { texts, punctuated } = markedLines(lines, phrases);
  const paragraphs: string[] = [];
  let current: string[] = [];
  const close = () => { if (current.length) paragraphs.push(current.join(punctuated ? " " : "\n")); current = []; };
  for (const text of texts) {
    current.push(text);
    // The mark's closing bracket may follow the full stop's word, never the stop itself.
    if ((current.length >= 3 && sentenceEnd.test(text.replace(/\]$/, ""))) || current.length >= 6) close();
  }
  close();
  return paragraphs.join("\n\n");
}

// A video is treated like a saved conversation: one discussion, with the words
// saved from the video as its lexicon. Both carry this ID.
export const videoContextId = (youtubeId: string) => `video-${youtubeId}`;
export function videoContext(video: Video, native: string, now = new Date()): SavedConversation {
  return savedConversationSchema.parse({
    id: videoContextId(video.youtubeId),
    title: video.title.slice(0, 160),
    description: "A video to watch, repeat and talk about.",
    summary: "",
    summarySourceMessageId: "",
    native,
    target: video.language,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}
export function makeVideoConversation(video: Video, native: string): Conversation {
  return {
    ...makeConversation(native, video.language, false),
    id: videoContextId(video.youtubeId),
    title: video.title,
    video: { youtubeId: video.youtubeId, title: video.title },
  };
}
// Words saved from a video before saving recorded which video: those whose
// example sentence is one of its lines, or part of one. Returned linked.
export function linkVideoEntries(entries: Entry[], video: Video): { entries: Entry[]; linked: number } {
  const id = videoContextId(video.youtubeId);
  const flat = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
  const lines = video.lines.map((line) => flat(line.text));
  let linked = 0;
  const next = entries.map((entry) => {
    const example = entry.example ? flat(entry.example.text) : "";
    if (entry.target !== video.language || entry.conversationIds.includes(id) || example.length < 4) return entry;
    if (!lines.some((line) => line.includes(example))) return entry;
    linked++;
    return linkEntry(entry, id);
  });
  return { entries: linked ? next : entries, linked };
}

// What the partner is told about the video being discussed. The server adds the transcript.
export const videoPracticeSchema = z.object({
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
  title: z.string().max(200),
  words: z.array(z.object({ phrase: z.string().max(300), meaning: z.string().max(300) })).max(60).default([]),
  transcript: z.string().max(12000).optional(),
  // A few sentences on what the video is about, also added by the server.
  summary: z.string().max(1200).optional(),
});
export type VideoPractice = z.infer<typeof videoPracticeSchema>;
export function videoPractice(conversation: Conversation, entries: Entry[]): VideoPractice | undefined {
  if (!conversation.video) return undefined;
  const words = entries
    .filter((entry) => entry.conversationIds.includes(conversation.id) && entry.phrase.length <= 300)
    .slice(0, 60)
    .map((entry) => ({ phrase: entry.phrase, meaning: entry.meaning.slice(0, 300) }));
  return { ...conversation.video, words };
}
// The transcript as the partner reads it, cut to what fits in every turn.
export const transcriptForPartner = (lines: VideoLine[]) =>
  lines.map((line) => line.text.replace(/\s+/g, " ").trim()).join(" ").slice(0, 12000);

// A video found by searching YouTube, before it is saved.
export const searchResultSchema = z.object({
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/),
  title: z.string().max(200),
  channel: z.string().max(200),
  seconds: z.number().int().min(0).max(864000),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
export const searchRequestSchema = z.object({
  query: z.string().trim().min(2).max(100),
  language,
  // Short is under four minutes, medium four to twenty.
  length: z.enum(["short", "medium", "any"]).default("medium"),
  subtitled: z.boolean().default(false),
}).strict();
export type SearchRequest = z.input<typeof searchRequestSchema>;
// A video the learner saved from a search, waiting for its transcript.
export function savedFromSearch(result: SearchResult, language: string, now = new Date()): Video {
  return videoSchema.parse({ ...result, id: result.youtubeId, language, lines: [], status: "pending", createdAt: now.toISOString() });
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) =>
    code[0] === "#" ? String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1))) : (entities[code.toLowerCase()] ?? whole));
// A caption track as YouTube's player receives it, as timed lines. Both of the
// shapes it comes in are read: JSON ("json3") and the older XML.
export function captionLines(body: string): VideoLine[] {
  const lines: VideoLine[] = [];
  const add = (start: number, text: string) => {
    const tidy = text.replace(/\s+/g, " ").trim();
    if (tidy && Number.isFinite(start) && start >= 0) lines.push({ start: Math.round(start * 100) / 100, text: tidy.slice(0, 600) });
  };
  const text = body.trim();
  if (text.startsWith("{")) {
    let parsed: { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] };
    try { parsed = JSON.parse(text); } catch { return []; }
    for (const event of parsed.events ?? [])
      if (typeof event.tStartMs === "number" && event.segs) add(event.tStartMs / 1000, event.segs.map((seg) => seg.utf8 ?? "").join(""));
  } else {
    // <text start="1.2" dur="3">…</text>, or <p t="1200" d="3000">…</p> with times in milliseconds.
    for (const match of text.matchAll(/<(text|p)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const attribute = (name: string) => match[2].match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
      const start = match[1] === "p" ? Number(attribute("t")) / 1000 : Number(attribute("start"));
      add(start, decode(decode(match[3].replace(/<[^>]+>/g, ""))));
    }
  }
  return lines.sort((a, b) => a.start - b.start).slice(0, 2000);
}
// Give each line the translation that starts at the same moment, where there is one.
export function withTranslations(lines: VideoLine[], translated: VideoLine[]): VideoLine[] {
  const byStart = new Map(translated.map((line) => [line.start, line.text]));
  return lines.map((line) => {
    const translation = byStart.get(line.start);
    return translation && translation !== line.text ? { ...line, translation: translation.slice(0, 600) } : line;
  });
}

// How many videos an account may add by link in a day.
export const linksPerDay = 10;
export const addedToday = (videos: Video[], now = new Date()) => {
  const day = now.toISOString().slice(0, 10);
  return videos.filter((video) => video.createdAt.slice(0, 10) === day).length;
};
// A video the learner added by pasting its link. Its subtitles are read the
// first time it is watched.
export function savedFromLink(youtube: string, details: { title: string; channel?: string }, language: string, now = new Date()): Video {
  return videoSchema.parse({
    id: youtube, youtubeId: youtube, language, lines: [], status: "pending", createdAt: now.toISOString(),
    title: details.title.trim().slice(0, 200) || "YouTube video",
    ...(details.channel?.trim() ? { channel: details.channel.trim().slice(0, 200) } : {}),
  });
}

// Where the meanings of the learner's saved words appear in a line's
// translation, for marking them there too. A saved meaning often lists a few
// ways of putting it ("flat, apartment"; "to understand"); each is looked for.
// Only a word-for-word appearance can be found.
export function meaningRanges(translation: string, meanings: string[]): { start: number; end: number }[] {
  const ways = meanings.flatMap((meaning) =>
    meaning
      .replace(/\([^)]*\)/g, " ")
      .split(/[,;/]|\bor\b/i)
      .map((way) => way.trim().replace(/^(to|a|an|the)\s+/i, "").replace(/[.!?]+$/, "").trim())
      .filter((way) => way.length >= 2));
  return savedRanges(translation, ways);
}

export type PreparedQuestion = NonNullable<Conversation["questions"]>[number];
// For the saved words that have no question yet: each with the sentence of
// the video it came from and where in the video that is, earliest first. The
// sentence is the example saved with the word where there is one, and
// otherwise the first line of the transcript that contains it.
export function wordsNeedingQuestions(conversation: Conversation, entries: Entry[], video?: Video) {
  const have = new Set((conversation.questions ?? []).map((item) => item.phrase.toLowerCase()));
  const flat = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
  return entries
    .filter((entry) => entry.conversationIds.includes(conversation.id) && entry.phrase.length <= 300 && !have.has(entry.phrase.toLowerCase()))
    .flatMap((entry) => {
      const example = entry.example?.text.trim() ?? "";
      const line = (example ? video?.lines.find((item) => flat(item.text).includes(flat(example))) : undefined)
        ?? video?.lines.find((item) => savedRanges(item.text, [entry.phrase]).length);
      const sentence = example || line?.text.trim() || "";
      return sentence ? [{ phrase: entry.phrase, meaning: entry.meaning.slice(0, 300), sentence: sentence.slice(0, 600), ...(line ? { at: line.start } : {}) }] : [];
    })
    // Words not found in the transcript go last.
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));
}
// The next prepared question for the partner to ask: the one put least often,
// and among those the earliest in the video. So they are gone through in the
// order of the video, and then again from the start.
export function nextQuestion(conversation: Conversation): PreparedQuestion | undefined {
  return [...(conversation.questions ?? [])].sort((a, b) => (a.times ?? 0) - (b.times ?? 0) || (a.at ?? Infinity) - (b.at ?? Infinity))[0];
}
const stems = (text: string) =>
  (text.toLowerCase().replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => word.length >= 3).map((word) => word.slice(0, 5));
// Whether the partner's reply put the prepared question, in its own words or
// ours: enough of the question's words are in the reply, allowing for changed
// endings. A question being asked again is expected to be reworded, so less is asked of it.
export function asksQuestion(reply: string, question: string, again = false): boolean {
  const wanted = [...new Set(stems(question))];
  if (wanted.length < 2 || !/[?？]/.test(reply)) return false;
  const said = new Set(stems(reply));
  return wanted.filter((word) => said.has(word)).length / wanted.length >= (again ? 0.4 : 0.6);
}

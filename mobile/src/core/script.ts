import type { Message } from "./domain";

// A script is the learner's side of a saved conversation, rewritten as natural
// speech to read aloud. The model marks some words with [labels:text] so the
// app can colour them:
//   s    a word saved during this conversation
//   d    another word from the learner's dictionary
//   gen, dat, acc, ins, pre   an example of a grammatical case
// The nominative is deliberately not marked or asked for; a stray [nom:…] is
// still read, and shown without colour.
// Labels combine with commas: [s,dat:дочке]. Inside a case mark, a | separates a
// word's stem from its ending, [dat:дочк|е], and only the ending takes the case
// colour. A mark with no | at all (a pronoun, say) is coloured whole.
export const scriptCases: Record<string, { mark: string; name: string }[]> = {
  "ru-RU": [
    { mark: "gen", name: "Genitive" },
    { mark: "dat", name: "Dative" },
    { mark: "acc", name: "Accusative" },
    { mark: "ins", name: "Instrumental" },
    { mark: "pre", name: "Prepositional" },
  ],
};
const marks = new Set(["s", "d", "nom", "gen", "dat", "acc", "ins", "pre"]);
export type ScriptSegment = { text: string; marks: string[] };

// Split a script into plain and marked runs. Brackets that are not valid
// marks are left in the text exactly as written.
export function scriptSegments(script: string): ScriptSegment[] {
  const segments: ScriptSegment[] = [];
  let rest = 0;
  for (const match of script.matchAll(/\[([a-z, ]+):([^\[\]\n]+)\]/g)) {
    const labels = match[1].split(",").map((label) => label.trim());
    if (!labels.every((label) => marks.has(label))) continue;
    if (match.index > rest) segments.push({ text: script.slice(rest, match.index), marks: [] });
    segments.push(...endings(match[2].trim(), [...new Set(labels)]));
    rest = match.index + match[0].length;
  }
  if (rest < script.length) segments.push({ text: script.slice(rest), marks: [] });
  return segments;
}
// Split a marked run so that, where the model showed the ending with a |, the
// stem keeps only the dictionary marks and the ending carries the case too.
function endings(text: string, labels: string[]): ScriptSegment[] {
  const other = labels.filter((label) => label === "s" || label === "d");
  if (!text.includes("|") || other.length === labels.length) return [{ text: text.replace(/\|/g, ""), marks: labels }];
  const parts: ScriptSegment[] = [];
  const add = (part: string, marks: string[]) => {
    const last = parts.at(-1);
    if (!part) return;
    if (last && last.marks.join() === marks.join()) last.text += part;
    else parts.push({ text: part, marks });
  };
  for (const run of text.match(/[^\s]+|\s+/g) ?? []) {
    const cut = run.indexOf("|");
    if (/^\s+$/.test(run)) add(run, other);
    // Beside words whose endings are shown, a word without one (a preposition,
    // a number) is not a case form, so it stays plain.
    else if (cut < 0) add(run, other);
    else {
      add(run.slice(0, cut), other);
      add(run.slice(cut + 1).replace(/\|/g, ""), labels);
    }
  }
  return parts;
}
// The words alone, for reading aloud.
export const scriptText = (script: string) =>
  withoutStress(scriptSegments(script).map((segment) => segment.text).join(""));

// Stress is shown with a combining acute accent after the stressed vowel.
const accent = "\u0301";
// Stress marks were tried and dropped; scripts written while they were on still
// contain them, so they are taken out wherever a script is shown or spoken.
export const withoutStress = (text: string) => text.replaceAll(accent, "");

// Losslessly map indexed word-level case/stress annotations onto plain text.
export type WordSpan = { index: number; word: string; start: number; end: number };
export function scriptWordSpans(plain: string): WordSpan[] {
  const spans: WordSpan[] = [];
  for (const match of plain.matchAll(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)) {
    spans.push({ index: spans.length, word: match[0], start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

const caseMarks = new Set(["gen", "dat", "acc", "ins", "pre"]);
export function applyWordCases(
  plain: string,
  items: { index?: unknown; mark?: unknown; stem?: unknown; ending?: unknown }[],
): string {
  const spans = scriptWordSpans(plain);
  const byIndex = new Map<number, { mark: string; stem: string; ending: string }>();
  for (const item of items) {
    if (
      typeof item?.index !== "number" ||
      !Number.isInteger(item.index) ||
      typeof item.mark !== "string" ||
      !caseMarks.has(item.mark) ||
      byIndex.has(item.index)
    )
      continue;
    byIndex.set(item.index, {
      mark: item.mark,
      stem: typeof item.stem === "string" ? item.stem : "",
      ending: typeof item.ending === "string" ? item.ending : "",
    });
  }
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += plain.slice(cursor, span.start);
    const entry = byIndex.get(span.index);
    if (!entry) {
      out += span.word;
    } else if (entry.stem && entry.ending && entry.stem + entry.ending === span.word) {
      out += `[${entry.mark}:${entry.stem}|${entry.ending}]`;
    } else if (entry.ending && entry.ending.length < span.word.length && span.word.endsWith(entry.ending)) {
      out += `[${entry.mark}:${span.word.slice(0, -entry.ending.length)}|${entry.ending}]`;
    } else {
      out += `[${entry.mark}:${span.word}]`;
    }
    cursor = span.end;
  }
  return out + plain.slice(cursor);
}

export function applyWordStress(
  plain: string,
  items: { index?: unknown; stressed?: unknown }[],
): string {
  const spans = scriptWordSpans(plain);
  const byIndex = new Map<number, string>();
  for (const item of items) {
    if (typeof item?.index !== "number" || !Number.isInteger(item.index) || typeof item.stressed !== "string")
      continue;
    if (!byIndex.has(item.index)) byIndex.set(item.index, item.stressed);
  }
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    out += plain.slice(cursor, span.start);
    const stressed = byIndex.get(span.index);
    out += stressed && withoutStress(stressed) === span.word ? stressed : span.word;
    cursor = span.end;
  }
  return out + plain.slice(cursor);
}

// Lay the separately made case and stress markings over the written script.
// Each layer is used only where, with its marks removed, it is exactly the
// script's own text, paragraph by paragraph, so a layer can never change a word.
export function annotateScript(written: string, layers: { cases?: string; stress?: string }) {
  const marks: string[][] = [];
  let plain = "";
  for (const segment of scriptSegments(withoutStress(written)))
    // One entry per UTF-16 unit, so positions line up with string indexes.
    for (let at = 0; at < segment.text.length; at++) {
      plain += segment.text[at];
      marks.push(segment.marks.filter((mark) => mark === "s" || mark === "d"));
    }
  const stressed = new Set<number>();
  const spans = (text: string) => [...text.matchAll(/[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g)].map((match) => ({ start: match.index, text: match[0] }));
  const ours = spans(plain);
  // Copy a layer's per-character findings onto every paragraph it reproduced exactly.
  const lay = (theirPlain: string, each: (from: number, to: number) => void) => {
    const theirs = spans(theirPlain);
    if (theirs.length !== ours.length) return 0;
    let matched = 0;
    theirs.forEach((paragraph, index) => {
      if (paragraph.text.trimEnd() !== ours[index].text.trimEnd()) return;
      matched++;
      for (let offset = 0; offset < ours[index].text.trimEnd().length; offset++) each(paragraph.start + offset, ours[index].start + offset);
    });
    return matched / ours.length;
  };
  const applied = { cases: 0, stress: 0 };
  if (layers.cases) {
    const found: string[][] = [];
    let text = "";
    for (const segment of scriptSegments(withoutStress(layers.cases)))
      for (let at = 0; at < segment.text.length; at++) {
        text += segment.text[at];
        found.push(segment.marks.filter((mark) => mark !== "s" && mark !== "d"));
      }
    applied.cases = lay(text, (from, to) => { if (found[from].length && /\p{L}/u.test(plain[to])) marks[to] = [...marks[to], ...found[from]]; });
  }
  if (layers.stress) {
    const at = new Set<number>();
    let text = "";
    for (let index = 0; index < layers.stress.length; index++)
      layers.stress[index] === accent ? at.add(text.length - 1) : (text += layers.stress[index]);
    applied.stress = lay(text, (from, to) => { if (at.has(from)) stressed.add(to); });
  }
  // Write it back in the script's own notation, one bracket per run of like marks.
  let script = "";
  for (let index = 0; index < plain.length; ) {
    const key = marks[index].join();
    let end = index + 1;
    while (end < plain.length && marks[end].join() === key && plain[end] !== "\n") end++;
    let run = "";
    for (let at = index; at < end; at++) run += plain[at] + (stressed.has(at) ? accent : "");
    // Spaces at the edge of a marked run go outside it, where they cannot be lost.
    const [, before, inner, after] = run.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    script += key && inner ? `${before}[${key}:${inner}]${after}` : run;
    index = end;
  }
  return { script, applied };
}

// One entry per learner turn that the partner answered: the partner's note of
// what was meant, or the learner's own words where it left no note. Chats from
// before the notes existed have few or none, and the conversation is used instead.
export function turnNotes(messages: Pick<Message, "role" | "text" | "meant">[]): string[] | undefined {
  const turns = messages.flatMap((message, index) =>
    message.role === "assistant" && messages[index - 1]?.role === "user"
      ? [{ note: message.meant, said: messages[index - 1].text.trim() }]
      : [],
  );
  if (turns.filter((turn) => turn.note).length < turns.length / 2 || !turns.length) return undefined;
  return turns.flatMap((turn) => (turn.note || turn.said ? [(turn.note || turn.said).slice(0, 2000)] : []));
}

// The summary as the learner sees it: paragraphs they can select one at a time.
export const paragraphs = (text: string) => text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
// Put a rewritten paragraph back, or take the paragraph out when `text` is empty.
export const replaceParagraph = (whole: string, index: number, text: string) =>
  paragraphs(whole).flatMap((part, at) => (at === index ? paragraphs(text) : [part])).join("\n\n");

// The script cut into pieces for tapping: each word knows its marks and which
// sentence it belongs to; the text between words is kept so nothing is lost.
export type ScriptPiece = { text: string; marks: string[]; word?: number; sentence: number };
export function scriptPieces(script: string): { pieces: ScriptPiece[]; sentences: string[] } {
  const pieces: ScriptPiece[] = [];
  const sentences: string[] = [""];
  let word = -1;
  for (const segment of scriptSegments(script))
    for (const match of segment.text.matchAll(/[\p{L}\p{N}\u0301]+(?:[-'’][\p{L}\p{N}\u0301]+)*|[^\p{L}\p{N}\u0301]+/gu)) {
      const isWord = /[\p{L}\p{N}]/u.test(match[0]);
      // A stem and its separately coloured ending are one word to tap.
      if (isWord && !(match.index === 0 && pieces.at(-1)?.word !== undefined)) word++;
      // A sentence ends at . ! ? … or a line break; closing punctuation stays with it.
      const end = isWord ? -1 : match[0].search(/[.!?…]+["»”)]*\s|\n|[.!?…]+["»”)]*$/);
      const cut = end < 0 ? match[0].length : end + (match[0].slice(end).match(/^[.!?…"»”)]*/)?.[0].length ?? 0);
      sentences[sentences.length - 1] += match[0].slice(0, cut);
      pieces.push({ text: match[0], marks: segment.marks, sentence: sentences.length - 1, ...(isWord ? { word } : {}) });
      if (end >= 0) sentences.push(match[0].slice(cut).replace(/^\s+/, ""));
    }
  // A script that ends on a full stop leaves an empty sentence behind.
  if (sentences.length > 1 && !sentences.at(-1)!.trim()) sentences.pop();
  return { pieces, sentences: sentences.map((sentence) => sentence.trim()) };
}

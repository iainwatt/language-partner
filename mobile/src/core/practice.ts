import { withoutStress, type ScriptPiece } from "./script";

// Reading speeds on offer, in words a minute. Reading aloud in a language you
// are learning is far slower than a native speaker's 150 or so.
export const readingSpeeds = [40, 50, 60, 70, 80, 90, 100, 110, 120, 135, 150, 170];
export const defaultReadingSpeed = 80;

// How fast the script must scroll, in points a second, for a text of this many
// words and this height to pass the reading line at the chosen speed.
export function practicePace(words: number, textHeight: number, wordsPerMinute: number) {
  if (words <= 0 || textHeight <= 0 || wordsPerMinute <= 0) return 0;
  return textHeight / ((words / wordsPerMinute) * 60);
}

// How much of the script the prompter shows, from reading to recalling. In
// the order the learner steps down through them, numbered 4 to 1:
// 4 everything; 3 saved words given in the learner's own language; 2 the
// first words of each sentence, with the rest of it in their own language;
// 1 the first words only, with a bar standing in for each word that follows.
export const wordLevels = ["all", "keys", "rest", "openers"] as const;
export type WordLevel = (typeof wordLevels)[number];
export const wordLevelNumber = (level: WordLevel) => wordLevels.length - wordLevels.indexOf(level);
export const wordLevelNames: Record<WordLevel, string> = {
  all: "All words",
  keys: "Key words in English",
  rest: "Openers, rest in English",
  openers: "Openers only",
};
export const openerWords = 3;

// How a saved word or phrase is looked up, whatever its capitals or spacing.
export const meaningKey = (text: string) => withoutStress(text).replace(/\s+/g, " ").trim().toLowerCase();

const isKey = (piece: ScriptPiece) => piece.marks.includes("s") || piece.marks.includes("d");
// The saved words and phrases in a script, each with the sentence it stands in.
// A phrase is a run of marked pieces; unmarked text between two ends the run.
export function keyRuns(pieces: ScriptPiece[], sentences: string[] = []): { start: number; end: number; text: string; sentence: string }[] {
  const runs: { start: number; end: number; text: string; sentence: string }[] = [];
  for (let index = 0; index < pieces.length; index++) {
    if (!isKey(pieces[index])) continue;
    let end = index;
    while (end + 1 < pieces.length && isKey(pieces[end + 1])) end++;
    const text = pieces.slice(index, end + 1).map((piece) => piece.text).join("");
    if (text.trim()) runs.push({ start: index, end, text, sentence: sentences[pieces[index].sentence] ?? "" });
    index = end;
  }
  return runs;
}
// The saved words in a script whose meaning is not yet known.
export function missingMeanings(pieces: ScriptPiece[], sentences: string[], meanings: Record<string, string>) {
  const missing = new Map<string, { text: string; sentence: string }>();
  for (const run of keyRuns(pieces, sentences)) {
    const key = meaningKey(run.text);
    if (!meanings[key] && !missing.has(key)) missing.set(key, { text: withoutStress(run.text).trim(), sentence: run.sentence });
  }
  return [...missing.values()];
}

// `at` is the script piece it begins at, for callers that group pieces by line.
// `aside` marks the rest of a sentence given in the learner's own language.
export type ShownPiece = { text: string; marks: string[]; at: number; key?: boolean; translated?: boolean; aside?: boolean; hidden?: boolean };

// How the rest of a sentence is looked up among the meanings.
export const restKey = (rest: string) => `rest:${meaningKey(rest)}`;
// Each sentence longer than its opening words: where the rest begins and ends
// among the pieces, the opening words, and the rest as text.
export function sentenceRests(pieces: ScriptPiece[]): { from: number; to: number; start: string; rest: string }[] {
  const bySentence = new Map<number, number[]>();
  pieces.forEach((piece, index) => bySentence.set(piece.sentence, [...(bySentence.get(piece.sentence) ?? []), index]));
  const rests: { from: number; to: number; start: string; rest: string }[] = [];
  for (const indexes of bySentence.values()) {
    const words = new Set<number>();
    // The rest begins at the first word after the opening ones.
    const from = indexes.find((index) => {
      const word = pieces[index].word;
      if (word !== undefined) words.add(word);
      return words.size > openerWords;
    });
    if (from === undefined) continue;
    const to = indexes[indexes.length - 1];
    const text = (a: number, b: number) => withoutStress(pieces.slice(a, b).map((piece) => piece.text).join(""));
    const rest = text(from, to + 1).trim();
    if (rest) rests.push({ from, to, start: text(indexes[0], from).trim(), rest });
  }
  return rests.sort((a, b) => a.from - b.from);
}
// The sentence endings not yet put into the learner's language.
export function missingRests(pieces: ScriptPiece[], meanings: Record<string, string>) {
  const missing = new Map<string, { start: string; rest: string }>();
  for (const { start, rest } of sentenceRests(pieces))
    if (!meanings[restKey(rest)] && !missing.has(restKey(rest))) missing.set(restKey(rest), { start, rest });
  return [...missing.values()];
}
// The pieces as the prompter shows them at a level.
export function shownPieces(pieces: ScriptPiece[], level: WordLevel, meanings: Record<string, string> = {}): ShownPiece[] {
  const plain = (piece: ScriptPiece, at: number): ShownPiece => ({ text: piece.text, marks: piece.marks, at, ...(isKey(piece) ? { key: true } : {}) });
  const span = (from: number, to: number) => pieces.slice(from, to).map((piece, index) => plain(piece, from + index));
  if (level === "keys") {
    const shown: ShownPiece[] = [];
    let from = 0;
    for (const found of keyRuns(pieces)) {
      const meaning = meanings[meaningKey(found.text)];
      if (!meaning) continue;
      shown.push(...span(from, found.start));
      // The spaces around the phrase stay where they were.
      const [, before = "", after = ""] = found.text.match(/^(\s*)[\s\S]*?(\s*)$/) ?? [];
      shown.push({ text: before + meaning.trim() + after, marks: [], at: found.start, key: true, translated: true });
      from = found.end + 1;
    }
    return [...shown, ...span(from, pieces.length)];
  }
  if (level === "openers" || level === "rest") {
    const shown: ShownPiece[] = [];
    let from = 0;
    for (const rest of sentenceRests(pieces)) {
      shown.push(...span(from, rest.from));
      const meaning = level === "rest" ? meanings[restKey(rest.rest)] : undefined;
      if (meaning) {
        // The sentence's own closing space or line break is kept after it.
        const after = pieces[rest.to].text.match(/\s*$/)?.[0] ?? "";
        shown.push({ text: meaning.trim() + after, marks: [], at: rest.from, aside: true });
      } else {
        // Each word is hidden in place; spaces and punctuation stay, so the
        // number of words to come and the shape of the sentence can be seen.
        for (let at = rest.from; at <= rest.to; at++)
          shown.push(pieces[at].word === undefined ? plain(pieces[at], at) : { text: pieces[at].text, marks: [], at, hidden: true });
      }
      from = rest.to + 1;
    }
    return [...shown, ...span(from, pieces.length)];
  }
  return span(0, pieces.length);
}

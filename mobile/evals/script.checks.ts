import { scriptCases, scriptSegments, scriptText } from "../src/core/script";

// A conversation run through both steps of the script: outline, optional
// change requested by the learner, then the script itself.
export type ScriptCase = {
  id: string;
  about: string;
  turns: { role: "user" | "assistant"; text: string }[];
  saved: { phrase: string; meaning: string }[];
  dictionary: { phrase: string; meaning: string }[];
  // Each inner list is one point the first outline must cover; any wording in it counts.
  outlineCovers: string[][];
  // Wrong facts the outline must not contain, such as a relationship shortened.
  outlineGone?: string[];
  // What the learner asks to change, and how to tell it was done.
  feedback?: { text: string; gone?: string[]; before?: [string[], string[]] };
  // Word stems the script must contain, must not contain, and an order to keep.
  scriptCovers: string[];
  scriptGone?: string[];
  scriptBefore?: [string[], string[]];
};
export type Checks = Record<string, boolean>;

const lower = (text: string) => text.toLowerCase().replace(/ё/g, "е");
const first = (text: string, options: string[]) => {
  const found = options.map((option) => lower(text).indexOf(lower(option))).filter((at) => at >= 0);
  return found.length ? Math.min(...found) : -1;
};
const mentions = (text: string, options: string[]) => first(text, options) >= 0;
const inOrder = (text: string, [earlier, later]: [string[], string[]]) =>
  first(text, earlier) >= 0 && first(text, earlier) < first(text, later);
export const wordCount = (text: string) => (text.match(/[\p{L}\p{N}]+/gu) ?? []).length;
const share = (text: string, script: RegExp) => {
  const letters = text.match(/\p{L}/gu) ?? [];
  return letters.length ? letters.filter((letter) => script.test(letter)).length / letters.length : 0;
};
const plainText = (text: string) =>
  !/\*\*|__|`|^\s{0,3}#{1,6}\s|^\s*[-*•]\s/m.test(text) && !/\p{Extended_Pictographic}/u.test(text);
// Enough of a word to still match after its ending changes.
const stem = (phrase: string) => {
  const word = lower(phrase).split(/\s+/)[0];
  return word.length >= 7 ? word.slice(0, -3) : word.length >= 5 ? word.slice(0, -2) : word;
};

// Two sentences that share nearly all their content words say the same thing twice.
const stop = new Set("the a an and or but to of in on at for with is are was were be it she he they we i you my her his our their that this when as so very really also too not".split(" "));
function repeated(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).map((sentence) =>
    new Set(lower(sentence).split(/[^a-zа-я]+/).filter((word) => word.length > 2 && !stop.has(word)).map((word) => word.slice(0, 5))));
  return sentences.some((one, index) => sentences.slice(index + 1).some((other) => {
    if (one.size < 3 || other.size < 3) return false;
    const shared = [...one].filter((word) => other.has(word)).length;
    return shared / Math.min(one.size, other.size) >= 0.8;
  }));
}
// The first outline: is it the learner's story, in their own language?
export function judgeOutline(testCase: ScriptCase, outline: string): Checks {
  return {
    "outline: in the native language": share(outline, /[a-z]/i) >= 0.9,
    "outline: first person": /\b(I|my|me|we|our)\b/.test(outline),
    "outline: plain text": plainText(outline),
    "outline: covers what was said": testCase.outlineCovers.every((point) => mentions(outline, point)),
    ...(testCase.outlineGone ? { "outline: no wrong facts": !mentions(outline, testCase.outlineGone) } : {}),
    // No upper limit: the outline must cover everything, however long.
    "outline: at least 40 words": wordCount(outline) >= 40,
    "outline: no sentence said twice": !repeated(outline),
    "outline: saved words' ideas included": testCase.saved.every((word) =>
      word.meaning.toLowerCase().split(/[^a-z]+/).filter((part) => part.length > 2 && part !== "the")
        .every((part) => lower(outline).includes(part.slice(0, Math.max(3, part.length - 2))))),
  };
}
// The outline after the learner asked for a change.
export function judgeRevision(testCase: ScriptCase, revised: string): Checks {
  const { gone, before } = testCase.feedback!;
  return {
    "revision: in the native language": share(revised, /[a-z]/i) >= 0.9,
    ...(gone ? { "revision: removed what was asked": !mentions(revised, gone) } : {}),
    ...(before ? { "revision: reordered as asked": inOrder(revised, before) } : {}),
  };
}
// The script: natural target-language speech that follows the approved outline.
export function judgeScript(testCase: ScriptCase, script: string, language = "ru-RU"): Checks {
  const text = scriptText(script);
  const segments = scriptSegments(script);
  const marked = (mark: string) => segments.filter((segment) => segment.marks.includes(mark));
  return {
    "script: marks well formed": !/[\[\]]/.test(text) && plainText(text),
    "script: in the language being learned": share(text, /[а-яё]/i) >= 0.9,
    "script: first person": /(^|[^\p{L}])(я|мне|меня|мой|моя|мою|моей|моего|мои|мы|нас|наш\p{L}*)(?=$|[^\p{L}])/iu.test(text),
    "script: at least 50 words": wordCount(text) >= 50,
    "script: follows the outline": testCase.scriptCovers.every((point) => mentions(text, [point])),
    ...(testCase.scriptGone ? { "script: leaves out what was removed": !mentions(text, testCase.scriptGone) } : {}),
    ...(testCase.scriptBefore ? { "script: keeps the requested order": inOrder(text, testCase.scriptBefore) } : {}),
    "script: every saved word used and marked": testCase.saved.every((word) =>
      marked("s").some((segment) => lower(segment.text).includes(stem(word.phrase)))),
    "script: every case shown": (scriptCases[language] ?? []).every((item) => marked(item.mark).length > 0),
  };
}

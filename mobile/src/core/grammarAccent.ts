export type TextAccentRange = { start: number; end: number };

const cyrillicWord = /[А-Яа-яЁё]+/gu;
const futureAuxiliaries = new Set([
  "быть",
  "буду",
  "будешь",
  "будет",
  "будем",
  "будете",
  "будут",
]);

const suffixesByTopic: Record<string, string[]> = {
  "past-events": ["лась", "лось", "лись", "лся", "ла", "ло", "ли", "л"],
  "plans-intentions": [
    "ешь",
    "ете",
    "ишь",
    "ите",
    "ем",
    "им",
    "ет",
    "ит",
    "ют",
    "ут",
    "ят",
    "ат",
    "ю",
    "у",
  ],
  "instrumental-singular": ["ью", "ой", "ей", "ым", "им", "ом", "ем"],
  "instrumental-plural": ["ьями", "ами", "ями", "ыми", "ими"],
};

function mergeRanges(ranges: TextAccentRange[]): TextAccentRange[] {
  const sorted = ranges
    .filter(({ start, end }) => start >= 0 && end > start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextAccentRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

export function grammarAccentRanges(
  text: string,
  topicId: string,
  guideOnly = false,
): TextAccentRange[] {
  const exerciseStart = guideOnly
    ? text.search(/^Exercise\s*:/im)
    : -1;
  const limit = exerciseStart >= 0 ? exerciseStart : text.length;
  const ranges: TextAccentRange[] = [];
  const suffixes = suffixesByTopic[topicId];

  for (const match of text.slice(0, limit).matchAll(cyrillicWord)) {
    const word = match[0];
    const start = match.index;
    const lower = word.toLocaleLowerCase("ru-RU");

    if (topicId === "plans-intentions" && futureAuxiliaries.has(lower)) {
      ranges.push({ start, end: start + word.length });
      continue;
    }

    const suffix = suffixes?.find((candidate) => lower.endsWith(candidate));
    if (suffix) {
      ranges.push({
        start: start + word.length - suffix.length,
        end: start + word.length,
      });
      continue;
    }

    if (topicId === "verb-aspects") {
      if (lower.startsWith("прочита")) {
        ranges.push({ start, end: start + 3 });
      } else if (lower === "сделать") {
        ranges.push({ start, end: start + 1 });
      } else if (lower === "решить") {
        ranges.push({ start, end: start + word.length });
      }
      continue;
    }

    // Future topics without a dedicated rule can still distinguish target
    // language forms without changing the underlying message text.
    if (!suffixes) {
      ranges.push({ start, end: start + word.length });
    }
  }

  return mergeRanges(ranges);
}

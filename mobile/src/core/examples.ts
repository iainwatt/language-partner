import { selectedSpan, type Message } from "./domain";
import type { PhraseRange } from "./selection";

const boundary = /[\n\r.!?;:,…。！？；：]/gu;

/** A literal excerpt from the selected occurrence, with up to two words on each side. */
export function selectionExample(message: Message, range: PhraseRange): string {
  const phrase = selectedSpan(message, range.start, range.end);
  if (phrase.length > 600) return "";
  const beforeStart = Math.max(0, range.start - 600);
  const before = message.text.slice(beforeStart, range.start);
  const after = message.text.slice(range.end, range.end + 600);
  const leftBoundary = [...before.matchAll(boundary)].at(-1);
  const leftStart = leftBoundary
    ? leftBoundary.index + leftBoundary[0].length
    : 0;
  const leftWords = [...before.slice(leftStart).matchAll(/\S+/gu)];
  const start = leftWords.length
    ? beforeStart +
      leftStart +
      leftWords[Math.max(0, leftWords.length - 2)].index
    : range.start;
  const right = after.slice(
    0,
    [...after.matchAll(boundary)][0]?.index ?? after.length,
  );
  const rightWords = [...right.matchAll(/\S+/gu)];
  const last = rightWords[Math.min(1, rightWords.length - 1)];
  const end = last ? range.end + last.index + last[0].length : range.end;
  const excerpt = message.text.slice(start, end).trim();
  // Don't duplicate a whole message/selection when there is no surrounding context.
  return excerpt.length <= 600 && excerpt !== phrase.trim() ? excerpt : "";
}

/** Edited examples must still contain the highlighted occurrence in its original text. */
export function isSelectionExample(
  message: Message,
  range: PhraseRange,
  example: string,
): boolean {
  let selected: string;
  try {
    selected = selectedSpan(message, range.start, range.end);
  } catch {
    return false;
  }
  const text = example.trim();
  if (!text || text.length > 600) return false;
  const selectedStart =
    range.start + selected.length - selected.trimStart().length;
  const selectedEnd = range.end - selected.length + selected.trimEnd().length;
  let start = message.text.indexOf(text);
  while (start !== -1 && start <= selectedStart) {
    if (start <= selectedStart && start + text.length >= selectedEnd)
      return true;
    start = message.text.indexOf(text, start + 1);
  }
  return false;
}

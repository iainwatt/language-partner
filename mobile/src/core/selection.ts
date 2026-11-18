import { selectedSpan, type Message } from "./domain";

export type PhraseRange = { start: number; end: number };
export type PhraseSelectionEvent = PhraseRange & {
  text: string;
  sourceText: string;
};

// Native and browser ranges use UTF-16 offsets, just like String.slice.
// Reject an event from a transcript that has since changed.
export function phraseRange(
  message: Message,
  event: PhraseSelectionEvent,
): PhraseRange | null {
  if (event.sourceText !== message.text) return null;
  try {
    if (selectedSpan(message, event.start, event.end) !== event.text)
      return null;
    return { start: event.start, end: event.end };
  } catch {
    return null;
  }
}

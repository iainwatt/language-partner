// Prepare a separate spoken copy. Displayed messages, selections and saved words
// retain their original text, including punctuation and formatting.
// Remove Markdown emphasis markers and keep the words. Repeated to handle
// nesting. Requires word boundaries and nonblank content so multiplication,
// identifiers and ordinary underscores survive.
export function stripEmphasis(text: string): string {
  for (let pass = 0; pass < 3; pass++)
    text = text.replace(
      /(^|[\s([{<«‹“„"‘])(\*\*|__|\*|_)(\S(?:[^\n]*?\S)?)\2(?=$|[\s.,!?;:)\]}>»›”‟"’])/gm,
      "$1$3",
    );
  return text;
}
export function prepareSpeechText(text: string): string {
  let spoken = text
    .replace(/\r\n?/g, "\n")
    // Strip common Markdown presentation while retaining its readable content.
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*$/gm, "")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*(?:\*[ \t]*){3,}$/gm, "")
    .replace(/^[ \t]*(?:-[ \t]*){3,}$/gm, "")
    .replace(/^[ \t]*(?:_[ \t]*){3,}$/gm, "")
    .replace(/^[ \t]*[-*•][ \t]+/gm, "");

  return stripEmphasis(spoken)
    // Emoji and arrows are for the eye; a voice would name them aloud.
    .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}\u200D\uFE0F\u20E3]/gu, " ")
    .replace(/[ \t]*[→⇒➜➔][ \t]*/g, ", ")
    // Strip quote wrappers after emphasis, including **«quoted words»**.
    // Keep single < and > signs: they can express comparisons.
    .replace(/<<([\s\S]*?)>>/g, " $1 ")
    .replace(/[«»‹›“”„‟]/g, " ")
    .replace(/(^|[\s([{])"([^"\n]+)"/g, "$1$2")
    .replace(/(^|[\s([{])‘([^‘’\n]+)’/g, "$1$2")
    .replace(/[ \t]+/g, " ")
    .replace(/ +([,.;:!?…\)\]}])/g, "$1")
    .replace(/([([{]) +/g, "$1")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

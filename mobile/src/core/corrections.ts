// The partner marks its corrections with tags so the app can show them as a
// block, and the server can save each fix. Two tags are understood:
//   <corrections> lines the learner sees: an optional natural rephrasing of the
//                 whole sentence, then one "said → better (reason)" line per fix
//   <misheard>    "recognised → meant" lines for likely speech-recognition
//                 slips; saved for checking, never shown
//   <meant>       what the learner meant in their turn, in their own language;
//                 kept with the chat for writing the script, never shown
//   <hints>       one or two of the learner's saved words that would fit an
//                 answer to the partner's question, each "word — meaning";
//                 shown under the message as a prompt, never spoken
export type Correction = {
  said: string;
  better: string;
  note?: string;
  misheard: boolean;
};
export type SplitReply = {
  // The reply without either tagged section.
  text: string;
  // The corrections section as the learner should see it; "" when there is none.
  shown: string;
  // The rephrasing of the whole sentence, when the partner gave one.
  natural?: string;
  corrections: Correction[];
  // What the learner meant in the turn being answered, in their own language.
  meant?: string;
  // Whether the learner speaks as a man or a woman, once the partner has found out.
  speaker?: "male" | "female";
  // Saved words offered for the learner's next answer, one to a line.
  hints?: string;
  // Where the corrections section sat in the reply, for the eval to report.
  position: "none" | "first" | "middle" | "last";
};

const arrow = /\s*(?:→|->|=>|⇒)\s*/;
const limit = (text: string) => text.trim().slice(0, 300);
function fix(line: string, misheard: boolean): Correction | undefined {
  const [left, ...rest] = line.replace(/^[\s\-–•*]+/, "").split(arrow);
  let better = rest.join(" → ").trim();
  let note: string | undefined;
  const reason = better.match(/^(.*?\S)\s*\(([^()]+)\)\s*$/);
  if (reason) [better, note] = [reason[1], reason[2]];
  better = better.replace(/\?$/, "");
  if (!left?.trim() || !better.trim()) return undefined;
  return { said: limit(left), better: limit(better), ...(note ? { note: limit(note) } : {}), misheard };
}

export function splitCorrections(raw: string): SplitReply {
  const corrections: Correction[] = [];
  const shownLines: string[] = [];
  let natural: string | undefined;
  let position: SplitReply["position"] = "none";
  let meant = "";
  let speaker: SplitReply["speaker"];
  let hints = "";
  const withoutSlips = raw
    .replace(/<hints>([\s\S]*?)(?:<\/hints>|$)/gi, (_, body: string) => {
      // At most two lines are kept, tidied of list marks and of any tag the
      // model wrote twice or left inside.
      hints ||= body.split("\n").map((line) => line.replace(/<\/?hints>/gi, "").replace(/^[\s\-–•*\d.)]+/, "").trim()).filter(Boolean).slice(0, 2).join("\n").slice(0, 600);
      return "";
    })
    // A tag left over from a doubled or unclosed section must never reach the learner.
    .replace(/<\/?hints>/gi, "")
    .replace(/<speaker>\s*(male|female)\s*<\/speaker>|<\/?speaker>/gi, (_, value?: string) => {
      if (value) speaker = value.toLowerCase() as SplitReply["speaker"];
      return "";
    })
    .replace(/<meant>([\s\S]*?)(?:<\/meant>|$)/gi, (_, body: string) => {
      meant ||= body.replace(/\s+/g, " ").trim().slice(0, 2000);
      return "";
    })
    .replace(/<misheard>([\s\S]*?)(?:<\/misheard>|$)/gi, (_, body: string) => {
    for (const line of body.split("\n")) {
      const slip = arrow.test(line) && fix(line, true);
      if (slip && corrections.length < 20) corrections.push(slip);
    }
    return "";
  });
  const text = withoutSlips
    .replace(/<corrections>([\s\S]*?)(?:<\/corrections>|$)/gi, (whole, body: string, offset: number) => {
      if (position === "none") {
        const before = withoutSlips.slice(0, offset).trim();
        const after = withoutSlips.slice(offset + whole.length).trim();
        position = !before ? "first" : !after ? "last" : "middle";
      }
      for (const line of body.split("\n").map((value) => value.trim()).filter(Boolean)) {
        shownLines.push(line);
        const item = arrow.test(line) ? fix(line, false) : undefined;
        if (item && corrections.length < 20) corrections.push(item);
        else if (!item && natural === undefined && !corrections.some((entry) => !entry.misheard))
          natural = limit(line.replace(/^[^:]{1,40}:\s*/, ""));
      }
      return "\n";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return {
    text,
    shown: shownLines.join("\n").slice(0, 4000),
    ...(natural ? { natural } : {}),
    ...(meant ? { meant } : {}),
    ...(speaker ? { speaker } : {}),
    ...(hints ? { hints } : {}),
    corrections,
    position,
  };
}

const lettersOnly = (text: string) => text.toLowerCase().replace(/ё/g, "е").replace(/\u0301/g, "").match(/[\p{L}\p{N}]+/gu) ?? [];
// The hints that really are the learner's saved words. The partner is asked
// to offer only those, in whatever form the answer needs; anything else it
// offers is its own invention and is dropped. A hint counts as a saved word
// when one of its words begins as one of theirs does, which allows for a
// changed ending.
export function knownHints(hints: string, saved: { phrase: string }[]): string {
  const theirs = saved.flatMap((item) => lettersOnly(item.phrase)).filter((word) => word.length >= 3);
  const same = (a: string, b: string) => {
    const need = Math.min(4, a.length, b.length);
    return need >= 3 && a.slice(0, need) === b.slice(0, need) && (need === 4 || a.length === b.length);
  };
  return hints
    .split("\n")
    .filter((line) => lettersOnly(line.split(/\s+[—–-]\s+/)[0]).some((word) => theirs.some((mine) => same(word, mine))))
    .join("\n");
}

// The hints for a question, from the model's choice among the learner's saved
// words: a list of phrases copied from theirs. Each is matched back to the
// saved word, so what is shown is always one of the learner's own, with the
// meaning they saved for it. Anything else in the answer is ignored.
export function chosenHints(answer: string, saved: { phrase: string; meaning: string }[]): string {
  let picked: unknown;
  try {
    picked = JSON.parse(answer.slice(answer.indexOf("["), answer.lastIndexOf("]") + 1));
  } catch {
    return "";
  }
  if (!Array.isArray(picked)) return "";
  const flat = (text: string) => text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
  const lines: string[] = [];
  for (const item of picked) {
    const word = typeof item === "string" ? saved.find((entry) => flat(entry.phrase) === flat(item)) : undefined;
    const line = word ? `${word.phrase.trim()} — ${word.meaning.trim()}` : "";
    if (line && !lines.includes(line) && lines.length < 2) lines.push(line);
  }
  return lines.join("\n").slice(0, 600);
}

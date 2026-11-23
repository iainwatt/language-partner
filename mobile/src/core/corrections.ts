// The partner marks its corrections with tags so the app can show them as a
// block, and the server can save each fix. Two tags are understood:
//   <corrections> lines the learner sees: an optional natural rephrasing of the
//                 whole sentence, then one "said → better (reason)" line per fix
//   <misheard>    "recognised → meant" lines for likely speech-recognition
//                 slips; saved for checking, never shown
//   <meant>       what the learner meant in their turn, in their own language;
//                 kept with the chat for writing the script, never shown
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
  const withoutSlips = raw
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
    corrections,
    position,
  };
}

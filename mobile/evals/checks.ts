import { splitCorrections, type SplitReply } from "../src/core/corrections";

export type EvalCase = {
  id: string;
  kind: "slip" | "error" | "clean" | "ambiguous" | "stuck";
  about: string;
  history: { role: "user" | "assistant"; text: string }[];
  turn: string;
  // Recognised text that must not be corrected or mentioned.
  slips?: string[];
  // Mistakes that must be corrected; any listed `better` form is accepted.
  errors?: { said: string; better: string[] }[];
  // For ambiguous cases: the form whose treatment is reported.
  watch?: string;
  // For stuck cases: the learner says they do not know a word. Any one of
  // these, the likely words they want, must be offered in the reply.
  offers?: string[];
};
export type CheckName =
  | "format"
  | "plain text"
  | "slip left alone"
  | "error corrected"
  | "clean turn untouched"
  | "word supplied";
export type Verdict = {
  // true or false for each check that applies to this kind of case.
  checks: Partial<Record<CheckName, boolean>>;
  // Reported, never scored.
  observed: {
    replyWords: number;
    correctionWords: number;
    position: SplitReply["position"];
    endsWithQuestion: boolean;
    slipsFlagged?: boolean;
    // The hidden note of what the learner meant is present and in English.
    noted: boolean;
    ambiguous?: "corrected" | "flagged as misheard" | "left alone";
  };
  reply: SplitReply;
};

// Compare words, not typography: case, ё/е, quotes and punctuation are ignored.
const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const has = (text: string, part: string) => ` ${plain(text)} `.includes(` ${plain(part)} `);
const words = (text: string) => (plain(text) ? plain(text).split(" ").length : 0);

// Score one model reply against its case. Pure: the same reply always gets the same verdict.
export function judge(testCase: EvalCase, raw: string): Verdict {
  const reply = splitCorrections(raw);
  const fixes = reply.corrections.filter((item) => !item.misheard);
  const flagged = reply.corrections.filter((item) => item.misheard);
  const visible = `${reply.text}\n${reply.shown}`;
  const checks: Verdict["checks"] = {
    // Nothing of a tag reaches the learner, and every correction line is a fix
    // apart from one optional line rephrasing the whole sentence.
    format:
      !/<\/?\s*(corrections|misheard|log)\b|<\/?[a-z]+>/i.test(visible) &&
      reply.shown.split("\n").filter((line) => line && !/→|->|=>|⇒/.test(line)).length <= 1,
    "plain text":
      !/\*\*|__|`|^\s{0,3}#{1,6}\s/m.test(raw) && !/\p{Extended_Pictographic}/u.test(raw),
  };
  if (testCase.kind === "slip")
    checks["slip left alone"] = testCase.slips!.every(
      (slip) => !has(visible, slip) && !fixes.some((item) => has(item.said, slip)),
    );
  if (testCase.kind === "error")
    checks["error corrected"] = testCase.errors!.every((error) =>
      fixes.some(
        (item) =>
          (has(item.said, error.said) || has(error.said, item.said)) &&
          error.better.some((form) => has(item.better, form)),
      ),
    );
  if (testCase.kind === "clean") checks["clean turn untouched"] = !fixes.length && !reply.shown;
  // A stem is enough: the word may be offered in any of its forms.
  if (testCase.kind === "stuck")
    checks["word supplied"] = testCase.offers!.some((word) => plain(visible).includes(plain(word)));
  return {
    checks,
    observed: {
      replyWords: words(reply.text),
      correctionWords: words(reply.shown),
      position: reply.position,
      endsWithQuestion: /\?\s*$/.test(reply.text),
      noted: !!reply.meant && (reply.meant.match(/[a-z]/gi)?.length ?? 0) >= 0.9 * (reply.meant.match(/\p{L}/gu)?.length ?? 1),
      ...(testCase.kind === "slip"
        ? { slipsFlagged: testCase.slips!.every((slip) => flagged.some((item) => has(item.said, slip))) }
        : {}),
      ...(testCase.kind === "ambiguous"
        ? {
            ambiguous: fixes.some((item) => has(item.said, testCase.watch!))
              ? ("corrected" as const)
              : flagged.some((item) => has(item.said, testCase.watch!))
                ? ("flagged as misheard" as const)
                : ("left alone" as const),
          }
        : {}),
    },
    reply,
  };
}

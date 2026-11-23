import { summaryV0 } from "./summary.v0";

// The conversation summary, version 1: v0 with a revise step that can also
// change a single paragraph the learner selected, leaving the rest untouched.
// A version is frozen once it has shipped: copy to the next number to change it.
export const summaryV1 = {
  ...summaryV0,
  revise: (native: string) =>
    `${summaryV0.revise(native)}

ONE PARAGRAPH: If the JSON also gives "whole", then "draft" is a single paragraph the learner selected from the piece in "whole", and the feedback is about that paragraph only. Rewrite just that paragraph as the feedback asks, so that it still fits what comes before and after it, and return only the rewritten paragraph. Do not return or change the rest of the piece. If the feedback asks you to split it, separate the new paragraphs with a blank line.`,
};

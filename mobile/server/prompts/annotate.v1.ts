import { annotateV0 } from "./annotate.v0";

// Annotation prompts, version 1: same prompts as v0, down-tiered from gpt-5.4
// to gpt-5.4-mini with reasoning effort "low" in src/core/managedAi.ts.
// A version is frozen once it has shipped: copy to the next number to change it.
export const annotateV1 = { ...annotateV0 };

import { summaryV3 } from "./summary.v3";

// The conversation summary, version 4: same prompts as v3, with per-step model
// and reasoning effort routing in src/core/managedAi.ts:
//   points:                 gpt-5.4-mini, effort "low" (down-tiered from gpt-5.4)
//   write/revise/paragraph: gpt-5.4,      effort "low"
//   check:                  gpt-5.4,      effort "medium"
// A version is frozen once it has shipped: copy to the next number to change it.
export const summaryV4 = { ...summaryV3 };

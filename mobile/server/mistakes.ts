import type { Correction } from "../src/core/corrections";
import { chatPromptVersion } from "./prompts";

// One Firestore document per fix, under users/{uid}/mistakes. The learner's
// full sentence travels with each one so it can be re-read and categorised
// later. Written only by the server; the learner's app can read its own.
export function mistakeDocuments(
  corrections: Correction[],
  turn: { sentence: string; natural?: string; native: string; target: string },
  now = new Date(),
) {
  return corrections.map((correction) => ({
    ...correction,
    sentence: turn.sentence.slice(0, 4000),
    ...(turn.natural && !correction.misheard ? { natural: turn.natural } : {}),
    native: turn.native,
    target: turn.target,
    createdAt: now.toISOString(),
    promptVersion: chatPromptVersion,
  }));
}

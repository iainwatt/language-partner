import { chatPromptV0 } from "./chat.v0";
import { chatPromptV1 } from "./chat.v1";
import { chatPromptV2 } from "./chat.v2";
import { chatPromptV3 } from "./chat.v3";
import { chatPromptV4 } from "./chat.v4";
import { chatPromptV5 } from "./chat.v5";
import { chatPromptV6 } from "./chat.v6";
import { chatPromptV7 } from "./chat.v7";
import { scriptPromptV1 } from "./script.v1";
import { scriptPromptV2 } from "./script.v2";
import { scriptPromptV3 } from "./script.v3";
import { scriptPromptV4 } from "./script.v4";
import { scriptPromptV5 } from "./script.v5";
import { scriptPromptV6 } from "./script.v6";
import { scriptPromptV7 } from "./script.v7";
import { scriptPromptV8 } from "./script.v8";
import { translatePromptV0 } from "./translate.v0";
import { translatePromptV1 } from "./translate.v1";
import { reviewPromptV0 } from "./review.v0";
import { reviewPromptV1 } from "./review.v1";
import { annotateV0 } from "./annotate.v0";
import { annotateV1 } from "./annotate.v1";
import { annotateV2 } from "./annotate.v2";
import { meaningsPromptV0 } from "./meanings.v0";
import { meaningsPromptV1 } from "./meanings.v1";
import { restsPromptV0 } from "./rests.v0";
import { restsPromptV1 } from "./rests.v1";
import { stepsV0 } from "./steps.v0";
import { stepsV1 } from "./steps.v1";
import { stepsV2 } from "./steps.v2";
import { stepsV3 } from "./steps.v3";
import { summaryV0 } from "./summary.v0";
import { summaryV1 } from "./summary.v1";
import { summaryV2 } from "./summary.v2";
import { summaryV3 } from "./summary.v3";
import { summaryV4 } from "./summary.v4";

// Every version, each in its own chat.vN.ts file, so the eval can run any of them.
export const chatPrompts = {
  v0: chatPromptV0,
  v1: chatPromptV1,
  v2: chatPromptV2,
  v3: chatPromptV3,
  v4: chatPromptV4,
  v5: chatPromptV5,
  v6: chatPromptV6,
  v7: chatPromptV7,
};
export type ChatPromptVersion = keyof typeof chatPrompts;

// The version the app uses. Change this one line to switch, or to switch back.
// v6 added rules against echoing and for supplying a word. They were patches
// for trouble the surrounding instructions had caused, and are not used.
// v7 keeps v5's wording with Structured Outputs (JSON schema) and effort "low".
export const chatPromptVersion: ChatPromptVersion = "v7";
export const chatPrompt = chatPrompts[chatPromptVersion];

// The conversation script. First a summary in the learner's own language,
// made in three steps (list the points, write the piece, check it) plus a
// prompt for changes the learner asks for. Then the script itself.
// Earlier single-call outline prompts (outline.v0 to v3) are kept only as history.
type Prompt = (native: string) => string;
// Versions before v2 used the one `revise` prompt for a single paragraph too.
export type SummaryPrompts = { points: Prompt; write: Prompt; check: Prompt; revise: Prompt; reviseParagraph?: Prompt };
export const summaryPrompts: Record<"v0" | "v1" | "v2" | "v3" | "v4", SummaryPrompts> = {
  v0: summaryV0,
  v1: summaryV1,
  v2: summaryV2,
  v3: summaryV3,
  v4: summaryV4,
};
export const summaryPromptVersion: keyof typeof summaryPrompts = "v4";
export const summaryPrompt = summaryPrompts[summaryPromptVersion];
export const scriptPrompts = {
  v1: scriptPromptV1,
  v2: scriptPromptV2,
  v3: scriptPromptV3,
  v4: scriptPromptV4,
  v5: scriptPromptV5,
  v6: scriptPromptV6,
  v7: scriptPromptV7,
  v8: scriptPromptV8,
};
export const scriptPromptVersion: keyof typeof scriptPrompts = "v8";
export const scriptPrompt = scriptPrompts[scriptPromptVersion];

// Marks added to the finished script, one kind per call: case endings and stress.
export const annotatePrompts = { v0: annotateV0, v1: annotateV1, v2: annotateV2 };
export const annotatePromptVersion: keyof typeof annotatePrompts = "v2";
export const annotatePrompt = annotatePrompts[annotatePromptVersion];

// What the saved words in a script mean where they stand, for the practice prompter.
export const meaningsPrompts = { v0: meaningsPromptV0, v1: meaningsPromptV1 };
export const meaningsPromptVersion: keyof typeof meaningsPrompts = "v1";
export const meaningsPrompt = meaningsPrompts[meaningsPromptVersion];

// The small jobs done beside a conversation, each as a request of its own.
export const stepPrompts = { v0: stepsV0, v1: stepsV1, v2: stepsV2, v3: stepsV3 };
export const stepPromptVersion: keyof typeof stepPrompts = "v3";
export const stepPrompt = stepPrompts[stepPromptVersion];

// The end of each sentence in the learner's own language, for the practice prompter.
export const restsPrompts = { v0: restsPromptV0, v1: restsPromptV1 };
export const restsPromptVersion: keyof typeof restsPrompts = "v1";
export const restsPrompt = restsPrompts[restsPromptVersion];

// Translating what the learner wants to say into the language being learned,
// and reviewing a phrase they have just saved.
export const translatePrompts = { v0: translatePromptV0, v1: translatePromptV1 };
export const translatePromptVersion: keyof typeof translatePrompts = "v1";
export const translatePrompt = translatePrompts[translatePromptVersion];

export const reviewPrompts = { v0: reviewPromptV0, v1: reviewPromptV1 };
export const reviewPromptVersion: keyof typeof reviewPrompts = "v1";
export const reviewPrompt = reviewPrompts[reviewPromptVersion];

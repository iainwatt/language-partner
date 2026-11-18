import { chatPromptV1 } from "./chat.v1";

// The version in use. Each version lives in its own chat.vN.ts file; switch
// versions by changing these two lines, and switch back the same way.
export const chatPromptVersion = "v1";
export const chatPrompt = chatPromptV1;

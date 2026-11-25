import { scriptPromptV7 } from "./script.v7";

// Script prompt, version 8: same prompt as v7, with explicit reasoning effort
// "low" on gpt-5.4 in src/core/managedAi.ts.
// A version is frozen once it has shipped: copy to the next number to change it.
export const scriptPromptV8 = scriptPromptV7;

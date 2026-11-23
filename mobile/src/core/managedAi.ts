import { providers, type Settings } from "./domain";

// Partner selection is managed by Language Partner, never a user credential flow.
export const managedPartner = { provider: "openai" as const, model: providers.openai.models[0] };
// The conversation summary and script are written once per conversation, and a
// saved phrase is reviewed once, in the background. Quality matters more than
// speed for all three, so they use the larger model.
export const managedWriter = { provider: "openai" as const, model: providers.openai.models[1] };
// Glossing a script's saved words, or its sentence endings, is a small job; it goes to the quicker model.
export const managedModel = (action: string, step?: string) =>
  (action === "outline" || action === "script" || action === "review") && step !== "meanings" && step !== "rests" ? managedWriter : managedPartner;
export function managedSettings(settings: Settings, signedIn: boolean): Settings {
  return { ...settings, ...managedPartner, mode: signedIn ? "api" : "demo" };
}

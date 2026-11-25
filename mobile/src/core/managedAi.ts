import { providers, type Provider, type Settings } from "./domain";

export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";
export type ModelTarget = {
  provider: Provider;
  model: string;
  effort?: ReasoningEffort;
};

// Partner selection is managed by Language Partner, never a user credential flow.
export const managedPartner = { provider: "openai" as const, model: providers.openai.models[0] };
// The conversation summary and script are written once per conversation, and
// video questions are written once and asked many times, so they use the larger model.
export const managedWriter = { provider: "openai" as const, model: providers.openai.models[1] };

// Ordered cross-provider fallback targets per primary model. Used only on transient
// provider failures (rate-limit, quota, unavailable) when that provider's key is
// configured. Left empty until fallback models are verified for the app.
export const managedFallbacks: Record<string, readonly ModelTarget[]> = {
  "gpt-5.4-mini": [],
  "gpt-5.4": [],
};

// Per-action and per-step model + reasoning effort routing:
// - Chat, translate, hints, summaries, phrase reviews, outline point extraction,
//   and script annotation/glossing use the faster model with low/no reasoning.
// - Creative writing (outline write/revise, script write, video questions) uses
//   the larger model with low reasoning; outline fact-checking uses medium effort.
export function managedModel(action: string, step?: string): ModelTarget {
  if (action === "outline") {
    if (step === "points") return { ...managedPartner, effort: "low" };
    if (step === "check") return { ...managedWriter, effort: "medium" };
    return { ...managedWriter, effort: "low" };
  }
  if (action === "script") {
    if (step === "cases" || step === "stress") return { ...managedPartner, effort: "low" };
    if (step === "meanings" || step === "rests") return { ...managedPartner, effort: "none" };
    return { ...managedWriter, effort: "low" };
  }
  if (action === "questions") return { ...managedWriter, effort: "low" };
  if (action === "review") return { ...managedPartner, effort: "low" };
  if (action === "generate" || action === "summarize") return { ...managedPartner, effort: "low" };
  return { ...managedPartner, effort: "none" };
}

export function managedSettings(settings: Settings, signedIn: boolean): Settings {
  return { ...settings, ...managedPartner, mode: signedIn ? "api" : "demo" };
}

import { providers, type Settings } from "./domain";

// Partner selection is managed by Language Partner, never a user credential flow.
export const managedPartner = { provider: "openai" as const, model: providers.openai.models[0] };
export function managedSettings(settings: Settings, signedIn: boolean): Settings {
  return { ...settings, ...managedPartner, mode: signedIn ? "api" : "demo" };
}

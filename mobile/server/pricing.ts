import type { Provider } from "../src/core/domain";

export type TokenUsage = {
  input: number; output: number; cachedInput: number;
  cacheWrite5m: number; cacheWrite1h: number;
};
export const PRICING_VERSION = "2026-11-03";
// Standard paid text rates, USD / million tokens. No tools, audio, or explicit
// Gemini cache storage is used by this app. See docs/ai-usage.md for sources.
const rates: Record<string, { provider: Provider; input: number; cached: number; output: number }> = {
  "gpt-5.4-mini": { provider: "openai", input: 0.75, cached: 0.075, output: 4.5 },
  "gpt-5.4": { provider: "openai", input: 2.5, cached: 0.25, output: 15 },
  "claude-sonnet-5": { provider: "claude", input: 2, cached: 0.2, output: 10 },
  "claude-haiku-4-5-20251001": { provider: "claude", input: 1, cached: 0.1, output: 5 },
  "gemini-3.8-flash": { provider: "gemini", input: 0.75, cached: 0.075, output: 3.75 },
  "gemini-2.5-flash": { provider: "gemini", input: 0.3, cached: 0.03, output: 2.5 },
};
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export function tokenUsage(provider: Provider, payload: any): TokenUsage | null {
  const u = provider === "gemini" ? payload?.usageMetadata : payload?.usage;
  if (!u) return null;
  let input: number, output: number, cachedInput: number, cacheWrite5m = 0, cacheWrite1h = 0;
  if (provider === "openai") {
    input = u.input_tokens;
    output = u.output_tokens; // Already includes reasoning tokens.
    cachedInput = u.input_tokens_details?.cached_tokens ?? 0;
    // The supported GPT-5.4 models have no separately charged cache writes.
    if (u.input_tokens_details?.cache_write_tokens) return null;
  } else if (provider === "claude") {
    cachedInput = u.cache_read_input_tokens ?? 0;
    const writes = u.cache_creation_input_tokens ?? 0;
    cacheWrite1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
    cacheWrite5m = u.cache_creation?.ephemeral_5m_input_tokens ?? (writes - cacheWrite1h);
    if (![u.input_tokens, writes, cachedInput, cacheWrite1h, cacheWrite5m].every(count) || cacheWrite1h + cacheWrite5m !== writes) return null;
    input = u.input_tokens + cachedInput + writes;
    output = u.output_tokens; // Includes thinking, not just visible text.
  } else {
    if (![u.promptTokenCount, u.candidatesTokenCount, u.thoughtsTokenCount ?? 0, u.toolUsePromptTokenCount ?? 0].every(count)) return null;
    input = u.promptTokenCount + (u.toolUsePromptTokenCount ?? 0);
    output = u.candidatesTokenCount + (u.thoughtsTokenCount ?? 0);
    cachedInput = u.cachedContentTokenCount ?? 0;
  }
  if (![input, output, cachedInput, cacheWrite5m, cacheWrite1h].every(count) || cachedInput + cacheWrite5m + cacheWrite1h > input) return null;
  return { input, output, cachedInput, cacheWrite5m, cacheWrite1h };
}
export function estimateCostNanos(provider: Provider, model: string, usage: TokenUsage | null, at: string): number | null {
  const rate = rates[model];
  if (!usage || !rate || rate.provider !== provider) return null;
  // This alias redirects to a differently priced model from December. Require
  // a verified rate update instead of silently applying the old price.
  if (model === "gemini-2.5-flash" && at >= "2026-12-01") return null;
  const multiplier = model === "gemini-3.8-flash" && at >= "2027-01-01" ? 2 : 1;
  const long = model === "gpt-5.4" && usage.input > 272000;
  const ordinary = usage.input - usage.cachedInput - usage.cacheWrite5m - usage.cacheWrite1h;
  return Math.round(1000 * multiplier * (
    (ordinary * rate.input + usage.cachedInput * rate.cached +
      usage.cacheWrite5m * rate.input * 1.25 + usage.cacheWrite1h * rate.input * 2) * (long ? 2 : 1) +
    usage.output * rate.output * (long ? 1.5 : 1)
  ));
}

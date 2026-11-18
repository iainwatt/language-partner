import type { PracticeCounter, Provider } from "./domain";

export type PartnerUsage = {
  startedAt: string | null;
  requests: number;
  pricedRequests: number;
  unknownRequests: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostNanos: number;
  trackedCostNanos: number;
  trackedUnknownRequests: number;
  trackedRequests: number;
  practiceMs: number;
};
export type UsageOverview = Record<Provider, PartnerUsage>;
export const emptyPartnerUsage = (): PartnerUsage => ({
  startedAt: null, requests: 0, pricedRequests: 0, unknownRequests: 0,
  inputTokens: 0, outputTokens: 0, cachedInputTokens: 0,
  estimatedCostNanos: 0, trackedCostNanos: 0, trackedUnknownRequests: 0,
  trackedRequests: 0, practiceMs: 0,
});
export function practiceDelta(previous: PracticeCounter | undefined, next: PracticeCounter) {
  return Object.fromEntries((["openai", "claude", "gemini"] as const).map((p) =>
    [p, Math.max(0, next[p] - (previous?.[p] ?? 0))],
  )) as Record<Provider, number>;
}
export function hourlyCost(usage: PartnerUsage): number | null {
  if (!usage.practiceMs || !usage.trackedRequests || usage.trackedUnknownRequests) return null;
  return usage.trackedCostNanos / 1e9 / (usage.practiceMs / 3600000);
}
export function formatCost(dollars: number) {
  if (dollars > 0 && dollars < 0.001) return "<$0.001";
  return `$${dollars.toFixed(dollars > 0 && dollars < 1 ? 3 : 2)}`;
}

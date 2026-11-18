export const FREE_CONVERSATION_MS = 15 * 60 * 1000;
export const CONVERSATION_LEASE_MS = 30 * 1000;
export const PREMIUM_ENTITLEMENT = "language_partner_plus";

export type ConversationAccess = {
  enabled: boolean;
  subscribed: boolean;
  remainingMs: number;
  limitMs: number;
  leaseRemainingMs: number;
};

export const inactiveAccess: ConversationAccess = {
  enabled: false, subscribed: false, remainingMs: FREE_CONVERSATION_MS,
  limitMs: FREE_CONVERSATION_MS, leaseRemainingMs: 0,
};
export const needsSubscription = (access: ConversationAccess) =>
  access.enabled && !access.subscribed && access.remainingMs <= 0;

export function remainingConversationMs(access: ConversationAccess, elapsedMs: number) {
  return Math.max(0, access.remainingMs - (access.subscribed ? 0 : Math.min(Math.max(0, elapsedMs), access.leaseRemainingMs)));
}
export function conversationTimeLabel(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export type ConversationLedger = {
  usedMs: number;
  sessionId: string | null;
  lease: { at: number; until: number } | null;
  paidUntil: number;
  subscriptionUpdatedAt: number;
  holdUntil: number;
  started: boolean;
};
export const emptyConversationLedger = (): ConversationLedger => ({
  usedMs: 0, sessionId: null, lease: null, paidUntil: 0, subscriptionUpdatedAt: 0, holdUntil: 0, started: false,
});

// All timestamps come from the server. Clients never submit time used, credits,
// or subscription status. A lost connection can consume at most one 30s lease.
export function settleConversation(ledger: ConversationLedger, now: number): ConversationLedger {
  if (!ledger.lease) return { ...ledger };
  const elapsed = Math.max(0, Math.min(now, ledger.lease.until) - ledger.lease.at);
  return {
    ...ledger,
    usedMs: Math.min(FREE_CONVERSATION_MS, ledger.usedMs + elapsed),
    lease: ledger.lease.until > now ? { ...ledger.lease, at: Math.max(now, ledger.lease.at) } : null,
  };
}
export function conversationAccess(ledger: ConversationLedger, now: number, enabled = true): ConversationAccess {
  const current = settleConversation(ledger, now);
  return {
    enabled, subscribed: current.paidUntil > now,
    remainingMs: Math.max(0, FREE_CONVERSATION_MS - current.usedMs),
    limitMs: FREE_CONVERSATION_MS,
    leaseRemainingMs: Math.max(0, (current.lease?.until ?? now) - now),
  };
}
export function renewConversation(ledger: ConversationLedger, sessionId: string, now: number): ConversationLedger {
  const current = settleConversation(ledger, now);
  if (current.paidUntil > now || current.usedMs >= FREE_CONVERSATION_MS) return { ...current, lease: null };
  if (current.lease && current.sessionId !== sessionId) throw new Error("conversation_in_use");
  return {
    ...current, sessionId, started: true,
    lease: { at: now, until: now + Math.min(CONVERSATION_LEASE_MS, FREE_CONVERSATION_MS - current.usedMs) },
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import { conversationAccess, conversationTimeLabel, emptyConversationLedger, FREE_CONVERSATION_MS, needsSubscription, remainingConversationMs, renewConversation, settleConversation } from "../src/core/conversationAccess";
import { subscriptionExpiry } from "../server/subscriptions";

test("the free allowance is exactly 15 minutes and never resets on a new day", () => {
  let ledger = emptyConversationLedger();
  for (let i = 0; i < 30; i++) {
    ledger = renewConversation(ledger, "phone", i * 30000);
    ledger = settleConversation(ledger, (i + 1) * 30000);
  }
  assert.equal(ledger.usedMs, 900000);
  assert.equal(conversationAccess(ledger, 900000).remainingMs, 0);
  assert.equal(needsSubscription(conversationAccess(ledger, 86400000)), true);
  assert.equal(renewConversation(ledger, "reinstalled-phone", 86400000).lease, null);
});

test("pausing charges only elapsed time and a lost connection stops at the lease boundary", () => {
  const running = renewConversation(emptyConversationLedger(), "phone", 1000);
  const paused = { ...settleConversation(running, 6100), lease: null };
  assert.equal(conversationAccess(paused, 86400000).remainingMs, FREE_CONVERSATION_MS - 5100);
  assert.equal(settleConversation(running, 86400000).usedMs, 30000);
  assert.equal(settleConversation(running, 500).usedMs, 0);
});

test("heartbeats and repeated status reads do not double-count time", () => {
  let ledger = renewConversation(emptyConversationLedger(), "phone", 0);
  ledger = settleConversation(ledger, 10000);
  ledger = renewConversation(ledger, "phone", 10000);
  ledger = settleConversation(ledger, 15000);
  ledger = settleConversation(ledger, 15000);
  assert.equal(ledger.usedMs, 15000);
  assert.equal(conversationAccess(ledger, 20000).remainingMs, FREE_CONVERSATION_MS - 20000);
});

test("the final lease is shortened to the remaining allowance", () => {
  const ledger = renewConversation({ ...emptyConversationLedger(), usedMs: FREE_CONVERSATION_MS - 3210 }, "phone", 10000);
  assert.equal(ledger.lease?.until, 13210);
  assert.equal(conversationAccess(ledger, 13209).remainingMs, 1);
  assert.equal(needsSubscription(conversationAccess(ledger, 13210)), true);
});

test("a second device cannot replace a running free session", () => {
  const ledger = renewConversation(emptyConversationLedger(), "one", 0);
  assert.throws(() => renewConversation(ledger, "two", 5000), /conversation_in_use/);
  const next = renewConversation(ledger, "two", 35000);
  assert.equal(next.usedMs, 30000);
  assert.equal(next.sessionId, "two");
});

test("a verified subscription bypasses the paywall until expiry without resetting free time", () => {
  const ledger = { ...emptyConversationLedger(), usedMs: FREE_CONVERSATION_MS, paidUntil: 10000 };
  assert.equal(needsSubscription(conversationAccess(ledger, 9999)), false);
  assert.equal(needsSubscription(conversationAccess(ledger, 10000)), true);
  assert.equal(renewConversation(ledger, "phone", 9999).lease, null);
});

test("the on-screen clock cannot run past a server lease or below zero", () => {
  const access = conversationAccess(renewConversation(emptyConversationLedger(), "one", 1000), 1000);
  assert.equal(remainingConversationMs(access, 600000), FREE_CONVERSATION_MS - 30000);
  assert.equal(remainingConversationMs({ ...access, remainingMs: 2000 }, 5000), 0);
  assert.equal(conversationTimeLabel(900000), "15:00");
  assert.equal(conversationTimeLabel(1), "0:01");
  assert.equal(conversationTimeLabel(0), "0:00");
});

function customer(fields: Record<string, unknown> = {}, entitlement: Record<string, unknown> = {}) {
  return { subscriber: {
    entitlements: { language_partner_plus: { product_identifier: "monthly", expires_date: "2026-12-01T00:00:00Z", ...entitlement } },
    subscriptions: { monthly: { is_sandbox: false, refunded_at: null, ...fields } },
  } };
}
test("server subscription verification respects grace, cancellation, refund and sandbox", () => {
  const expires = Date.parse("2026-12-01T00:00:00Z");
  assert.equal(subscriptionExpiry(customer(), false), expires);
  assert.equal(subscriptionExpiry(customer({ unsubscribe_detected_at: "2026-11-10" }), false), expires);
  assert.equal(subscriptionExpiry(customer({ grace_period_expires_date: "2026-12-04T00:00:00Z" }), false), Date.parse("2026-12-04T00:00:00Z"));
  assert.equal(subscriptionExpiry(customer({ refunded_at: "2026-11-10" }), false), 0);
  assert.equal(subscriptionExpiry(customer({ is_sandbox: true }), false), 0);
  assert.equal(subscriptionExpiry(customer({ is_sandbox: true }), true), expires);
  assert.equal(subscriptionExpiry(customer({}, { expires_date: "bad date" }), false), 0);
  assert.equal(subscriptionExpiry(customer({}, { expires_date: null }), false), 0);
  assert.equal(subscriptionExpiry({ subscriber: { entitlements: {} } }, false), 0);
  assert.throws(() => subscriptionExpiry({}, false), /Invalid subscription response/);
});

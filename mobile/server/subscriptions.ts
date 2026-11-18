import { timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { defineBoolean, defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { PREMIUM_ENTITLEMENT } from "../src/core/conversationAccess";
import { conversationAccessPath } from "./conversationAccess";

// Kept out of the mobile bundle. Deploy these two endpoints once RevenueCat is
// configured; the free allowance endpoint needs no billing credentials.
const billingKeys = defineSecret("BILLING_KEYS");
const allowSandbox = defineBoolean("BILLING_ALLOW_SANDBOX", { default: false });
const keySchema = z.object({ revenuecat: z.string().trim().min(1), webhook: z.string().min(32) });
const options = { region: "europe-west2", maxInstances: 2, secrets: [billingKeys], invoker: "public" as const };
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;

export function subscriptionExpiry(body: any, sandboxAllowed: boolean): number {
  const subscriber = body?.subscriber;
  if (!subscriber || typeof subscriber.entitlements !== "object" || !subscriber.entitlements)
    throw new Error("Invalid subscription response");
  const entitlement = subscriber.entitlements[PREMIUM_ENTITLEMENT];
  if (!entitlement) return 0;
  const product = subscriber.subscriptions?.[entitlement.product_identifier];
  // This product sells subscriptions. Don't treat malformed/missing dates or
  // unknown products as lifetime access, or cancellation as immediate expiry.
  if (!product || product.refunded_at || (product.is_sandbox !== false && !sandboxAllowed)) return 0;
  return Math.max(timestamp(entitlement.expires_date), timestamp(entitlement.grace_period_expires_date), timestamp(product.grace_period_expires_date));
}

async function syncSubscription(uid: string, key: string) {
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Subscription verification unavailable");
  const body = await response.json();
  const paidUntil = subscriptionExpiry(body, allowSandbox.value());
  const updatedAt = Number(body.request_date_ms);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) throw new Error("Invalid subscription timestamp");
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const ref = db.doc(conversationAccessPath(uid));
    const saved = (await tx.get(ref)).data();
    // Webhooks and purchase refreshes can arrive in any order. Only a newer
    // authoritative RevenueCat snapshot may change paid access.
    if ((saved?.subscriptionUpdatedAt ?? 0) > updatedAt) return;
    tx.set(ref, { paidUntil, subscriptionUpdatedAt: updatedAt, ...(paidUntil > Date.now() ? { lease: null } : {}) }, { merge: true });
  });
  return { subscribed: paidUntil > Date.now() };
}

export const refreshSubscription = onCall(options, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (request.auth.token.email_verified !== true) throw new HttpsError("permission-denied", "Verify your email first.");
  if (request.data?.accountId !== request.auth.uid) throw new HttpsError("permission-denied", "The account has changed.");
  const db = getFirestore();
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`privateBillingRequests/${request.auth!.uid}`);
    const old = (await tx.get(ref)).data();
    const minute = Math.floor(Date.now() / 60000);
    const count = old?.minute === minute ? Number(old.count) : 0;
    if (count >= 12) throw new HttpsError("resource-exhausted", "Please wait a minute before checking your subscription again.");
    tx.set(ref, { minute, count: count + 1 });
  });
  try { return await syncSubscription(request.auth.uid, keySchema.parse(JSON.parse(billingKeys.value())).revenuecat); }
  catch { throw new HttpsError("unavailable", "Your subscription couldn’t be confirmed yet. Please try Restore purchases in a moment."); }
});

export const revenuecatWebhook = onRequest(options, async (request, response) => {
  if (request.method !== "POST") { response.status(405).send("Method not allowed"); return; }
  try {
    const keys = keySchema.parse(JSON.parse(billingKeys.value()));
    const expected = Buffer.from(keys.webhook);
    const supplied = Buffer.from(request.get("authorization") ?? "");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { response.status(401).send("Unauthorized"); return; }
    if (request.rawBody.length > 128000) { response.status(413).send("Payload too large"); return; }
    const event = request.body?.event;
    if (!event || typeof event.type !== "string") { response.status(400).send("Invalid event"); return; }
    if (event.type === "TEST") { response.status(200).send("OK"); return; }
    const candidates = event.type === "TRANSFER"
      ? [...(Array.isArray(event.transferred_from) ? event.transferred_from : []), ...(Array.isArray(event.transferred_to) ? event.transferred_to : [])]
      : [event.app_user_id];
    const uids = [...new Set(candidates.filter((uid): uid is string => typeof uid === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(uid)))];
    if (uids.length > 20) { response.status(400).send("Too many customers"); return; }
    // Query current state for purchases, renewals, refunds, expirations and both
    // sides of transfers. Never trust event arrival order or client receipts.
    await Promise.all(uids.map((uid) => syncSubscription(uid, keys.revenuecat)));
    response.status(200).send("OK");
  } catch { response.status(503).send("Please retry"); }
});

import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { conversationAccess, emptyConversationLedger, inactiveAccess, needsSubscription, renewConversation, settleConversation, type ConversationLedger } from "../src/core/conversationAccess";

export const conversationAccessPath = (uid: string) => `privateConversationAccess/${uid}`;

export async function updateConversationAccess(uid: string, sessionId: string, action: "status" | "resume" | "pause" | "start" | "authorize" | "release", enabled: boolean, db: Firestore = getFirestore(), now = Date.now()) {
  if (!enabled) return inactiveAccess;
  return db.runTransaction(async (tx) => {
    const ref = db.doc(conversationAccessPath(uid));
    const saved = (await tx.get(ref)).data();
    let ledger = settleConversation({ ...emptyConversationLedger(), ...saved } as ConversationLedger, now);
    const access = conversationAccess(ledger, now);
    if (action === "authorize" && needsSubscription(access))
      throw new HttpsError("permission-denied", "Your 15 free conversation minutes are complete.", { type: "paywall", access });
    if (action === "authorize" && (ledger.lease || ledger.holdUntil > now) && ledger.sessionId !== sessionId)
      throw new HttpsError("failed-precondition", "Finish your conversation on the other device first.");
    if (action === "authorize") ledger = { ...ledger, sessionId, started: ledger.sessionId === sessionId && ledger.started, holdUntil: now + 65000 };
    if (action === "start" || (action === "resume" && ledger.sessionId === sessionId && ledger.started)) {
      try { ledger = renewConversation(ledger, sessionId, now); }
      catch { throw new HttpsError("failed-precondition", "Finish your conversation on the other device first."); }
    }
    if (action === "pause" && ledger.sessionId === sessionId) ledger.lease = null;
    if ((action === "release" || action === "start") && ledger.sessionId === sessionId) ledger.holdUntil = 0;
    tx.set(ref, ledger, { merge: true });
    // A second device may read the balance, but must not run the first one's clock.
    const result = conversationAccess(ledger, now);
    return { ...result, leaseRemainingMs: ledger.sessionId === sessionId ? result.leaseRemainingMs : 0 };
  });
}

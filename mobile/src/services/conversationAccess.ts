import { httpsCallable } from "firebase/functions";
import { id } from "../core/domain";
import { inactiveAccess, type ConversationAccess } from "../core/conversationAccess";
import { firebase } from "./firebase";

export const conversationSessionId = id();
type Listener = (access: ConversationAccess) => void;
const listeners = new Map<string, Set<Listener>>();
export function observeConversationAccess(uid: string, listener: Listener) {
  const set = listeners.get(uid) ?? new Set<Listener>();
  set.add(listener); listeners.set(uid, set);
  return () => { set.delete(listener); if (!set.size) listeners.delete(uid); };
}
export function publishConversationAccess(uid: string, value: ConversationAccess) {
  for (const listener of listeners.get(uid) ?? []) listener(value);
}
export function isPaywallError(error: any): boolean {
  return error?.details?.type === "paywall";
}
export async function conversationAllowance(uid: string, action: "status" | "resume" | "pause") {
  if (!firebase || firebase.auth.currentUser?.uid !== uid) throw new Error("The account has changed.");
  try {
    const result = await httpsCallable<unknown, ConversationAccess>(firebase.functions, "conversationAllowance", { timeout: 15000 })({
      action, accountId: uid, sessionId: conversationSessionId,
    });
    if (firebase.auth.currentUser?.uid !== uid) throw new Error("The account has changed.");
    publishConversationAccess(uid, result.data);
    return result.data;
  } catch (error: any) {
    // A staged mobile build still works with the previous backend. Network and
    // permission failures never masquerade as a fresh 15-minute allowance.
    if (error.code === "functions/not-found") return inactiveAccess;
    throw error;
  }
}
export async function verifySubscription(uid: string) {
  if (!firebase || firebase.auth.currentUser?.uid !== uid) throw new Error("The account has changed.");
  const result = await httpsCallable<{ accountId: string }, { subscribed: boolean }>(firebase.functions, "refreshSubscription", { timeout: 20000 })({ accountId: uid });
  if (firebase.auth.currentUser?.uid !== uid) throw new Error("The account has changed.");
  await conversationAllowance(uid, "status");
  return result.data.subscribed;
}

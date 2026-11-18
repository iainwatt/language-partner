import { useCallback, useEffect, useRef, useState } from "react";
import { conversationTimeLabel, needsSubscription, remainingConversationMs, type ConversationAccess } from "../core/conversationAccess";
import { conversationAllowance, observeConversationAccess } from "./conversationAccess";

export function useConversationAccess(uid: string | undefined, active: boolean) {
  const [savedSnapshot, setSnapshot] = useState<{ uid: string | undefined; value: ConversationAccess; at: number } | null>(null);
  // Never display the previous account's allowance while a sign-in is loading.
  const snapshot = savedSnapshot?.uid === uid ? savedSnapshot : null;
  const [elapsed, setElapsed] = useState(0);
  const mounted = useRef(true);
  const activeRef = useRef(active);
  activeRef.current = active;
  const queue = useRef(Promise.resolve());
  const apply = useCallback((value: ConversationAccess) => {
    if (!mounted.current) return;
    setSnapshot({ uid, value, at: performance.now() }); setElapsed(0);
  }, [uid]);
  const command = useCallback((action: "status" | "resume" | "pause") => {
    if (!uid) return Promise.resolve();
    const task = queue.current.catch(() => {}).then(async () => {
      const value = await conversationAllowance(uid, action === "resume" && !activeRef.current ? "pause" : action);
      apply(value);
    });
    queue.current = task;
    return task;
  }, [uid, apply]);
  useEffect(() => {
    mounted.current = true;
    if (!uid) return;
    const unsubscribe = observeConversationAccess(uid, (value) => {
      apply(value);
      // A reply may finish after the learner has opened settings or left chat.
      if (!activeRef.current && value.leaseRemainingMs > 0) void command("pause").catch(() => {});
    });
    void command("status").catch(() => {});
    return () => { mounted.current = false; unsubscribe(); void conversationAllowance(uid, "pause").catch(() => {}); };
  }, [uid, apply, command]);
  useEffect(() => {
    if (!uid || !snapshot?.value.enabled) return;
    void command(active ? "resume" : "pause").catch(() => {});
    if (!active) return;
    const timer = setInterval(() => { void command("resume").catch(() => {}); }, 10000);
    return () => clearInterval(timer);
  }, [uid, active, snapshot?.value.enabled, command]);
  useEffect(() => {
    if (!snapshot || !active || !snapshot.value.leaseRemainingMs) return;
    const timer = setInterval(() => setElapsed(performance.now() - snapshot.at), 250);
    return () => clearInterval(timer);
  }, [snapshot, active]);
  const value = snapshot ? { ...snapshot.value, remainingMs: remainingConversationMs(snapshot.value, elapsed) } : null;
  return {
    value, blocked: !!value && needsSubscription(value),
    label: conversationTimeLabel(value?.remainingMs ?? 15 * 60000),
    refresh: () => command("status"),
  };
}

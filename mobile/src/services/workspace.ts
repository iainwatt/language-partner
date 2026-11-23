import { useEffect, useRef, useState } from "react";
import { initialSnapshot, snapshotSchema, type Snapshot } from "../core/domain";
import { freshStart } from "../core/conversations";
import {
  dictionaryChanges,
  conversationChanges,
} from "../core/cloudDictionary";
import { repository } from "../storage/store";
import { useAuth } from "./auth";
import { firebaseScope } from "./firebase";
import {
  commitDictionary,
  watchDictionary,
  watchSavedConversations,
} from "./dictionary";

export function useWorkspace(report: (message: string) => void) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [data, setData] = useState<Snapshot>();
  const [dictionaryReady, setDictionaryReady] = useState(!uid);
  const [dictionaryConnected, setDictionaryConnected] = useState(false);
  const [contextsReady, setContextsReady] = useState(!uid);
  const [contextsConnected, setContextsConnected] = useState(false);
  const contextsLoaded = useRef(!uid);
  const current = useRef<Snapshot | undefined>(undefined);
  const ready = useRef(!uid);
  const active = useRef(true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const scope = `conversations-v2:${firebaseScope}:${uid ?? "guest"}`;
  function publish(next: Snapshot) {
    current.current = next;
    if (active.current) setData(next);
  }
  useEffect(() => {
    active.current = true;
    let unsubscribe: (() => void) | undefined;
    let unsubscribeContexts: (() => void) | undefined;
    void (async () => {
      const saved = await repository.load(scope);
      if (!active.current) return;
      // A returning learner starts on a clean page; the sample for a guest is left as it is.
      publish({ ...(saved ? freshStart(saved.snapshot) : initialSnapshot(!uid)), entries: [] });
      if (!uid) return;
      unsubscribeContexts = watchSavedConversations(
        uid,
        (savedConversations, connected) => {
          if (!active.current) return;
          setContextsConnected(connected);
          if (!contextsLoaded.current && !connected) return;
          contextsLoaded.current = true;
          setContextsReady(true);
          publish({ ...current.current!, savedConversations });
        },
        (error) => {
          if (active.current) {
            setContextsConnected(false);
            report(error.message);
          }
        },
      );
      unsubscribe = watchDictionary(
        uid,
        (entries, connected) => {
          if (!active.current) return;
          setDictionaryConnected(connected);
          // An initial empty memory cache is not an empty cloud dictionary.
          if (!ready.current && !connected) return;
          ready.current = true;
          setDictionaryReady(true);
          publish({ ...current.current!, entries });
        },
        (error) => {
          if (active.current) {
            setDictionaryConnected(false);
            report(error.message);
          }
        },
      );
    })().catch((error) => {
      if (active.current) report(`Could not open your data: ${error.message}`);
    });
    return () => {
      active.current = false;
      unsubscribe?.();
      unsubscribeContexts?.();
      current.current = undefined;
    };
  }, [scope, uid, report]);

  function mutate(change: (previous: Snapshot) => Snapshot) {
    const task = queue.current
      .catch(() => {})
      .then(async () => {
        if (!active.current || !current.current)
          throw new Error("The account has changed. Please try again.");
        const previous = current.current;
        const next = snapshotSchema.parse(change(previous));
        const changes = dictionaryChanges(previous.entries, next.entries);
        const contexts = conversationChanges(
          previous.savedConversations,
          next.savedConversations,
        );
        if (changes.length || contexts.length) {
          if (!uid)
            throw new Error("Sign in to save words to your dictionary.");
          if (!ready.current || !contextsLoaded.current)
            throw new Error(
              "Your saved data is still loading. Check your connection and try again.",
            );
          await commitDictionary(uid, changes, contexts);
        }
        if (!active.current || !current.current) return;
        // Persist conversations and preferences only. No dictionary entries on disk.
        if (
          JSON.stringify({
            ...previous,
            entries: [],
            savedConversations: [],
          }) !==
          JSON.stringify({ ...next, entries: [], savedConversations: [] })
        )
          await repository.save(scope, { ...next, entries: [] });
        if (!active.current || !current.current) return;
        // The live Firebase snapshot is authoritative, including concurrent edits.
        // A successful commit is acknowledged before publishing; there is no offline queue.
        // Apply only our changes to preserve unrelated live updates while the request ran.
        const entries = new Map(
          current.current.entries.map((entry) => [entry.id, entry]),
        );
        for (const change of changes) {
          if (change.entry)
            entries.set(change.id, {
              ...change.entry,
              conversationIds: [
                ...new Set([
                  ...(entries.get(change.id)?.conversationIds ?? []),
                  ...change.entry.conversationIds,
                ]),
              ],
            });
          else entries.delete(change.id);
        }
        const saved = new Map(
          current.current.savedConversations.map((context) => [
            context.id,
            context,
          ]),
        );
        for (const change of contexts) saved.set(change.id, change.context);
        publish({
          ...next,
          entries: [...entries.values()],
          savedConversations: [...saved.values()],
        });
      });
    queue.current = task;
    return task;
  }
  return {
    data,
    mutate,
    dictionaryReady,
    dictionaryConnected,
    contextsReady,
    savedDataConnected: dictionaryConnected && contextsConnected,
  };
}

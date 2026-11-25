import { useCallback, useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestoreFields } from "../core/cloudDictionary";
import { localDay } from "../core/domain";
import { dayTallySchema, type DayTally } from "../core/streaks";
import { commit } from "./dictionary";
import { firebase } from "./firebase";

// The learner's daily tallies, kept in Firebase so a streak survives a new
// phone. For now a day's tally holds one thing: turns spoken to the partner.
export function useDays(uid: string | undefined, report: (message: string) => void) {
  const [tallies, setTallies] = useState<DayTally[]>([]);
  // Turns counted here that the server has not shown back yet, so that
  // several in quick succession are not lost to each other.
  const counted = useRef<Record<string, number>>({});
  const latest = useRef<DayTally[]>([]);
  latest.current = tallies;
  useEffect(() => {
    setTallies([]);
    counted.current = {};
    if (!uid || !firebase) return;
    return onSnapshot(
      collection(firebase.db, "users", uid, "days"),
      (snapshot) =>
        setTallies(snapshot.docs.flatMap((doc) => {
          const parsed = dayTallySchema.safeParse({ ...doc.data(), day: doc.id });
          if (!parsed.success) return [];
          const local = counted.current[parsed.data.day] ?? 0;
          return [local > parsed.data.spokenTurns ? { ...parsed.data, spokenTurns: local } : parsed.data];
        })),
      (error) => report(error.message),
    );
  }, [uid, report]);
  // Count one turn the learner spoke aloud. Best effort: it never holds up the conversation.
  const addSpokenTurn = useCallback(() => {
    if (!uid || uid.includes("/")) return;
    const day = localDay();
    const known = Math.max(counted.current[day] ?? 0, latest.current.find((tally) => tally.day === day)?.spokenTurns ?? 0);
    const tally: DayTally = { day, spokenTurns: known + 1, updatedAt: new Date().toISOString() };
    counted.current[day] = tally.spokenTurns;
    setTallies((previous) => [...previous.filter((item) => item.day !== day), tally]);
    void commit(uid, (database) => [{ update: { name: `${database}/documents/users/${uid}/days/${day}`, fields: firestoreFields(tally) } }]).catch(() => {});
  }, [uid]);
  return { tallies, addSpokenTurn };
}

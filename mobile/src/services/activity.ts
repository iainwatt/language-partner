import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestoreFields } from "../core/cloudDictionary";
import { activitySchema, shortestActivity, type Activity } from "../core/activity";
import { id } from "../core/domain";
import { commit } from "./dictionary";
import { firebase } from "./firebase";

// The learner's log of time watching videos and recording themselves.
export function useActivity(uid: string | undefined, report: (message: string) => void) {
  const [activity, setActivity] = useState<Activity[]>([]);
  useEffect(() => {
    setActivity([]);
    if (!uid || !firebase) return;
    return onSnapshot(
      collection(firebase.db, "users", uid, "activity"),
      (snapshot) =>
        setActivity(snapshot.docs.flatMap((doc) => {
          const parsed = activitySchema.safeParse({ ...doc.data(), id: doc.id });
          return parsed.success ? [parsed.data] : [];
        })),
      (error) => report(error.message),
    );
  }, [uid, report]);
  return activity;
}

// A sitting too short to be practice is not logged, and that is not a
// failure. One that should have been logged and was not is reported: a
// recording that never reaches the stats would otherwise go missing in silence.
export async function logActivity(uid: string | undefined, input: Omit<Activity, "id" | "createdAt">) {
  if (!(input.durationMs >= shortestActivity)) return;
  if (!uid || uid.includes("/")) throw new Error("You are not signed in.");
  const record = activitySchema.parse({ ...input, durationMs: Math.round(input.durationMs), id: id(), createdAt: new Date().toISOString() });
  await commit(uid, (database) => [{
    update: { name: `${database}/documents/users/${uid}/activity/${record.id}`, fields: firestoreFields(record) },
    currentDocument: { exists: false },
  }]);
}

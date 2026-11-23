import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestoreFields } from "../core/cloudDictionary";
import { readingSchema, type Reading } from "../core/reading";
import { commit } from "./dictionary";
import { firebase } from "./firebase";

// The learner's live readings, newest first. They are a log: written once, never changed.
export function useReadings(uid: string | undefined, report: (message: string) => void) {
  const [readings, setReadings] = useState<Reading[]>([]);
  useEffect(() => {
    setReadings([]);
    if (!uid || !firebase) return;
    return onSnapshot(
      collection(firebase.db, "users", uid, "readings"),
      (snapshot) =>
        setReadings(
          snapshot.docs
            .flatMap((doc) => {
              const parsed = readingSchema.safeParse({ ...doc.data(), id: doc.id });
              return parsed.success ? [parsed.data] : [];
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      (error) => report(error.message),
    );
  }, [uid, report]);
  return readings;
}

export async function saveReading(uid: string, input: Reading) {
  if (!uid || uid.includes("/")) throw new Error("Sign in to keep your live readings.");
  const reading = readingSchema.parse(input);
  await commit(uid, (database) => [{
    update: { name: `${database}/documents/users/${uid}/readings/${reading.id}`, fields: firestoreFields(reading) },
    // A reading is logged once; this refuses to overwrite one.
    currentDocument: { exists: false },
  }]);
}

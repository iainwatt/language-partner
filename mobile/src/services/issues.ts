import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { issueSchema, issueWrite, type Issue } from "../core/issues";
import { commit } from "./dictionary";
import { firebase } from "./firebase";

// The signed-in learner's "things to work on", live from their account.
export function useIssues(uid: string | undefined, report: (message: string) => void) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setIssues([]);
    setReady(false);
    if (!uid || !firebase) return;
    return onSnapshot(
      collection(firebase.db, "users", uid, "issues"),
      { includeMetadataChanges: true },
      (snapshot) => {
        // An empty local cache is not an empty account.
        if (snapshot.metadata.fromCache && snapshot.empty) return;
        setIssues(
          snapshot.docs.flatMap((doc) => {
            const parsed = issueSchema.safeParse({ ...doc.data(), id: doc.id });
            return parsed.success ? [parsed.data] : [];
          }),
        );
        setReady(true);
      },
      (error) => report(error.message),
    );
  }, [uid, report]);
  return {
    issues,
    ready,
    save: (issue: Issue) => commit(uid ?? "", (database) => [issueWrite(database, uid ?? "", issue)]),
    remove: (issueId: string) => commit(uid ?? "", (database) => [issueWrite(database, uid ?? "", { delete: issueId })]),
  };
}

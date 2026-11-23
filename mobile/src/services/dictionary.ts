import { collection, onSnapshot } from "firebase/firestore";
import {
  cloudEntrySchema,
  commitWrites,
  type DictionaryChange,
  type ConversationChange,
} from "../core/cloudDictionary";
import {
  savedConversationSchema,
  type Entry,
  type SavedConversation,
} from "../core/domain";
import { emulatorHost, firebase } from "./firebase";

function account(uid: string) {
  if (!firebase || firebase.auth.currentUser?.uid !== uid)
    throw new Error("Sign in to your Language Partner account first.");
  return firebase;
}
export function watchDictionary(
  uid: string,
  next: (entries: Entry[], connected: boolean) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    collection(account(uid).db, "users", uid, "dictionary"),
    { includeMetadataChanges: true },
    (snapshot) => {
      try {
        const entries = snapshot.docs.map((doc) =>
          cloudEntrySchema.parse({ ...doc.data(), id: doc.id }),
        );
        entries.sort(
          (a, b) =>
            b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
        );
        next(entries, !snapshot.metadata.fromCache);
      } catch {
        fail(
          new Error(
            "A saved dictionary entry could not be read. Your Firebase data has not been changed.",
          ),
        );
      }
    },
    fail,
  );
}
export async function commitDictionary(
  uid: string,
  changes: DictionaryChange[],
  contexts: ConversationChange[] = [],
) {
  if (!changes.length && !contexts.length) return;
  await commit(uid, (database) => commitWrites(database, uid, changes, contexts));
}
// One authenticated Firestore commit for this account's own documents.
export async function commit(uid: string, build: (database: string) => object[]) {
  const client = account(uid);
  const database = `projects/${client.app.options.projectId}/databases/(default)`;
  const origin = emulatorHost
    ? `http://${emulatorHost}:8180`
    : "https://firestore.googleapis.com";
  // Direct authenticated commits have no offline write queue or disk cache.
  // Firebase ID tokens keep these writes subject to Firestore security rules.
  const writes = build(database);
  if (writes.length > 400) throw new Error("Save fewer changes at once.");
  {
    const token = await account(uid).auth.currentUser!.getIdToken();
    account(uid);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let response: Response;
    try {
      response = await fetch(`${origin}/v1/${database}/documents:commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          writes,
        }),
        signal: controller.signal,
      });
    } catch {
      throw new Error(
        "Could not confirm the Firebase save. Check your connection and saved data before trying again.",
      );
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw new Error(
          "Firebase denied this save. Sign in again and check account permissions.",
        );
      throw new Error(
        "Firebase could not save your changes. Please try again.",
      );
    }
  }
}

export function watchSavedConversations(
  uid: string,
  next: (contexts: SavedConversation[], connected: boolean) => void,
  fail: (error: Error) => void,
) {
  return onSnapshot(
    collection(account(uid).db, "users", uid, "savedConversations"),
    { includeMetadataChanges: true },
    (snapshot) => {
      try {
        next(
          snapshot.docs
            .map((doc) =>
              savedConversationSchema.parse({ ...doc.data(), id: doc.id }),
            )
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
          !snapshot.metadata.fromCache,
        );
      } catch {
        fail(
          new Error(
            "A saved conversation could not be read. Your Firebase data has not been changed.",
          ),
        );
      }
    },
    fail,
  );
}

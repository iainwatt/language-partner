import { collection, onSnapshot } from "firebase/firestore";
import { grammarTopicSchema, type GrammarTopic } from "../core/grammar";
import { firebase } from "./firebase";

export function watchGrammarTopics(
  language: string,
  next: (topics: GrammarTopic[], connected: boolean) => void,
  fail: (error: Error) => void,
) {
  if (!firebase?.auth.currentUser)
    throw new Error("Sign in to load grammar lessons.");
  return onSnapshot(
    collection(firebase.db, "grammar", language, "topics"),
    { includeMetadataChanges: true },
    (snapshot) => {
      try {
        const topics = snapshot.docs
          .map((document) => {
            const data = document.data();
            return grammarTopicSchema.parse({
              ...data,
              id: document.id,
              language,
              reminder: data.reminder ?? data.description,
            });
          })
          .sort(
            (a, b) =>
              a.order - b.order ||
              a.title.localeCompare(b.title) ||
              a.id.localeCompare(b.id),
          );
        next(topics, !snapshot.metadata.fromCache);
      } catch {
        fail(
          new Error(
            "A grammar topic could not be read. The lesson data has not been changed.",
          ),
        );
      }
    },
    fail,
  );
}

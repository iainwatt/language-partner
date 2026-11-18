import {
  entrySchema,
  savedConversationSchema,
  type Entry,
  type SavedConversation,
} from "./domain";

// Keep only the chosen short example; legacy full transcripts and offsets are discarded.
export const cloudEntrySchema = entrySchema.omit({
  context: true,
  conversationId: true,
  messageId: true,
  start: true,
  end: true,
});
export const cloudEntry = (entry: Entry) => cloudEntrySchema.parse(entry);
export type DictionaryChange = {
  id: string;
  entry: Entry | null;
  exampleChanged?: boolean;
};
export type ConversationChange = { id: string; context: SavedConversation };
export function conversationChanges(
  before: SavedConversation[],
  after: SavedConversation[],
): ConversationChange[] {
  const old = new Map(
    before.map((context) => [context.id, JSON.stringify(context)]),
  );
  return after
    .filter((context) => old.get(context.id) !== JSON.stringify(context))
    .map((context) => ({ id: context.id, context }));
}
export function dictionaryChanges(
  before: Entry[],
  after: Entry[],
): DictionaryChange[] {
  const old = new Map(before.map((e) => [e.id, JSON.stringify(cloudEntry(e))]));
  const next = new Set(after.map((e) => e.id));
  return [
    ...after
      .filter((e) => old.get(e.id) !== JSON.stringify(cloudEntry(e)))
      .map((e) => ({
        id: e.id,
        entry: cloudEntry(e),
        exampleChanged:
          JSON.stringify(before.find((old) => old.id === e.id)?.example) !==
          JSON.stringify(e.example),
      })),
    ...before
      .filter((e) => !next.has(e.id))
      .map((e) => ({ id: e.id, entry: null })),
  ];
}
type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { arrayValue: { values: FirestoreValue[] } }
  | { mapValue: { fields: Record<string, FirestoreValue> } };
export function firestoreValue(value: unknown): FirestoreValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number" && Number.isSafeInteger(value))
    return { integerValue: String(value) };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(firestoreValue) } };
  if (value && typeof value === "object")
    return { mapValue: { fields: firestoreFields(value) } };
  throw new Error("Unsupported dictionary value.");
}
export function firestoreFields(value: object): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([key, v]) => [key, firestoreValue(v)]),
  );
}
export function commitWrites(
  database: string,
  uid: string,
  changes: DictionaryChange[],
  contexts: ConversationChange[] = [],
) {
  if (!uid || uid.includes("/")) throw new Error("Invalid account.");
  const words = changes.map((change) => {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(change.id))
      throw new Error("Invalid dictionary entry ID.");
    const name = `${database}/documents/users/${uid}/dictionary/${change.id}`;
    if (!change.entry) return { delete: name };
    const { conversationIds, ...entry } = cloudEntry(change.entry);
    if (change.exampleChanged === false) delete entry.example;
    return {
      update: { name, fields: firestoreFields(entry) },
      // An absent example in an explicit entry edit removes the old example.
      updateMask: {
        fieldPaths: [
          ...new Set([
            ...Object.keys(entry),
            ...(change.exampleChanged === false ? [] : ["example"]),
          ]),
        ],
      },
      // Linking the same word in concurrent chats must keep both links.
      updateTransforms: [
        {
          fieldPath: "conversationIds",
          appendMissingElements: {
            values: conversationIds.map(firestoreValue),
          },
        },
      ],
    };
  });
  const saved = contexts.map(({ id, context }) => {
    const parsed = savedConversationSchema.parse(context);
    if (id !== parsed.id) throw new Error("Invalid saved conversation ID.");
    return {
      update: {
        name: `${database}/documents/users/${uid}/savedConversations/${parsed.id}`,
        fields: firestoreFields(parsed),
      },
    };
  });
  return [...words, ...saved];
}

import { languageName, languages, makeConversation, type Snapshot, type Conversation } from "./domain";

export function conversationTitle(conversation: Conversation): string {
  const saved = conversation.title.trim();
  if (
    saved &&
    saved !== `${languageName(conversation.target)} conversation` &&
    saved !== "New conversation"
  )
    return saved;
  const firstTurn = conversation.messages.find(
    (message) => message.role === "user" && message.text.trim(),
  );
  const text = firstTurn?.text.replace(/\s+/g, " ").trim();
  if (!text) return "New conversation";
  const characters = Array.from(text);
  return characters.length > 58 ? `${characters.slice(0, 57).join("")}…` : text;
}

export function recentConversations(
  conversations: Conversation[],
): Conversation[] {
  const activity = (conversation: Conversation) =>
    Date.parse(
      conversation.messages.at(-1)?.createdAt ?? conversation.createdAt,
    ) || 0;
  return [...conversations].sort((a, b) => activity(b) - activity(a));
}

export function recentConversationThreads(
  conversations: Conversation[],
  savedConversationIds: Iterable<string>,
): Conversation[] {
  const saved = new Set(savedConversationIds);
  const seen = new Set<string>();
  const result: Conversation[] = [];
  for (const conversation of recentConversations(conversations)) {
    const key = conversation.practiceOf ?? conversation.id;
    if (!saved.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(conversation);
  }
  return result;
}

// Apply a language choice and its new conversation in one persisted update.
export function startLanguageConversation(snapshot: Snapshot, native: string, target: string): Snapshot {
  if (![native, target].every((code) => languages.some((language) => language.code === code)))
    throw new Error("Choose a supported language.");
  if (native === target) throw new Error("Choose different native and practice languages.");
  const conversation = makeConversation(native, target, false);
  return {
    ...snapshot,
    settings: { ...snapshot.settings, native, target },
    activeConversationId: conversation.id,
    conversations: [conversation, ...snapshot.conversations],
  };
}

// Each practice language keeps its own conversations, saved words and saved
// conversations. The language shown is that of the active conversation.
export function languageView(snapshot: Snapshot): Snapshot {
  const active =
    snapshot.conversations.find((chat) => chat.id === snapshot.activeConversationId) ??
    snapshot.conversations[0];
  const target = active?.target ?? snapshot.settings.target;
  return {
    ...snapshot,
    conversations: snapshot.conversations.filter((chat) => chat.target === target),
    entries: snapshot.entries.filter((entry) => entry.target === target),
    savedConversations: snapshot.savedConversations.filter((context) => context.target === target),
  };
}

// Opening the app starts on a clean page, not in the middle of whichever
// conversation was open last: an empty ordinary chat in the same languages.
// One that already exists is reused, so empty chats do not pile up.
export function freshStart(snapshot: Snapshot): Snapshot {
  const active = snapshot.conversations.find((chat) => chat.id === snapshot.activeConversationId);
  const native = active?.native ?? snapshot.settings.native;
  const target = active?.target ?? snapshot.settings.target;
  const blank = (chat: Conversation) =>
    !chat.messages.length && !chat.practiceOf && !chat.grammar && !chat.roleplay && !chat.video && chat.native === native && chat.target === target;
  if (active && blank(active)) return snapshot;
  const existing = snapshot.conversations.find(blank);
  if (existing) return { ...snapshot, activeConversationId: existing.id };
  const conversation = makeConversation(native, target, false);
  return { ...snapshot, activeConversationId: conversation.id, conversations: [conversation, ...snapshot.conversations] };
}

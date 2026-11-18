import { z } from "zod";
import {
  languageName,
  makeConversation,
  savedConversationSchema,
  type Conversation,
  type Entry,
  type SavedConversation,
} from "./domain";
import { conversationTitle } from "./conversations";

export const contextId = (conversation: Conversation) =>
  conversation.practiceOf ?? conversation.id;
export const contextEntries = (entries: Entry[], id: string) =>
  entries.filter((entry) => entry.conversationIds.includes(id));

export function saveConversationContext(
  conversation: Conversation,
  now = new Date(),
): SavedConversation {
  return savedConversationSchema.parse({
    id: contextId(conversation),
    title: conversationTitle(conversation).slice(0, 160),
    description: "",
    summary: "",
    native: conversation.native,
    target: conversation.target,
    createdAt: conversation.createdAt,
    updatedAt: now.toISOString(),
  });
}

const nativeDefaults: Record<string, { title: string; description: string }> = {
  "en-US": {
    title: "New conversation",
    description: "Conversation practice to revisit.",
  },
  "ru-RU": {
    title: "Новый разговор",
    description: "Практика разговора, к которой можно вернуться.",
  },
  "es-ES": {
    title: "Nueva conversación",
    description: "Práctica de conversación para repasar.",
  },
  "fr-FR": {
    title: "Nouvelle conversation",
    description: "Pratique de conversation à revoir.",
  },
  "de-DE": {
    title: "Neues Gespräch",
    description: "Gesprächsübung zum Wiederholen.",
  },
  "it-IT": {
    title: "Nuova conversazione",
    description: "Pratica di conversazione da ripassare.",
  },
  "pt-BR": {
    title: "Nova conversa",
    description: "Prática de conversa para revisar.",
  },
  "ja-JP": {
    title: "新しい会話",
    description: "あとで復習する会話練習。",
  },
};
const conversationDefaults = (native: string, target: string) =>
  nativeDefaults[native] ?? {
    title: "New conversation",
    description: `Conversation practice in ${languageName(target)}.`,
  };
const clean = (text: string) => text.replace(/\s+/g, " ").trim();
const truncate = (text: string, max: number) => {
  const characters = Array.from(clean(text));
  return characters.length > max
    ? `${characters.slice(0, max - 1).join("")}…`
    : characters.join("");
};
const firstSentence = (text: string) => {
  const value = clean(text);
  const end = value.search(/[.!?。！？]/u);
  return end >= 0 ? value.slice(0, end + 1) : value;
};
export function draftConversationContext(
  conversation: Conversation,
  summary = "",
  now = new Date(),
): SavedConversation {
  const base = saveConversationContext(conversation, now);
  const defaults = conversationDefaults(conversation.native, conversation.target);
  const messages = conversation.messages.filter(
    (message) => message.final && message.text.trim(),
  );
  const summaryText = truncate(summary, 6000);
  const title = truncate(
    firstSentence(summaryText) || defaults.title,
    160,
  );
  const description = truncate(
    firstSentence(summaryText) || defaults.description,
    2000,
  );
  return savedConversationSchema.parse({
    ...base,
    title,
    description,
    summary: summaryText,
    summarySourceMessageId: summary
      ? (messages.at(-1)?.id ?? base.summarySourceMessageId)
      : base.summarySourceMessageId,
  });
}

export function makePracticeConversation(
  context: SavedConversation,
): Conversation {
  return {
    ...makeConversation(context.native, context.target, false),
    title: context.title,
    practiceOf: context.id,
  };
}

// Send the topic every turn, independently of the rolling chat history.
export const practiceContextSchema = savedConversationSchema
  .pick({
    title: true,
    description: true,
    summary: true,
  })
  .extend({
    words: z
      .array(
        z.object({
          phrase: z.string().min(1).max(80000),
          meaning: z.string().min(1).max(80000),
        }),
      )
      .max(200),
  });
export type PracticeContext = z.infer<typeof practiceContextSchema>;
export function practiceContext(
  context: SavedConversation,
  entries: Entry[],
): PracticeContext {
  const words = contextEntries(entries, context.id).map(
    ({ phrase, meaning }) => ({ phrase, meaning }),
  );
  if (words.length > 200 || JSON.stringify(words).length > 60000)
    throw new Error(
      "This topic has too much vocabulary for one practice chat. Use word review instead.",
    );
  return practiceContextSchema.parse({ ...context, words });
}

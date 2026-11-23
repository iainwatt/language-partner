import { roleplayPracticeSchema } from "./roleplayTypes";
import { z } from "zod";

export const languages = [
  { code: "en-US", name: "English", short: "EN" },
  { code: "ru-RU", name: "Русский", short: "RU" },
  { code: "es-ES", name: "Español", short: "ES" },
  { code: "fr-FR", name: "Français", short: "FR" },
  { code: "de-DE", name: "Deutsch", short: "DE" },
  { code: "it-IT", name: "Italiano", short: "IT" },
  { code: "pt-BR", name: "Português", short: "PT" },
  { code: "ja-JP", name: "日本語", short: "JA" },
] as const;
export const languageName = (code: string) =>
  languages.find((l) => l.code === code)?.name ?? code;
export const providerSchema = z.enum(["openai", "claude", "gemini"]);
export type Provider = z.infer<typeof providerSchema>;
export const providers: Record<
  Provider,
  { name: string; models: string[]; note: string; source: string }
> = {
  openai: {
    name: "OpenAI",
    models: ["gpt-5.4-mini", "gpt-5.4"],
    note: "No public ChatGPT subscription login for this app was established. API access is separate.",
    source: "https://developers.openai.com/api/docs/guides/realtime-webrtc",
  },
  claude: {
    name: "Claude",
    models: ["claude-sonnet-5", "claude-haiku-4-5-20251001"],
    note: "Some personal Agent SDK subscription use is documented. Product login permission and a mobile flow for this app are not established; developer guidance requires API authentication.",
    source:
      "https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account",
  },
  gemini: {
    name: "Gemini",
    models: ["gemini-3.8-flash", "gemini-2.5-flash"],
    note: "Google OAuth for the Gemini API exists, but does not establish access to your Gemini consumer subscription.",
    source: "https://ai.google.dev/gemini-api/docs/oauth",
  },
};
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  text: z.string().max(80000),
  final: z.boolean(),
  createdAt: z.string(),
  provider: providerSchema.optional(),
  // On a partner's message: its corrections of the learner's turn, shown as a block.
  corrections: z.string().max(4000).optional(),
  // On a partner's message: what the learner meant in the turn it answers, in
  // their own language. Never shown; the conversation script is written from these.
  meant: z.string().max(2000).optional(),
});
export type Message = z.infer<typeof messageSchema>;
export const documentIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/);
export const savedConversationSchema = z.object({
  id: documentIdSchema,
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000),
  summary: z.string().max(6000),
  summarySourceMessageId: z.string().max(128).default(""),
  // Step one: what the learner said, as one blurb in their own language, and
  // the message it was written up to. Step two: that outline as a script to
  // read aloud in the language being learned.
  outline: z.string().max(12000).optional(),
  outlineSourceMessageId: z.string().max(128).optional(),
  // What the learner said, listed point by point: the source for later changes to the outline.
  outlinePoints: z.string().max(20000).optional(),
  script: z.string().max(16000).optional(),
  // What the script's saved words mean where they stand, for practising with
  // them shown in the learner's own language. Filled the first time it is needed.
  scriptMeanings: z.array(z.object({ text: z.string().max(300), meaning: z.string().max(300) })).max(200).optional(),
  native: z.string(),
  target: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedConversation = z.infer<typeof savedConversationSchema>;
const conversationGrammarSchema = z
  .object({
    id: documentIdSchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(2000),
    reminder: z.string().trim().min(1).max(2000).optional(),
    prompt: z.string().trim().min(1).max(10000),
    openingPrompt: z.string().trim().min(1).max(240).optional(),
    openingTranslation: z.string().trim().min(1).max(240).optional(),
  })
  .transform((grammar) => ({
    ...grammar,
    reminder: grammar.reminder ?? grammar.description,
  }));

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  native: z.string(),
  target: z.string(),
  createdAt: z.string(),
  messages: z.array(messageSchema),
  practiceOf: documentIdSchema.optional(),
  grammar: conversationGrammarSchema.optional(),
  roleplay: roleplayPracticeSchema.optional(),
  // The one discussion of a "Watch and repeat" video. Its words are those saved from the video.
  video: z.object({ youtubeId: z.string().regex(/^[A-Za-z0-9_-]{6,20}$/), title: z.string().max(200) }).optional(),
});
export type Conversation = z.infer<typeof conversationSchema>;
export const gradeSchema = z.enum(["again", "hard", "good", "easy"]);
export type Grade = z.infer<typeof gradeSchema>;
export const exampleSchema = z.object({
  text: z.string().trim().min(1).max(600),
  translation: z.string().trim().min(1).max(2000),
});
export type PhraseExample = z.infer<typeof exampleSchema>;
export const entrySchema = z.object({
  id: z.string(),
  phrase: z.string().min(1).max(80000),
  meaning: z.string().min(1).max(80000),
  example: exampleSchema.optional(),
  native: z.string(),
  target: z.string(),
  context: z.string().optional(),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  start: z.number().int().optional(),
  end: z.number().int().optional(),
  conversationIds: z.array(documentIdSchema).max(500).default([]),
  // A more natural way to say the phrase, found by a review after it was
  // saved. It waits here until the learner accepts or dismisses it.
  suggestion: z.object({ phrase: z.string().trim().min(1).max(600), reason: z.string().max(600) }).optional(),
  // Set once the phrase has been through that review, so it is not checked twice.
  reviewed: z.boolean().optional(),
  createdAt: z.string(),
  due: date,
  interval: z.number().int().min(0),
  repetitions: z.number().int().min(0),
  history: z.array(
    z.object({
      at: z.string(),
      grade: gradeSchema,
      interval: z.number().int(),
      due: date,
    }),
  ),
});
export type Entry = z.infer<typeof entrySchema>;
export type DictionaryInput = Pick<
  Entry,
  "phrase" | "meaning" | "native" | "target" | "example"
> & { conversationId?: string };
export const settingsSchema = z.object({
  native: z.string(),
  target: z.string(),
  provider: providerSchema,
  model: z.string(),
  mode: z.enum(["demo", "api"]),
  autoSpeak: z.boolean(),
  partnerModels: z.partialRecord(providerSchema, z.string()).optional(),
  // The learner's own choice per practice language; absent means the script-based default.
  translateReplies: z.record(z.string(), z.boolean()).optional(),
  // Whether the learner speaks as a man or a woman, which many languages need
  // to get first-person forms right. The partner asks in the first chat.
  speaker: z.enum(["male", "female"]).optional(),
  // Words a minute at which a script scrolls in practice mode.
  readingSpeed: z.number().int().min(20).max(300).optional(),
});
export type Settings = z.infer<typeof settingsSchema>;
const writingSystems: Record<string, string> = { ru: "cyrillic", ja: "japanese" };
const writingSystem = (code: string) => writingSystems[code.split("-")[0]] ?? "latin";
// Translations under the partner's lines default to on only when the learner
// cannot read the practice language's script from their own.
export const translatesReplies = (
  settings: Pick<Settings, "native" | "target" | "translateReplies">,
) =>
  settings.translateReplies?.[settings.target] ??
  writingSystem(settings.native) !== writingSystem(settings.target);
// Monotonic, per-install counters make offline retries safe without an event queue.
export const practiceCounterSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),
  openai: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  claude: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  gemini: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export type PracticeCounter = z.infer<typeof practiceCounterSchema>;
export const statsSchema = z
  .object({
    talkTimeMs: z.number().int().min(0).default(0),
    talkTimeByDay: z
      .record(date, z.number().int().min(0))
      .default({}),
    // All-time totals per practice language. Time recorded before this field existed has no language.
    talkTimeByLanguage: z.record(z.string(), z.number().int().min(0)).optional(),
  })
  .default({ talkTimeMs: 0, talkTimeByDay: {} });
export type Stats = z.infer<typeof statsSchema>;
export const snapshotSchema = z.object({
  version: z.literal(1),
  settings: settingsSchema,
  conversations: z.array(conversationSchema),
  activeConversationId: z.string(),
  entries: z.array(entrySchema),
  savedConversations: z.array(savedConversationSchema).default([]),
  stats: statsSchema,
  partnerPractice: practiceCounterSchema.optional(),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const id = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
export function localDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const value = new Date(y, m - 1, d, 12);
  value.setDate(value.getDate() + days);
  return localDay(value);
}
export function review(entry: Entry, grade: Grade, now = new Date()): Entry {
  const interval =
    grade === "again"
      ? 1
      : grade === "hard"
        ? Math.max(1, Math.floor(entry.interval * 0.6))
        : grade === "good"
          ? Math.max(3, Math.ceil(entry.interval * 2))
          : Math.max(5, Math.ceil(entry.interval * 3));
  const due = addDays(localDay(now), interval);
  return {
    ...entry,
    interval,
    due,
    repetitions: entry.repetitions + 1,
    history: [
      ...entry.history,
      { at: now.toISOString(), grade, interval, due },
    ],
  };
}
export function selectedSpan(
  message: Message,
  start: number,
  end: number,
): string {
  if (!message.final)
    throw new Error("Wait for a final transcript before selecting.");
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end > message.text.length ||
    end <= start
  )
    throw new Error("Select a word or phrase first.");
  const splitsSurrogate = (n: number) =>
    n > 0 &&
    n < message.text.length &&
    /[\uD800-\uDBFF]/.test(message.text[n - 1]) &&
    /[\uDC00-\uDFFF]/.test(message.text[n]);
  if (splitsSurrogate(start) || splitsSurrogate(end))
    throw new Error("Select the complete character.");
  const result = message.text.slice(start, end);
  if (!result.trim()) throw new Error("Select a word or phrase first.");
  return result;
}
export const duplicateKey = (
  entry: Pick<Entry, "phrase" | "native" | "target">,
) =>
  `${entry.target}|${entry.native}|${entry.phrase.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase()}`;
export function saveEntry(
  entries: Entry[],
  input: DictionaryInput,
  now = new Date(),
) {
  const duplicate = entries.find(
    (e) => duplicateKey(e) === duplicateKey(input),
  );
  if (duplicate) {
    const linked = input.conversationId
      ? linkEntry(duplicate, input.conversationId)
      : duplicate;
    // An explicitly saved new example replaces the previous one; a plain save preserves it.
    const entry = input.example
      ? entrySchema.parse({ ...linked, example: input.example })
      : linked;
    return {
      entries: entries.map((old) => (old.id === entry.id ? entry : old)),
      entry,
      duplicate: true,
    };
  }
  const entry: Entry = entrySchema.parse({
    phrase: input.phrase,
    meaning: input.meaning,
    ...(input.example ? { example: input.example } : {}),
    native: input.native,
    target: input.target,
    id: id(),
    createdAt: now.toISOString(),
    due: addDays(localDay(now), 1),
    interval: 0,
    repetitions: 0,
    history: [],
    conversationIds: input.conversationId ? [input.conversationId] : [],
  });
  return { entries: [entry, ...entries], entry, duplicate: false };
}
// Phrases still waiting for the naturalness review, oldest first.
export const unreviewed = (entries: Entry[]) =>
  entries.filter((entry) => !entry.reviewed && !entry.suggestion).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
// Record a review's result on its entry: checked, with a suggestion if there was one.
export const markReviewed = (entries: Entry[], id: string, suggestion?: Entry["suggestion"]) =>
  entries.map((entry) => (entry.id === id ? entrySchema.parse({ ...entry, reviewed: true, ...(suggestion ? { suggestion } : {}) }) : entry));
export function linkEntry(entry: Entry, conversationId: string): Entry {
  const ids = new Set([
    ...entry.conversationIds,
    documentIdSchema.parse(conversationId),
  ]);
  return entrySchema.parse({ ...entry, conversationIds: [...ids] });
}
export function makeConversation(
  native = "en-US",
  target = "ru-RU",
  demo = true,
): Conversation {
  return {
    id: id(),
    title:
      demo && target === "ru-RU"
        ? "Let's practise Russian"
        : demo && target === "es-ES"
          ? "A weekend in Madrid"
          : `${languageName(target)} conversation`,
    native,
    target,
    createdAt: new Date().toISOString(),
    messages:
      demo && target === "ru-RU"
        ? [
            {
              id: id(),
              role: "user",
              text: "Я учу русский язык.",
              final: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: id(),
              role: "assistant",
              text: "Привет! Давай практиковаться вместе.\n\nКак прошёл твой день? Можно начать так: «Сегодня я…»",
              final: true,
              createdAt: new Date().toISOString(),
            },
          ]
        : demo && target === "es-ES"
          ? [
              {
                id: id(),
                role: "user",
                text: "Voy a ir a Madrid este fin de semana.",
                final: true,
                createdAt: new Date().toISOString(),
              },
              {
                id: id(),
                role: "assistant",
                text: "¡Qué bien! Madrid tiene mucho que ofrecer. Puedes pasear por el Retiro, descubrir un café en Malasaña o visitar el Prado.\n\n¿Qué te apetece hacer allí?",
                final: true,
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
  };
}
export function initialSnapshot(demo = true): Snapshot {
  const conversation = makeConversation("en-US", "ru-RU", demo);
  return {
    version: 1,
    settings: {
      native: "en-US",
      target: "ru-RU",
      provider: "openai",
      model: providers.openai.models[0],
      mode: "demo",
      autoSpeak: true,
    },
    conversations: [conversation],
    activeConversationId: conversation.id,
    entries: [],
    savedConversations: [],
    stats: { talkTimeMs: 0, talkTimeByDay: {} },
  };
}

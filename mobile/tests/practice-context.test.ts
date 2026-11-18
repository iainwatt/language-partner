import test from "node:test";
import assert from "node:assert/strict";
import {
  initialSnapshot,
  entrySchema,
  review,
  saveEntry,
} from "../src/core/domain";
import {
  contextEntries,
  contextId,
  draftConversationContext,
  makePracticeConversation,
  practiceContext,
  saveConversationContext,
} from "../src/core/practiceContext";
import {
  commitWrites,
  conversationChanges,
  dictionaryChanges,
} from "../src/core/cloudDictionary";
import { Repository } from "../src/storage/repository";
import { executeLlm, llmRequestSchema } from "../server/llm";

const input = {
  phrase: "работать в команде",
  meaning: "to work in a team",
  native: "en-US",
  target: "ru-RU",
};

test("one phrase links to multiple conversations without resetting learning progress or duplicating it", () => {
  const first = saveEntry([], {
    ...input,
    conversationId: "original-chat",
  }).entry;
  const learned = review(first, "easy");
  const second = saveEntry([learned], {
    ...input,
    conversationId: "another-chat",
  });
  assert.equal(second.duplicate, true);
  assert.equal(second.entries.length, 1);
  assert.deepEqual(second.entry.conversationIds, [
    "original-chat",
    "another-chat",
  ]);
  assert.deepEqual(second.entry.history, learned.history);
  assert.equal(second.entry.due, learned.due);
  assert.equal(contextEntries(second.entries, "original-chat")[0].id, first.id);
  assert.deepEqual(contextEntries(second.entries, "unrelated"), []);
  assert.deepEqual(
    saveEntry(second.entries, { ...input, conversationId: "another-chat" })
      .entry,
    second.entry,
  );
  assert.throws(() =>
    saveEntry([], { ...input, conversationId: "../other-account" }),
  );
});

test("older words remain unlinked and repeat chats preserve the original topic without copying vocabulary", () => {
  const { conversationIds, ...legacy } = saveEntry([], input).entry;
  assert.deepEqual(entrySchema.parse(legacy).conversationIds, []);
  const original = initialSnapshot().conversations[0];
  const context = saveConversationContext(original);
  const first = makePracticeConversation(context),
    second = makePracticeConversation(context);
  assert.notEqual(first.id, second.id);
  assert.equal(contextId(first), original.id);
  assert.deepEqual(first.messages, []);
  assert.equal(original.messages.length, 2);
  const entries = saveEntry([], {
    ...input,
    conversationId: contextId(first),
  }).entries;
  assert.deepEqual(practiceContext(context, entries).words, [
    { phrase: input.phrase, meaning: input.meaning },
  ]);
});

test("dictionary and context save atomically with append-only conversation links", () => {
  const context = saveConversationContext(initialSnapshot().conversations[0]);
  const entries = saveEntry([], {
    ...input,
    conversationId: context.id,
  }).entries;
  const writes = commitWrites(
    "projects/test/databases/(default)",
    "account-a",
    dictionaryChanges([], entries),
    conversationChanges([], [context]),
  );
  assert.equal(writes.length, 2);
  assert.match(JSON.stringify(writes[0]), /appendMissingElements/);
  assert.match(
    JSON.stringify(writes[1]),
    /users\/account-a\/savedConversations/,
  );
  assert.equal(JSON.stringify(writes).includes("messages"), false);
});

test("conversation save drafts prefill editable topic details", () => {
  const conversation = initialSnapshot(false).conversations[0];
  conversation.messages = [
    {
      id: "m1",
      role: "user",
      text: "Давай поговорим о хороших сотрудниках.",
      final: true,
      createdAt: "2026-09-15T10:00:00Z",
    },
    {
      id: "m2",
      role: "assistant",
      text: "Мы обсудили уважение, ответственность и надежность.",
      final: true,
      createdAt: "2026-09-15T10:01:00Z",
    },
  ];
  const draft = draftConversationContext(
    conversation,
    "We discussed the qualities of a good employee.",
  );
  assert.equal(draft.id, conversation.id);
  assert.equal(draft.title, "We discussed the qualities of a good employee.");
  assert.equal(
    draft.description,
    "We discussed the qualities of a good employee.",
  );
  assert.equal(draft.summary, "We discussed the qualities of a good employee.");
  assert.equal(draft.summarySourceMessageId, "m2");
  const blank = draftConversationContext(initialSnapshot(false).conversations[0]);
  assert.equal(blank.title, "New conversation");
  assert.equal(blank.description, "Conversation practice to revisit.");
});

test("saved topic summaries and dictionary meanings never enter device storage", async () => {
  let raw = "";
  const repo = new Repository({
    async get() {
      return raw;
    },
    async set(_, value) {
      raw = value;
    },
  });
  const snapshot = initialSnapshot(false);
  const context = {
    ...saveConversationContext(snapshot.conversations[0]),
    summary: "Private topic recap",
  };
  snapshot.savedConversations = [context];
  snapshot.entries = saveEntry([], {
    ...input,
    conversationId: context.id,
  }).entries;
  snapshot.conversations.push(makePracticeConversation(context));
  await repo.save("account-a", snapshot);
  assert.equal(raw.includes(context.summary), false);
  assert.equal(raw.includes(input.meaning), false);
  const loaded = await repo.load("account-a");
  assert.deepEqual(loaded?.snapshot.entries, []);
  assert.deepEqual(loaded?.snapshot.savedConversations, []);
  assert.equal(loaded?.snapshot.conversations[1].practiceOf, context.id);
});

test("practice uses native-language recall prompts and summaries use the learner's native language", async () => {
  const settings = {
    ...initialSnapshot(false).settings,
    mode: "api" as const,
    native: "en-US" as const,
    target: "ru-RU" as const,
  };
  const messages = initialSnapshot().conversations[0].messages;
  const context = {
    ...saveConversationContext(initialSnapshot().conversations[0]),
    summary: "We discussed teamwork.",
  };
  const entries = saveEntry([], {
    ...input,
    conversationId: context.id,
  }).entries;
  const payloads: any[] = [];
  const transport: typeof fetch = async (_, options) => {
    payloads.push(JSON.parse(String(options?.body)));
    return Response.json({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: "We discussed teamwork and reliability.",
            },
          ],
        },
      ],
    });
  };
  const request = llmRequestSchema.parse({
    action: "generate",
    settings,
    messages,
    practice: practiceContext(context, entries),
  });
  assert.equal(request.action, "generate");
  if (request.action !== "generate") throw new Error("Unexpected action");
  await executeLlm(request, { openai: "test-only" }, transport);
  assert.match(
    payloads[0].instructions,
    /do not reveal the target-language answer until they attempt it/,
  );
  assert.match(payloads[0].instructions, /работать в команде/);
  assert.match(payloads[0].instructions, /We discussed teamwork/);
  const result = await executeLlm(
    {
      action: "summarize",
      settings,
      messages,
      previousSummary: context.summary,
    },
    { openai: "test-only" },
    transport,
  );
  assert.deepEqual(result, { text: "We discussed teamwork and reliability." });
  assert.match(payloads[1].instructions, /in English only/);
  assert.match(
    payloads[1].instructions,
    /Do not include a vocabulary list or any target-language words/,
  );
  assert.match(payloads[1].input[0].content, /We discussed teamwork/);
});

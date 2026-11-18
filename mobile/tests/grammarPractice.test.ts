import test from "node:test";
import assert from "node:assert/strict";
import { bundledGrammarTopics, makeGrammarConversation } from "../src/core/grammar";
import { conversationSchema, initialSnapshot } from "../src/core/domain";
import { executeLlm, llmRequestSchema } from "../server/llm";

const languages = ["en-US", "fr-FR", "es-ES", "de-DE", "it-IT"];

test("all 60 practice cards have bounded reference content, a conversation starter and provenance", () => {
  for (const language of languages) {
    const topics = bundledGrammarTopics(language);
    assert.equal(topics.length, 12);
    for (const topic of topics) {
      const lines = topic.reminder.split("\n");
      assert.ok(lines.length <= 4, `${language}/${topic.id}: too many reference lines`);
      assert.ok(lines.every((line) => line.length <= 90), `${language}/${topic.id}: line too long`);
      assert.ok(topic.openingPrompt && topic.openingPrompt.length <= 160);
      assert.ok(topic.openingTranslation && topic.openingTranslation.length <= 180);
      assert.ok(topic.sources?.length);
      assert.match(topic.prompt, /already studied/);
      assert.match(topic.prompt, /one short, natural follow-up/);
      const conversation = conversationSchema.parse(makeGrammarConversation(topic, "en-US", language));
      assert.equal(conversation.grammar?.openingPrompt, topic.openingPrompt);
      assert.equal(conversation.grammar?.openingTranslation, topic.openingTranslation);
    }
  }
});

test("practice instruction uses a conversational opener and keeps the displayed card out of chat replies", async () => {
  for (const target of languages) {
    const native = target === "en-US" ? "fr-FR" : "en-US";
    const grammar = bundledGrammarTopics(target)[0];
    const request = llmRequestSchema.parse({
      action: "generate",
      settings: { ...initialSnapshot(false).settings, native, target, mode: "api" },
      grammar,
      messages: [{ id: "start", role: "user", text: "Start our conversation.", final: true, createdAt: new Date().toISOString() }],
    });
    if (request.action !== "generate") throw new Error("Expected generate request");
    let instructions = "";
    await executeLlm(request, { openai: "test-secret" }, async (_url, options) => {
      instructions = JSON.parse(String(options?.body)).instructions;
      return Response.json({ output: [{ content: [{ type: "output_text", text: "Test opening" }] }] });
    });
    assert.ok(instructions.includes(grammar.openingPrompt!));
    assert.match(instructions, /already and needs practice/);
    assert.match(instructions, /displays the reference card separately/);
    assert.match(instructions, /without a heading, Exercise label/);
    assert.match(instructions, /one short follow-up in the same scenario/);
    assert.doesNotMatch(instructions, /FIRST TURN FORMAT:|Use this exact layout/);
  }
});

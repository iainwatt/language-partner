import test from "node:test";
import assert from "node:assert/strict";
import { conversationSchema, initialSnapshot, snapshotSchema } from "../src/core/domain";
import { roleplayScenarios, makeRoleplayConversation, roleplayForLanguage } from "../src/core/roleplay";
import { roleplayPracticeSchema } from "../src/core/roleplayTypes";
import { bundledGrammarTopics } from "../src/core/grammar";
import { executeLlm, llmRequestSchema } from "../server/llm";

const languages = ["en-US", "fr-FR", "es-ES", "de-DE", "it-IT", "ru-RU"];
const messages = [{ id: "start", role: "user" as const, text: "Start the roleplay.", final: true, createdAt: "2026-11-05T12:00:00.000Z" }];

test("six roleplays provide distinct roles, practical goals and native openings for each launch language", () => {
  assert.equal(roleplayScenarios.length, 6);
  assert.equal(new Set(roleplayScenarios.map(({ id }) => id)).size, 6);
  for (const scenario of roleplayScenarios) {
    for (const target of languages) {
      const practice = roleplayForLanguage(scenario, target);
      assert.notEqual(practice.learnerRole, practice.partnerRole);
      assert.equal(practice.objectives.length, 3);
      assert.equal(practice.openingLanguage, target);
      assert.equal(practice.openingPrompt, (scenario.openings as Record<string, string>)[target]);
      assert.ok(practice.prompt.length > 100);
    }
  }
});

test("roleplay identity, goals and agreed messages survive persistence without changing existing history", () => {
  const snapshot = initialSnapshot();
  const original = structuredClone(snapshot.conversations[0]);
  const next = makeRoleplayConversation(roleplayScenarios[0], "en-US", "fr-FR");
  next.messages = [{ ...messages[0], text: "Un café, s’il vous plaît." }];
  snapshot.conversations.unshift(next);
  snapshot.activeConversationId = next.id;
  const restored = snapshotSchema.parse(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(restored.conversations[0], next);
  assert.deepEqual(restored.conversations[1], original);
  assert.equal(restored.settings.target, "ru-RU");
  const legacy = { ...next, roleplay: undefined };
  assert.equal(conversationSchema.parse(legacy).roleplay, undefined);
});

test("languages without an authored opener are explicitly marked for translation", () => {
  const practice = roleplayForLanguage(roleplayScenarios[0], "pt-BR");
  assert.equal(practice.openingLanguage, "en-US");
  assert.equal(practice.openingPrompt, roleplayScenarios[0].openings["en-US"]);
});

test("roleplay instructions retain roles and goals on openings and later turns", async () => {
  for (const scenario of roleplayScenarios) {
    for (const continuation of [false, true]) {
      const roleplay = roleplayForLanguage(scenario, "fr-FR");
      const request = llmRequestSchema.parse({ action: "generate", settings: { ...initialSnapshot().settings, mode: "api", target: "fr-FR" }, roleplay,
        messages: continuation ? [...messages, { ...messages[0], id: "partner", role: "assistant", text: roleplay.openingPrompt }, { ...messages[0], id: "answer", text: "Bonjour !" }] : messages });
      if (request.action !== "generate") throw new Error("Expected generation");
      let instructions = "";
      await executeLlm(request, { openai: "test-secret" }, async (_url, options) => {
        instructions = JSON.parse(String(options?.body)).instructions;
        return Response.json({ output: [{ content: [{ type: "output_text", text: "Bonjour !" }] }] });
      });
      for (const value of [roleplay.learnerRole, roleplay.partnerRole, roleplay.openingPrompt, ...roleplay.objectives]) assert.ok(instructions.includes(value));
      assert.match(instructions, /one short relevant question at a time/);
      assert.match(instructions, /do not supply their answers/);
      assert.match(instructions, /Do not claim completion if an objective is still missing/);
      assert.match(instructions, /do not reset the scenario/);
      assert.match(instructions, /do not request real sensitive information/);
    }
  }
});

test("malformed scenarios and conflicting practice modes are rejected", () => {
  const roleplay = roleplayForLanguage(roleplayScenarios[0], "fr-FR");
  assert.equal(roleplayPracticeSchema.safeParse({ ...roleplay, objectives: [] }).success, false);
  assert.equal(roleplayPracticeSchema.safeParse({ ...roleplay, prompt: "x".repeat(3001) }).success, false);
  assert.equal(llmRequestSchema.safeParse({ action: "generate", settings: { ...initialSnapshot().settings, mode: "api" }, messages, roleplay, grammar: bundledGrammarTopics("fr-FR")[0] }).success, false);
});

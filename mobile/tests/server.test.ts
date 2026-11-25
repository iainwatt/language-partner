import test from "node:test";
import assert from "node:assert/strict";
import { providers } from "../src/core/domain";
import { providerRequest, responseText } from "../server/providers";
import { chatSchemaFormat } from "../server/schemas";

test("provider adapters route only to the chosen provider and use its native message format", () => {
  const messages = [
    { role: "user" as const, text: "Hola" },
    { role: "assistant" as const, text: "¿Qué tal?" },
  ];
  for (const provider of ["openai", "claude", "gemini"] as const) {
    const spec = providerRequest(
      provider,
      providers[provider].models[0],
      messages,
      "Learn Spanish",
      "test-key",
    );
    assert.match(
      spec.url,
      provider === "openai"
        ? /api.openai.com/
        : provider === "claude"
          ? /api.anthropic.com/
          : /generativelanguage.googleapis.com/,
    );
    assert.match(JSON.stringify(spec.body), /Hola/);
    assert.match(JSON.stringify(spec.body), /Qué tal/);
    assert.throws(() =>
      providerRequest(provider, "invented-model", messages, "test", "test-key"),
    );
  }
  assert.equal(
    responseText("openai", {
      output: [{ content: [{ type: "output_text", text: "Hola" }] }],
    }),
    "Hola",
  );
  assert.equal(
    responseText("claude", {
      content: [
        { type: "thinking", text: "hidden" },
        { type: "text", text: "Hola" },
      ],
    }),
    "Hola",
  );
  assert.equal(
    responseText("gemini", {
      candidates: [
        {
          content: {
            parts: [{ thought: true, text: "hidden" }, { text: "Hola" }],
          },
        },
      ],
    }),
    "Hola",
  );
});

test("provider adapters include reasoning effort and strict structured output schemas per provider", () => {
  const messages = [{ role: "user" as const, text: "Привет" }];
  const openai = providerRequest("openai", "gpt-5.4-mini", messages, "Test", "k", {
    effort: "low",
    format: chatSchemaFormat,
  }).body as any;
  assert.deepEqual(openai.reasoning, { effort: "low" });
  assert.equal(openai.text.format.type, "json_schema");
  assert.equal(openai.text.format.name, "chat_reply");
  assert.equal(openai.text.format.strict, true);

  const claude = providerRequest("claude", "claude-sonnet-5", messages, "Test", "k", {
    effort: "low",
    format: chatSchemaFormat,
  }).body as any;
  assert.equal(claude.output_config.format.type, "json_schema");
  assert.equal(claude.output_config.format.schema.type, "object");

  const gemini = providerRequest("gemini", "gemini-3.8-flash", messages, "Test", "k", {
    effort: "none",
    format: chatSchemaFormat,
  }).body as any;
  assert.equal(gemini.generationConfig.responseMimeType, "application/json");
  assert.equal(gemini.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(gemini.generationConfig.responseSchema.properties.natural.nullable, true);
  assert.equal(gemini.generationConfig.responseSchema.properties.natural.type, "STRING");
});

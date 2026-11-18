import test from "node:test";
import assert from "node:assert/strict";
import { providers } from "../src/core/domain";
import { providerRequest, responseText } from "../server/providers";
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

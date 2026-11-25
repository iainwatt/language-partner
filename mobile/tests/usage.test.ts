import test from "node:test";
import assert from "node:assert/strict";
import { estimateCostNanos, tokenUsage } from "../server/pricing";
import { executeLlm, llmRequestSchema } from "../server/llm";
import { generate, type UsageObservation } from "../server/providers";
import { initialSnapshot } from "../src/core/domain";
import { emptyPartnerUsage, formatCost, hourlyCost, practiceDelta } from "../src/core/usage";

test("OpenAI cached input is discounted and reasoning output is charged exactly once", () => {
  const usage = tokenUsage("openai", { usage: {
    input_tokens: 1000, input_tokens_details: { cached_tokens: 600 },
    output_tokens: 500, output_tokens_details: { reasoning_tokens: 400 },
  } });
  assert.equal(usage?.output, 500);
  assert.equal(estimateCostNanos("openai", "gpt-5.4-mini", usage, "2026-11-03"), 2595000);
  const large = { input: 300000, cachedInput: 0, output: 1000, cacheWrite5m: 0, cacheWrite1h: 0 };
  assert.equal(estimateCostNanos("openai", "gpt-5.4", large, "2026-11-03"), 1522500000);
});
test("Claude cache reads and both write durations are separate from ordinary input", () => {
  const usage = tokenUsage("claude", { usage: {
    input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 600,
    cache_creation_input_tokens: 300,
    cache_creation: { ephemeral_5m_input_tokens: 200, ephemeral_1h_input_tokens: 100 },
  } });
  assert.equal(usage?.input, 1000);
  assert.equal(estimateCostNanos("claude", "claude-sonnet-5", usage, "2026-11-03"), 1720000);
});
test("Gemini bills thoughts as output, discounts cache, and uses dated rates", () => {
  const usage = tokenUsage("gemini", { usageMetadata: {
    promptTokenCount: 1000, cachedContentTokenCount: 500,
    candidatesTokenCount: 100, thoughtsTokenCount: 200, totalTokenCount: 1300,
  } });
  assert.equal(usage?.output, 300);
  assert.equal(estimateCostNanos("gemini", "gemini-3.8-flash", usage, "2026-11-03"), 1537500);
  assert.equal(estimateCostNanos("gemini", "gemini-3.8-flash", usage, "2027-01-01"), 3075000);
  assert.equal(estimateCostNanos("gemini", "gemini-2.5-flash", usage, "2026-12-01"), null);
});
test("missing/invalid usage and unknown prices never become free requests", () => {
  assert.equal(tokenUsage("openai", {}), null);
  assert.equal(tokenUsage("openai", { usage: { input_tokens: 12 } }), null);
  assert.equal(tokenUsage("openai", { usage: { input_tokens: 12, output_tokens: -1 } }), null);
  assert.equal(tokenUsage("openai", { usage: { input_tokens: 12, output_tokens: 1, input_tokens_details: { cached_tokens: 13 } } }), null);
  const usage = { input: 100, output: 0, cachedInput: 0, cacheWrite5m: 0, cacheWrite1h: 0 };
  assert.equal(estimateCostNanos("openai", "unknown", usage, "2026-11-03"), null);
  assert.equal(estimateCostNanos("gemini", "gpt-5.4", usage, "2026-11-03"), null);
});
test("billed usage survives truncated and empty replies", async () => {
  for (const payload of [
    { status: "incomplete", usage: { input_tokens: 50, output_tokens: 8192 } },
    { output: [], usage: { input_tokens: 50, output_tokens: 200 } },
  ]) {
    let observed: UsageObservation | undefined;
    await assert.rejects(generate(
      { ...initialSnapshot(false).settings, mode: "api" }, [], "Test", { openai: "test-key" },
      (async () => Response.json(payload)) as typeof fetch,
      (value) => { observed = value; },
    ));
    assert.equal(observed?.tokens?.output, payload.usage.output_tokens);
  }
});
test("cumulative practice counters make retries and out-of-order sync harmless", () => {
  const old = { id: "install-a", openai: 30000, claude: 10000, gemini: 0 };
  assert.deepEqual(practiceDelta(old, old), { openai: 0, claude: 0, gemini: 0 });
  assert.deepEqual(practiceDelta(old, { ...old, openai: 10000, claude: 20000 }), { openai: 0, claude: 10000, gemini: 0 });
});
test("hourly cost excludes older untracked builds and handles missing data and zero hours", () => {
  const usage = { ...emptyPartnerUsage(), estimatedCostNanos: 100e9, trackedCostNanos: 2e9, trackedRequests: 2 };
  assert.equal(hourlyCost(usage), null);
  assert.equal(hourlyCost({ ...usage, practiceMs: 1800000 }), 4);
  assert.equal(hourlyCost({ ...usage, practiceMs: 1800000, trackedUnknownRequests: 1 }), null);
  assert.equal(formatCost(0.00001), "<$0.001");
});

test("videoSummary calls are metered via observeUsage in both questions and generate", async () => {
  const settings = { ...initialSnapshot(false).settings, mode: "api" as const };
  const observedQuestions: UsageObservation[] = [];
  let qCall = 0;
  await executeLlm(
    llmRequestSchema.parse({
      action: "questions",
      settings: { ...settings, model: "gpt-5.4" },
      items: [{ phrase: "привет", meaning: "hello", sentence: "Привет всем!" }],
      video: { youtubeId: "pyqW-FJwKDE", title: "Test", transcript: "Привет всем!" },
    }) as any,
    { openai: "test-key" },
    (async () => {
      qCall++;
      const text = qCall === 1 ? "A short video." : JSON.stringify({ items: [{ phrase: "привет", question: "Как дела?" }] });
      return Response.json({
        output: [{ content: [{ type: "output_text", text }] }],
        usage: { input_tokens: 100 * qCall, output_tokens: 20 * qCall },
      });
    }) as typeof fetch,
    (obs) => observedQuestions.push(obs),
  );
  assert.equal(observedQuestions.length, 2);
  assert.equal(observedQuestions[0].step, "videoSummary");
  assert.equal(observedQuestions[0].model, "gpt-5.4-mini");
  assert.equal(observedQuestions[0].tokens?.input, 100);
  assert.equal(observedQuestions[1].model, "gpt-5.4");
  assert.equal(observedQuestions[1].tokens?.input, 200);

  const observedGenerate: UsageObservation[] = [];
  let gCall = 0;
  await executeLlm(
    llmRequestSchema.parse({
      action: "generate",
      settings,
      messages: [{ id: "m1", role: "user", text: "Start.", final: true, createdAt: "2026-11-25T00:00:00Z" }],
      video: { youtubeId: "pyqW-FJwKDE", title: "Test", transcript: "Привет всем!" },
    }) as any,
    { openai: "test-key" },
    (async () => {
      gCall++;
      const text = gCall === 1
        ? "A short video."
        : JSON.stringify({ reply: "Привет!", natural: null, corrections: [], misheard: [], meant: null, speaker: null });
      return Response.json({
        output: [{ content: [{ type: "output_text", text }] }],
        usage: { input_tokens: 50 * gCall, output_tokens: 10 * gCall },
      });
    }) as typeof fetch,
    (obs) => observedGenerate.push(obs),
  );
  assert.equal(observedGenerate.length, 2);
  assert.equal(observedGenerate[0].step, "videoSummary");
  assert.equal(observedGenerate[0].tokens?.input, 50);
  assert.equal(observedGenerate[1].step, undefined);
  assert.equal(observedGenerate[1].tokens?.input, 100);
});

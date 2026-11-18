import test from "node:test";
import assert from "node:assert/strict";
import { ProviderRequestError, providerRequestError } from "../server/providerErrors";
import { executeLlm, parseKeys } from "../server/llm";
import { providers } from "../src/core/domain";
import { configured } from "../server/providers";

test("provider authentication failures stay distinct from app login and never reveal raw errors", async () => {
  for (const provider of ["openai", "claude", "gemini"] as const) {
    const error = await providerRequestError(provider, Response.json({ error: {
      code: "invalid_api_key", message: "Incorrect API key provided: sk-private-secret. Private lesson text.",
    } }, { status: 401, headers: { "x-request-id": "req_test123" } }));
    assert.equal(error.reason, "authentication");
    assert.equal(error.callableCode, "failed-precondition");
    assert.match(error.message, /could not be authenticated/);
    assert.doesNotMatch(error.message, /quota|503|401|backend|demo|sign in/i);
    assert.equal(error.diagnostics().providerCode, "invalid_api_key");
    assert.equal(error.diagnostics().providerRequestId, "req_test123");
    assert.doesNotMatch(JSON.stringify({ message: error.message, ...error.diagnostics() }), /sk-private-secret|Private lesson text/);
  }
});

test("quota, rate limits, access, missing models and server outages have specific recovery messages", async () => {
  const cases = [
    [429, "insufficient_quota", "quota", "resource-exhausted"],
    [429, "credit_balance_exhausted", "quota", "resource-exhausted"],
    [429, "rate_limit_error", "rate-limit", "resource-exhausted"],
    [403, "permission_denied", "access", "failed-precondition"],
    [404, "model_not_found", "model", "failed-precondition"],
    [400, "invalid_request_error", "request", "invalid-argument"],
    [503, "overloaded_error", "unavailable", "unavailable"],
  ] as const;
  for (const [status, code, reason, callableCode] of cases) {
    const error = await providerRequestError("openai", Response.json({ error: { code } }, { status }));
    assert.equal(error.reason, reason);
    assert.equal(error.callableCode, callableCode);
    assert.doesNotMatch(error.message, /choose another|in settings|partner settings/i);
  }
  const google = await providerRequestError("gemini", Response.json({ error: { code: 403, status: "PERMISSION_DENIED" } }, { status: 403 }));
  assert.equal(google.providerCode, "PERMISSION_DENIED");
});

test("unrecognised or non-JSON provider errors cannot leak into diagnostics", async () => {
  const response = Response.json({ error: { code: "private-key", message: "Private input" } }, {
    status: 401, headers: { "x-request-id": "private-key" },
  });
  const error = await providerRequestError("openai", response);
  assert.equal(error.providerCode, null);
  assert.equal(error.requestId, null);
  const htmlError = await providerRequestError("openai", new Response("<html>Private upstream error</html>", { status: 401 }));
  assert.equal(htmlError.reason, "authentication");
  assert.doesNotMatch(htmlError.message, /Private|html/);
});

test("failed authentication makes one request and never switches provider or substitutes a demo reply", async () => {
  let calls = 0;
  await assert.rejects(executeLlm({ action: "connect", provider: "openai", model: providers.openai.models[0] }, {
    openai: "test-key", claude: "other-key",
  }, async (url) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    return Response.json({ error: { code: "invalid_api_key" } }, { status: 401 });
  }), (error: unknown) => error instanceof ProviderRequestError && error.reason === "authentication");
  assert.equal(calls, 1);
});

test("pasted key whitespace is removed and a whitespace-only credential is unavailable", () => {
  const keys = parseKeys(JSON.stringify({ openai: " \n test-key\t ", claude: " \n ", gemini: "second-key" }));
  assert.deepEqual(keys, { openai: "test-key", claude: "", gemini: "second-key" });
  assert.deepEqual(configured(keys), { openai: true, claude: false, gemini: true });
});

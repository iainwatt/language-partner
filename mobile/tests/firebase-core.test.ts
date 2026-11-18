import test from "node:test";
import assert from "node:assert/strict";
import { secureChunks, type SecretStore } from "../src/storage/secureChunks";
import {
  cloudEntry,
  commitWrites,
  dictionaryChanges,
} from "../src/core/cloudDictionary";
import { initialSnapshot, providers, saveEntry } from "../src/core/domain";
import { ProviderRequestError } from "../server/providerErrors";
import {
  executeLlm,
  llmRequestSchema,
  parseKeys,
  testAccess,
} from "../server/llm";

test("login persistence handles large Unicode sessions, atomic failures and sign-out", async () => {
  const values = new Map<string, string>();
  let failAfter = Infinity,
    writes = 0;
  const store: SecretStore = {
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value) {
      assert.match(key, /^[a-zA-Z0-9._-]+$/);
      assert.ok(Buffer.byteLength(value) < 2048);
      if (++writes >= failAfter) throw new Error("Keychain write failed");
      values.set(key, value);
    },
    async remove(key) {
      values.delete(key);
    },
  };
  const persistence = secureChunks(store),
    key = "firebase:authUser:test-app";
  const session = JSON.stringify({
    refreshToken: "private-test-token",
    displayName: "Русский 🌍 ".repeat(1000),
  });
  await persistence.setItem(key, session);
  assert.equal(await secureChunks(store).getItem(key), session);
  failAfter = writes + 2;
  await assert.rejects(
    persistence.setItem(key, session + "changed"),
    /Keychain/,
  );
  assert.equal(await persistence.getItem(key), session);
  failAfter = Infinity;
  await persistence.removeItem(key);
  assert.equal(await persistence.getItem(key), null);
  assert.equal(values.size, 0);
});

test("cloud commits preserve exact words, exclude transcript metadata and write only changed entries", () => {
  const entry = saveEntry([], {
    phrase: "Привет 🌍",
    meaning: "Hello world",
    native: "en-US",
    target: "ru-RU",
  }).entry;
  const legacy = {
    ...entry,
    context: "private transcript",
    messageId: "message",
  };
  assert.equal("context" in cloudEntry(legacy), false);
  assert.deepEqual(dictionaryChanges([entry], [entry]), []);
  const changed = { ...entry, meaning: "Hi world" };
  const updates = dictionaryChanges([entry], [changed]);
  assert.equal(updates.length, 1);
  const writes = commitWrites(
    "projects/demo-test/databases/(default)",
    "user-a",
    updates,
  );
  assert.match(JSON.stringify(writes), /users\/user-a\/dictionary/);
  assert.match(JSON.stringify(writes), /Привет 🌍/);
  assert.equal(dictionaryChanges([entry], [])[0].entry, null);
  assert.throws(
    () => commitWrites("db", "user-a", [{ id: "../user-b", entry }]),
    /Invalid/,
  );
});

test("private AI access requires a verified invited account and never trusts caller-supplied identity", () => {
  assert.equal(testAccess(null, "a@example.test").access, false);
  assert.equal(
    testAccess(
      { uid: "a", email: "a@example.test", verified: false },
      "a@example.test",
    ).access,
    false,
  );
  assert.equal(
    testAccess({ uid: "a", email: "a@example.test", verified: true }, "")
      .access,
    false,
  );
  assert.equal(
    testAccess(
      { uid: "a", email: "a@example.test", verified: true },
      " A@example.test ",
    ).access,
    true,
  );
  assert.deepEqual(
    llmRequestSchema.parse({
      action: "connections",
      uid: "other",
      email: "admin@example.test",
    }),
    { action: "connections" },
  );
  assert.throws(() => parseKeys('{"openai":12}'), /configuration/);
});

test("chat, translation and connection probes use the selected provider and propagate API errors", async () => {
  for (const provider of ["openai", "claude", "gemini"] as const) {
    const settings = {
      ...initialSnapshot(false).settings,
      mode: "api" as const,
      native: "en-US" as const,
      target: "ru-RU" as const,
      provider,
      model: providers[provider].models[0],
    };
    let calls = 0;
    const transport: typeof fetch = async (url, options) => {
      calls++;
      assert.match(
        String(url),
        provider === "openai"
          ? /openai.com/
          : provider === "claude"
            ? /anthropic.com/
            : /googleapis.com/,
      );
      assert.match(JSON.stringify(options?.headers), /test-secret/);
      const body = JSON.parse(String(options?.body));
      if (calls === 2)
        assert.match(JSON.stringify(body), /Translate the supplied text/);
      const payload =
        provider === "openai"
          ? { output: [{ content: [{ type: "output_text", text: "Привет" }] }] }
          : provider === "claude"
            ? { content: [{ type: "text", text: "Привет" }] }
            : { candidates: [{ content: { parts: [{ text: "Привет" }] } }] };
      return Response.json(payload);
    };
    const keys = { [provider]: "test-secret" };
    assert.deepEqual(
      await executeLlm(
        {
          action: "generate",
          settings,
          messages: [
            {
              id: "m",
              role: "user",
              text: "Hi",
              final: true,
              createdAt: "2026-09-11",
            },
          ],
        },
        keys,
        transport,
      ),
      { text: "Привет" },
    );
    assert.deepEqual(
      await executeLlm(
        {
          action: "translate",
          settings,
          text: "Hello",
          source: "en-US",
          target: "ru-RU",
          context: [],
        },
        keys,
        transport,
      ),
      { text: "Привет" },
    );
    assert.deepEqual(
      await executeLlm(
        { action: "connect", provider, model: settings.model },
        keys,
        transport,
      ),
      { ok: true },
    );
    await assert.rejects(
      executeLlm(
        { action: "connect", provider, model: settings.model },
        keys,
        async () => Response.json({ error: "private detail" }, { status: 401 }),
      ),
      (error: unknown) => error instanceof ProviderRequestError && error.reason === "authentication" && error.status === 401,
    );
    await assert.rejects(
      executeLlm(
        { action: "connect", provider, model: settings.model },
        {},
        transport,
      ),
      /not configured/,
    );
    assert.equal(calls, 3);
  }
});

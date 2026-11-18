import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp } from "firebase/app";
import {
  applyActionCode,
  confirmPasswordReset,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  initializeAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { commitWrites, cloudEntry } from "../src/core/cloudDictionary";
import { saveEntry } from "../src/core/domain";
import { initialSnapshot } from "../src/core/domain";
import { saveConversationContext } from "../src/core/practiceContext";
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from "firebase-admin/app";
import { getFirestore as adminFirestore } from "firebase-admin/firestore";
import { beginUsage, finishUsage, usageOverview } from "../server/usage";
import { updateConversationAccess, conversationAccessPath } from "../server/conversationAccess";
import { FREE_CONVERSATION_MS } from "../src/core/conversationAccess";

const projectId = "demo-language-partner";
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8180";
const functionsHost =
  process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";
const database = `projects/${projectId}/databases/(default)`;
const word = saveEntry([], {
  phrase: "Спасибо 🌍",
  meaning: "Thank you",
  native: "en-US",
  target: "ru-RU",
}).entry;

test("Firestore rules isolate accounts, validate entries, and deny private server data", async () => {
  const [host, port] = firestoreHost.split(":");
  const env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  const uid = `rules-${Date.now()}`;
  try {
    const a = env.authenticatedContext(uid).firestore();
    const b = env.authenticatedContext(`${uid}-b`).firestore();
    const guest = env.unauthenticatedContext().firestore();
    const path = `users/${uid}/dictionary/${word.id}`;
    await assertSucceeds(a.doc(path).set(cloudEntry(word)));
    await assertSucceeds(a.collection(`users/${uid}/dictionary`).get());
    await assertFails(b.doc(path).get());
    await assertFails(b.doc(path).set(cloudEntry(word)));
    await assertFails(b.doc(path).delete());
    await assertFails(guest.doc(path).get());
    await assertFails(guest.doc(path).set(cloudEntry(word)));
    await assertFails(
      a.doc(path).update({ context: "a full chat transcript" }),
    );
    await assertFails(a.doc(path).update({ id: "wrong-id" }));
    await assertFails(a.doc(path).update({ meaning: "" }));
    await assertSucceeds(
      a
        .doc(path)
        .update({
          example: {
            text: "Спасибо за помощь",
            translation: "Thank you for your help",
          },
        }),
    );
    await assertFails(a.doc(path).update({ example: "not-a-map" }));
    await assertFails(a.doc(path).update({ example: { text: "Привет" } }));
    await assertFails(
      a
        .doc(path)
        .update({
          example: { text: "x".repeat(601), translation: "Too long" },
        }),
    );
    await assertFails(
      a.doc(path).update({ example: { text: "Привет", translation: "" } }),
    );
    await assertFails(a.doc(`privateUsage/${uid}`).set({ count: 0 }));
    await assertFails(a.doc(`privateUsage/${uid}`).get());
    for (const path of [
      `privateAiUsage/${uid}/partners/openai`,
      `privateAiUsage/${uid}/requests/test`,
      `privateAiUsage/${uid}/devices/test`,
      `privateConversationAccess/${uid}`,
      `privateBillingRequests/${uid}`,
    ]) {
      await assertFails(a.doc(path).get());
      await assertFails(a.doc(path).set({ estimatedCostNanos: 0, practiceMs: 999999 }));
    }
    await assertSucceeds(a.doc(path).update({ meaning: "Thanks" }));
    assert.equal((await a.doc(path).get()).data()?.meaning, "Thanks");
    await assertSucceeds(a.doc(path).delete());
    const context = saveConversationContext(
      initialSnapshot(false).conversations[0],
    );
    const contextPath = `users/${uid}/savedConversations/${context.id}`;
    await assertSucceeds(a.doc(contextPath).set(context));
    await assertSucceeds(a.collection(`users/${uid}/savedConversations`).get());
    await assertFails(b.doc(contextPath).get());
    await assertFails(b.doc(contextPath).set(context));
    await assertFails(guest.doc(contextPath).get());
    await assertFails(guest.doc(contextPath).set(context));
    await assertFails(a.doc(contextPath).update({ title: "" }));
    await assertFails(a.doc(contextPath).update({ summary: "x".repeat(6001) }));
    await assertFails(a.doc(contextPath).update({ messages: [] }));
    await assertSucceeds(
      a.doc(contextPath).update({ summary: "We discussed teamwork." }),
    );
    const batch = a.batch();
    batch.set(a.doc(path), {
      ...cloudEntry(word),
      conversationIds: [context.id],
    });
    batch.update(a.doc(contextPath), { description: "Workplace skills" });
    await assertSucceeds(batch.commit());
    assert.deepEqual((await a.doc(path).get()).data()?.conversationIds, [
      context.id,
    ]);
    await assertFails(a.doc(path).update({ conversationIds: "invalid" }));
    await assertFails(
      a.doc(path).update({ conversationIds: Array(501).fill("too-many") }),
    );
    const grammarPath = "grammar/ru-RU/topics/past-events";
    await env.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(grammarPath).set({
        title: "Talking about the past",
        description: "Practise past events.",
        prompt: "Focus corrections on the past tense.",
        order: 10,
      });
    });
    await assertSucceeds(a.doc(grammarPath).get());
    await assertSucceeds(b.doc(grammarPath).get());
    await assertFails(guest.doc(grammarPath).get());
    await assertFails(
      a.doc(grammarPath).set({
        title: "Changed by a client",
        description: "No",
        prompt: "No",
        order: 0,
      }),
    );
  } finally {
    await env.cleanup();
  }
});

test("conversation allowance is atomic, account-scoped, and only successful conversations start time", async () => {
  const app = initializeAdminApp({ projectId }, `allowance-${Date.now()}`);
  const db = adminFirestore(app);
  const uid = `allowance-${Date.now()}`;
  try {
    const update = (action: Parameters<typeof updateConversationAccess>[2], now: number, session = "phone") => updateConversationAccess(uid, session, action, true, db, now);
    assert.equal((await update("status", 0)).remainingMs, FREE_CONVERSATION_MS);
    await update("authorize", 0);
    // Reading a chat or a failed first provider request cannot start the timer.
    assert.equal((await update("resume", 10000)).leaseRemainingMs, 0);
    await update("release", 10000);
    assert.equal((await update("status", 100000)).remainingMs, FREE_CONVERSATION_MS);
    const attempts = await Promise.allSettled([update("authorize", 100000, "one"), update("authorize", 100000, "two")]);
    assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
    const owner = attempts[0].status === "fulfilled" ? "one" : "two";
    await update("start", 100100, owner);
    const observer = await update("status", 105100, "another-phone");
    assert.equal(observer.remainingMs, FREE_CONVERSATION_MS - 5000);
    assert.equal(observer.leaseRemainingMs, 0);
    // A stale pause from a different device cannot stop the active clock.
    await update("pause", 106100, "another-phone");
    assert.ok((await update("status", 107100, owner)).leaseRemainingMs > 0);
    await update("pause", 108100, owner);
    assert.equal((await update("status", 500000)).remainingMs, FREE_CONVERSATION_MS - 8000);
    await db.doc(conversationAccessPath(uid)).set({ usedMs: FREE_CONVERSATION_MS - 2000 }, { merge: true });
    await update("authorize", 500000, "phone");
    assert.equal((await update("start", 500000, "phone")).leaseRemainingMs, 2000);
    await assert.rejects(update("authorize", 502000, "reinstall"), (error: any) => error.code === "permission-denied" && error.details.type === "paywall");
    assert.equal((await update("status", 90000000, "reinstall")).remainingMs, 0);
    assert.equal((await updateConversationAccess(`${uid}-other`, "phone", "status", true, db, 90000000)).remainingMs, FREE_CONVERSATION_MS);
    await db.doc(conversationAccessPath(uid)).set({ paidUntil: 99999999 }, { merge: true });
    assert.equal((await update("authorize", 90000000, "reinstall")).subscribed, true);
  } finally { await deleteAdminApp(app); }
});

test("Firebase account creation, email verification, password recovery, cloud dictionary and callable authentication", async () => {
  const app = initializeApp(
    { apiKey: "demo-api-key", projectId, appId: "demo-app" },
    `auth-test-${Date.now()}`,
  );
  const auth = initializeAuth(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  const functions = getFunctions(app, "europe-west2");
  const [functionsHostname, functionsPort] = functionsHost.split(":");
  connectFunctionsEmulator(
    functions,
    functionsHostname,
    Number(functionsPort),
  );
  const llm = httpsCallable(functions, "llm");
  const allowance = httpsCallable(functions, "conversationAllowance");
  const email = `firebase-test-${Date.now()}@example.test`,
    password = "Test-only-passphrase-189";
  async function code(type: string) {
    const response = await fetch(
      `http://${authHost}/emulator/v1/projects/${projectId}/oobCodes`,
    );
    const body = await response.json();
    return body.oobCodes.findLast(
      (item: any) => item.email === email && item.requestType === type,
    ).oobCode as string;
  }
  async function commit(uid: string, token?: string, entry = word) {
    return fetch(`http://${firestoreHost}/v1/${database}/documents:commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        writes: commitWrites(database, uid, [{ id: entry.id, entry }]),
      }),
    });
  }
  try {
    await assert.rejects(allowance({ action: "status", accountId: "any", sessionId: "phone" }), (error: any) => error.code === "functions/unauthenticated");
    await assert.rejects(
      llm({ action: "connections" }),
      (error: any) => error.code === "functions/unauthenticated",
    );
    await assert.rejects(
      llm({ action: "usage" }),
      (error: any) => error.code === "functions/unauthenticated",
    );
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    assert.equal(user.emailVerified, false);
    const unverified = (await llm({ action: "connections" })).data as any;
    assert.equal(unverified.access, false);
    await assert.rejects(
      llm({ action: "usage" }),
      (error: any) => error.code === "functions/permission-denied",
    );
    await sendEmailVerification(user);
    await applyActionCode(auth, await code("VERIFY_EMAIL"));
    await user.reload();
    await user.getIdToken(true);
    assert.equal(user.emailVerified, true);
    await assert.rejects(allowance({ action: "status", accountId: "another-account", sessionId: "phone" }), (error: any) => error.code === "functions/permission-denied");
    await assert.rejects(allowance({ action: "status", accountId: user.uid, sessionId: "phone", usedMs: 0, subscribed: true }), (error: any) => error.code === "functions/invalid-argument");
    const trialStatus = (await allowance({ action: "status", accountId: user.uid, sessionId: "phone" })).data as any;
    assert.equal(trialStatus.limitMs, FREE_CONVERSATION_MS);
    const ownUsage = (await llm({ action: "usage", uid: "someone-else", estimatedCostNanos: 123 })).data as any;
    assert.equal(ownUsage.openai.requests, 0);
    assert.equal(ownUsage.openai.estimatedCostNanos, 0);
    await assert.rejects(
      llm({ action: "usage", accountId: "someone-else", practice: { id: "old-account-device", openai: 10000, claude: 0, gemini: 0 } }),
      (error: any) => error.code === "functions/permission-denied",
    );
    await assert.rejects(
      llm({ action: "usage", practice: { id: "bad/path", openai: 0, claude: 0, gemini: 0 } }),
      (error: any) => error.code === "functions/invalid-argument",
    );
    const token = await user.getIdToken();
    assert.equal((await commit(user.uid, token)).status, 200);
    const withExample = {
      ...word,
      example: {
        text: "Спасибо 🌍 за помощь",
        translation: "Thank you, world, for your help",
      },
    };
    assert.equal((await commit(user.uid, token, withExample)).status, 200);
    const exampleRead = await fetch(
      `http://${firestoreHost}/v1/${database}/documents/users/${user.uid}/dictionary/${word.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    assert.equal(
      (await exampleRead.json()).fields.example.mapValue.fields.text
        .stringValue,
      withExample.example.text,
    );
    assert.equal((await commit(user.uid, token, word)).status, 200);
    const removedRead = await fetch(
      `http://${firestoreHost}/v1/${database}/documents/users/${user.uid}/dictionary/${word.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    assert.equal((await removedRead.json()).fields.example, undefined);
    const saved = saveConversationContext(
      initialSnapshot(false).conversations[0],
    );
    const linked = { ...word, conversationIds: [saved.id] };
    const contextCommit = await fetch(
      `http://${firestoreHost}/v1/${database}/documents:commit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          writes: commitWrites(
            database,
            user.uid,
            [{ id: word.id, entry: linked }],
            [{ id: saved.id, context: saved }],
          ),
        }),
      },
    );
    assert.equal(contextCommit.status, 200);
    const parallel = await Promise.all(
      ["chat-one", "chat-two"].map((id) =>
        commit(user.uid, token, { ...word, conversationIds: [id] }),
      ),
    );
    assert.ok(parallel.every((response) => response.status === 200));
    const linkedRead = await fetch(
      `http://${firestoreHost}/v1/${database}/documents/users/${user.uid}/dictionary/${word.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const ids = (
      await linkedRead.json()
    ).fields.conversationIds.arrayValue.values.map(
      (value: any) => value.stringValue,
    );
    assert.deepEqual(ids.sort(), [saved.id, "chat-one", "chat-two"].sort());
    assert.equal((await commit(`${user.uid}-other`, token)).status, 403);
    assert.ok([401, 403].includes((await commit(user.uid)).status));
    await signOut(auth);
    await assert.rejects(
      signInWithEmailAndPassword(auth, email, "wrong-password"),
    );
    await signInWithEmailAndPassword(auth, email, password);
    const read = await fetch(
      `http://${firestoreHost}/v1/${database}/documents/users/${user.uid}/dictionary/${word.id}`,
      {
        headers: {
          Authorization: `Bearer ${await auth.currentUser!.getIdToken()}`,
        },
      },
    );
    assert.equal(read.status, 200);
    assert.equal((await read.json()).fields.phrase.stringValue, word.phrase);
    const status = (
      await llm({
        action: "connections",
        uid: "admin",
        email: "local-test@example.test",
      })
    ).data as any;
    assert.equal(status.access, false);
    assert.deepEqual(Object.keys(status.providers).sort(), [
      "claude",
      "gemini",
      "openai",
    ]);
    assert.ok(
      Object.values(status.providers).every(
        (value) => typeof value === "boolean",
      ),
    );
    await assert.rejects(
      llm({ action: "connect", provider: "openai", model: "gpt-5.4-mini" }),
      (error: any) => error.code === "functions/permission-denied",
    );
    await sendPasswordResetEmail(auth, email);
    await confirmPasswordReset(
      auth,
      await code("PASSWORD_RESET"),
      password + "-new",
    );
    await signOut(auth);
    await assert.rejects(signInWithEmailAndPassword(auth, email, password));
    await signInWithEmailAndPassword(auth, email, password + "-new");
    assert.equal(auth.currentUser!.uid, user.uid);
    await signOut(auth);
    await assert.rejects(
      llm({ action: "connections" }),
      (error: any) => error.code === "functions/unauthenticated",
    );
  } finally {
    await deleteApp(app);
  }
});

test("usage ledger is atomic, retry-safe, private per account, and retains unpriced failures", async () => {
  const app = initializeAdminApp({ projectId }, `usage-test-${Date.now()}`);
  const db = adminFirestore(app);
  const uid = `usage-${Date.now()}`;
  try {
    const events = await Promise.all(Array.from({ length: 4 }, () =>
      beginUsage(uid, "openai", "gpt-5.4-mini", "generate", true, db)));
    assert.equal((await usageOverview(uid, undefined, db)).openai.unknownRequests, 4);
    const observation = {
      tokens: { input: 1000, output: 500, cachedInput: 600, cacheWrite5m: 0, cacheWrite1h: 0 },
      responseId: "provider-test-id", responseModel: "gpt-5.4-mini",
    };
    // Finalizing a request twice must count it once, even concurrently.
    await Promise.all([
      finishUsage(uid, events[0], observation, false, db),
      finishUsage(uid, events[0], observation, false, db),
      finishUsage(uid, events[1], observation, true, db),
      finishUsage(uid, events[2], undefined, true, db),
    ]);
    const counter = { id: "phone", openai: 30000, claude: 10000, gemini: 0 };
    await Promise.all([
      usageOverview(uid, counter, db), usageOverview(uid, counter, db),
      usageOverview(uid, { ...counter, id: "tablet" }, db),
    ]);
    const totals = await usageOverview(uid, { ...counter, openai: 10000, claude: 0 }, db);
    assert.equal(totals.openai.requests, 4);
    assert.equal(totals.openai.pricedRequests, 2);
    assert.equal(totals.openai.unknownRequests, 2);
    assert.equal(totals.openai.estimatedCostNanos, 5190000);
    assert.equal(totals.openai.trackedCostNanos, 5190000);
    assert.equal(totals.openai.trackedUnknownRequests, 2);
    assert.equal(totals.openai.inputTokens, 2000);
    assert.equal(totals.openai.practiceMs, 60000);
    assert.equal(totals.claude.practiceMs, 20000);
    assert.equal((await usageOverview(uid, counter, db)).openai.practiceMs, 60000);
    assert.equal((await usageOverview(`${uid}-other`, undefined, db)).openai.requests, 0);
    const legacy = await beginUsage(uid, "openai", "gpt-5.4-mini", "translate", false, db);
    await finishUsage(uid, legacy, observation, false, db);
    const updated = (await usageOverview(uid, undefined, db)).openai;
    assert.equal(updated.estimatedCostNanos, 7785000);
    assert.equal(updated.trackedCostNanos, 5190000);
  } finally {
    await deleteAdminApp(app);
  }
});

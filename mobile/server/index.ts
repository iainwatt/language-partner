import { saveFeedback } from "./feedback";
import { feedbackRequestSchema } from "../src/core/feedback";
import { managedModel, managedPartner } from "../src/core/managedAi";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  defineInt,
  defineBoolean,
  defineSecret,
  defineString,
} from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  llmRequestSchema,
  executeLlm,
  parseKeys,
  testAccess,
  validateModel,
} from "./llm";
import { configured, type UsageObservation } from "./providers";
import { beginUsage, finishUsage, usageOverview } from "./usage";
import { error as logError } from "firebase-functions/logger";
import { ProviderRequestError } from "./providerErrors";
import { mistakeDocuments } from "./mistakes";
import { transcriptForPartner, videoSchema } from "../src/core/videos";
import { updateConversationAccess } from "./conversationAccess";
import { z } from "zod";
export { refreshSubscription, revenuecatWebhook } from "./subscriptions";

initializeApp();
const secrets = defineSecret("LLM_API_KEYS");
const testers = defineString("TESTER_EMAILS", { default: "" });
const dailyLimit = defineInt("DAILY_AI_REQUEST_LIMIT", { default: 1000 });
const perMinuteLimit = defineInt("PER_MINUTE_AI_REQUEST_LIMIT", { default: 60 });
// Enable only after real store products, restore, and server verification pass
// sandbox testing. Existing testers must not hit an unpurchasable paywall.
const paywallEnabled = defineBoolean("PAYWALL_ENABLED", { default: false });
const accessRequest = z.object({
  action: z.enum(["status", "resume", "pause"]),
  accountId: z.string().min(1).max(128),
  sessionId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
}).strict();

export const conversationAllowance = onCall({ region: "europe-west2", maxInstances: 2, invoker: "public" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (request.auth.token.email_verified !== true) throw new HttpsError("permission-denied", "Verify your email first.");
  const parsed = accessRequest.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Invalid conversation allowance request.");
  if (parsed.data.accountId !== request.auth.uid) throw new HttpsError("permission-denied", "The account has changed.");
  return updateConversationAccess(request.auth.uid, parsed.data.sessionId, parsed.data.action, paywallEnabled.value());
});

export const llm = onCall(
  {
    region: "europe-west2",
    secrets: [secrets],
    // Room for the larger model to write a long summary or script in one call.
    timeoutSeconds: 180,
    maxInstances: 2,
    memory: "256MiB",
    invoker: "public",
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError(
        "unauthenticated",
        "Sign in to your Language Partner account first.",
      );
    if (Buffer.byteLength(JSON.stringify(request.data ?? {}), "utf8") > 240000)
      throw new HttpsError(
        "invalid-argument",
        "This conversation is too long. Start a new chat or translate a shorter passage.",
      );
    const parsed = llmRequestSchema.safeParse(request.data);
    if (!parsed.success)
      throw new HttpsError(
        "invalid-argument",
        "The AI request is not valid. Check the selected languages and message.",
      );
    const rawInput = parsed.data;
    const input = "settings" in rawInput
      ? { ...rawInput, settings: { ...rawInput.settings, ...managedModel(rawInput.action, "step" in rawInput ? rawInput.step : undefined), mode: "api" as const } }
      : rawInput;
    // Always scoped to the authenticated UID; no client-supplied account ID or
    // monetary values are accepted. Usage does not consume the AI allowance.
    if (input.action === "usage") {
      if (request.auth.token.email_verified !== true)
        throw new HttpsError("permission-denied", "Verify your email to view usage.");
      if (input.accountId && input.accountId !== request.auth.uid)
        throw new HttpsError("permission-denied", "The account has changed. Please refresh usage.");
      return usageOverview(request.auth.uid, input.practice);
    }
    const access = paywallEnabled.value() ? {
      access: request.auth.token.email_verified === true,
      message: request.auth.token.email_verified === true
        ? "Use your free conversation time or an active subscription."
        : "Verify your email before using an AI partner.",
    } : testAccess(
      {
        uid: request.auth.uid,
        email: request.auth.token.email,
        verified: request.auth.token.email_verified === true,
      },
      testers.value(),
    );
    let keys;
    try {
      keys = parseKeys(secrets.value());
    } catch {
      throw new HttpsError(
        "failed-precondition",
        "The AI service configuration needs attention.",
      );
    }
    if (input.action === "connections")
      return { ...access, providers: configured(keys) };
    if (!access.access)
      throw new HttpsError("permission-denied", access.message);
    const selection = input.action === "connect" ? input : input.settings;
    try {
      validateModel(selection.provider, selection.model);
    } catch (error) {
      throw new HttpsError("invalid-argument", (error as Error).message);
    }
    if (!keys[selection.provider])
      throw new HttpsError(
        "failed-precondition",
        "This AI partner is not available yet.",
      );
    if (paywallEnabled.value() && !input.conversationSessionId)
      throw new HttpsError("failed-precondition", "Update Language Partner to continue your conversation.");
    // A transaction enforces request limits across concurrent function instances.
    const usage = getFirestore().doc(`privateUsage/${request.auth.uid}`);
    await getFirestore().runTransaction(async (transaction) => {
      const previous = (await transaction.get(usage)).data();
      const now = Date.now(),
        day = new Date(now).toISOString().slice(0, 10),
        minute = Math.floor(now / 60000);
      const count = previous?.day === day ? Number(previous.count) : 0;
      const minuteCount =
        previous?.minute === minute ? Number(previous.minuteCount) : 0;
      const dailyAllowance = Math.max(0, dailyLimit.value());
      const minuteAllowance = Math.max(0, perMinuteLimit.value());
      if (count >= dailyAllowance)
        throw new HttpsError(
          "resource-exhausted",
          "Your daily request limit has been reached. Please try again tomorrow.",
        );
      if (minuteCount >= minuteAllowance)
        throw new HttpsError(
          "resource-exhausted",
          "Too many requests in one minute. Please wait a minute and try again.",
        );
      transaction.set(usage, {
        day,
        count: count + 1,
        minute,
        minuteCount: minuteCount + 1,
      });
    });
    await updateConversationAccess(request.auth.uid, input.conversationSessionId ?? "legacy", "authorize", paywallEnabled.value());
    let eventId: string | undefined;
    const observations: UsageObservation[] = [];
    let failed = false;
    try {
      eventId = await beginUsage(request.auth.uid, selection.provider, selection.model, input.action, input.trackPractice === true);
      // Opening the discussion of a video: the partner is told in a few
      // sentences what the video is about. That summary is made once for each
      // video and kept; the transcript it is made from comes from the library
      // or the learner's own videos, never from the app.
      const summaryPath = (input.action === "generate" || input.action === "questions") && input.video
        ? `videoSummaries/${input.settings.target}_${input.video.youtubeId}` : undefined;
      if ((input.action === "generate" || input.action === "questions") && input.video) {
        const { transcript: _transcript, summary: _summary, ...video } = input.video;
        let about: { summary?: string; transcript?: string } = {};
        // Needed to open a discussion, and to write its questions.
        if (input.action === "questions" || !input.messages.some((message) => message.role === "assistant")) {
          try {
            const kept = (await getFirestore().doc(summaryPath!).get()).get("summary");
            if (typeof kept === "string" && kept.trim()) about = { summary: kept.slice(0, 1200) };
            else
              for (const path of [`videos/${input.settings.target}/items/${video.youtubeId}`, `users/${request.auth.uid}/videos/${video.youtubeId}`]) {
                const found = await getFirestore().doc(path).get();
                const stored = videoSchema.safeParse({ ...found.data(), id: found.id });
                if (stored.success && stored.data.lines.length) { about = { transcript: transcriptForPartner(stored.data.lines) }; break; }
              }
          } catch {
            logError("Could not read a video for its discussion", { video: video.youtubeId });
          }
        }
        if (input.action === "generate") input.video = { ...input.video, ...video, transcript: undefined, summary: undefined, ...about };
        else input.video = { ...video, ...about };
      }
      const { fixes, natural, videoSummary, ...result } = { fixes: undefined, natural: undefined, videoSummary: undefined, ...(await executeLlm(input, keys, fetch, (value) => { observations.push(value); })) };
      if (videoSummary && summaryPath) await getFirestore().doc(summaryPath).set({ summary: videoSummary, at: new Date().toISOString() }).catch(() => {});

      if (fixes && input.action === "generate") {
        // Losing a log entry must never cost the learner their reply.
        try {
          const batch = getFirestore().batch();
          const sentence = input.messages.findLast((message) => message.role === "user")?.text ?? "";
          for (const mistake of mistakeDocuments(fixes, { sentence, natural, native: input.settings.native, target: input.settings.target }))
            batch.set(getFirestore().collection(`users/${request.auth.uid}/mistakes`).doc(), mistake);
          await batch.commit();
        } catch {
          logError("Could not save logged mistakes", { eventId });
        }
      }
      // Only a successful conversation reply starts the clock. Connection tests,
      // failed providers, translations, and summaries don't start a session.
      try {
        const access = await updateConversationAccess(request.auth.uid, input.conversationSessionId ?? "legacy", input.action === "generate" ? "start" : "release", paywallEnabled.value());
        return { ...result, conversationAccess: access };
      } catch {
        // Preserve an already billed answer. The next request still checks the
        // durable server balance; never encourage paying twice for a retry.
        logError("Could not start conversation clock", { eventId });
        return result;
      }
    } catch (error) {
      failed = true;
      if (error instanceof ProviderRequestError) {
        logError("AI provider request failed", {
          eventId, action: input.action, model: selection.model, ...error.diagnostics(),
        });
        throw new HttpsError(error.callableCode, error.message, {
          type: "provider_error", provider: error.provider, reason: error.reason,
        });
      }
      throw new HttpsError(
        "unavailable",
        error instanceof Error
          ? error.message
          : "The AI partner could not reply. Please try again.",
      );
    } finally {
      if (failed) {
        try { await updateConversationAccess(request.auth.uid, input.conversationSessionId ?? "legacy", "release", paywallEnabled.value()); }
        catch { logError("Could not release conversation request"); }
      }
      try {
        const mainObservation = observations.findLast((obs) => obs.step !== "videoSummary");
        const extraObservations = observations.filter((obs) => obs.step === "videoSummary");
        if (eventId) await finishUsage(request.auth.uid, eventId, mainObservation, failed);
        for (const extra of extraObservations) {
          const extraId = await beginUsage(
            request.auth.uid,
            extra.provider ?? managedPartner.provider,
            extra.model ?? managedPartner.model,
            extra.step ?? "videoSummary",
            input.trackPractice === true,
          );
          await finishUsage(request.auth.uid, extraId, extra, false);
        }
      } catch {
        // Keep the durable pending record. Never turn a successful paid reply
        // into an error that encourages the learner to pay for another retry.
        logError("Could not finalise AI usage", { eventId });
      }
    }
  },
);

// Feedback is independent of conversation allowances and never accepts audio.
export const submitFeedback = onCall({ region: "europe-west2", invoker: "public", secrets: [secrets], timeoutSeconds: 65, maxInstances: 2 }, async (request) => {
  if (!request.auth || request.auth.token.email_verified !== true)
    throw new HttpsError("unauthenticated", "Sign in with a verified account to send feedback.");
  if (Buffer.byteLength(JSON.stringify(request.data ?? {}), "utf8") > 40000)
    throw new HttpsError("invalid-argument", "Please keep feedback under 6000 characters.");
  const parsed = feedbackRequestSchema.safeParse(request.data);
  if (!parsed.success) throw new HttpsError("invalid-argument", "Check the feedback text and language before sending.");
  const uid = request.auth.uid;
  const db = getFirestore();
  const limit = db.doc(`privateFeedbackLimits/${uid}`);
  await db.runTransaction(async tx => {
    const old = (await tx.get(limit)).data();
    const day = new Date().toISOString().slice(0, 10), minute = Math.floor(Date.now() / 60000);
    const daily = old?.day === day ? Number(old.daily) : 0;
    const recent = old?.minute === minute ? Number(old.recent) : 0;
    if (daily >= 100 || recent >= 10) throw new HttpsError("resource-exhausted", "Please wait before sending more feedback. Your transcript is still here.");
    tx.set(limit, { day, minute, daily: daily + 1, recent: recent + 1 });
  });
  return saveFeedback(uid, parsed.data, {
    create: async (key, document) => db.runTransaction(async tx => {
      const ref = db.doc(`feedback/${key}`);
      const existing = (await tx.get(ref)).data();
      if (existing) return { created: false, same: existing.fingerprint === document.fingerprint, translated: existing.translationStatus === "complete" };
      tx.create(ref, document);
      return { created: true, same: true, translated: document.translationStatus === "complete" };
    }),
    translated: async (key, english) => { await db.doc(`feedback/${key}`).update({ englishTranslation: english, translationStatus: "complete" }); },
  }, async (text, source) => {
    const input = llmRequestSchema.parse({ action: "translate", settings: { ...managedPartner, mode: "api", native: source, target: "en-US", autoSpeak: false }, text, source, target: "en-US", context: [] });
    if (input.action !== "translate") throw new Error("Invalid translation action");
    const eventId = await beginUsage(uid, managedPartner.provider, managedPartner.model, "feedback", false);
    let observation: UsageObservation | undefined;
    let failed = true;
    try {
      const result = await executeLlm(input, parseKeys(secrets.value()), fetch, value => { observation = value; });
      if (!("text" in result) || typeof result.text !== "string") throw new Error("No translated text");
      failed = false;
      return result.text;
    } finally {
      await finishUsage(uid, eventId, observation, failed).catch(() => logError("Could not finalise feedback translation usage", { eventId }));
    }
  });
});

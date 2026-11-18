import { createHash } from "node:crypto";
import { feedbackRequestSchema } from "../src/core/feedback";

// Database and translation are injected so persistence-before-translation and
// duplicate/retry behaviour can be tested without an AI call.
export async function saveFeedback(
  uid: string,
  value: unknown,
  store: {
    create(key: string, document: Record<string, unknown>): Promise<{ created: boolean; same: boolean; translated: boolean }>;
    translated(key: string, english: string): Promise<void>;
  },
  translate: (text: string, source: string) => Promise<string>,
) {
  const input = feedbackRequestSchema.parse(value);
  const key = createHash("sha256").update(`${uid}:${input.id}`).digest("hex");
  const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const english = input.language === "en-US";
  const { transcript: _transcript, ...metadata } = input;
  const result = await store.create(key, {
    ...metadata, uid, fingerprint, originalTranscript: input.transcript,
    englishTranslation: english ? input.transcript : "",
    translationStatus: english ? "complete" : "pending",
    status: "new", createdAt: new Date().toISOString(),
  });
  if (!result.same) throw new Error("This feedback was already submitted with different content. Submit it as new feedback.");
  if (result.translated) return { saved: true as const, translationStatus: "complete" as const };
  try {
    const translation = (await translate(input.transcript, input.language)).trim();
    if (!translation || translation.length > 12000) throw new Error("Invalid translation");
    await store.translated(key, translation);
    return { saved: true as const, translationStatus: "complete" as const };
  } catch {
    // Retain the original; the reviewer can retry translation later.
    return { saved: true as const, translationStatus: "pending" as const };
  }
}

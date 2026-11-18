import type { RoleplayPractice } from "../core/roleplayTypes";
import { httpsCallable } from "firebase/functions";
import { demoReply, demoTranslation } from "../core/demo";
import { stripEmphasis } from "../core/speechText";
import { splitCorrections } from "../core/corrections";
import { type Message, type Provider, type Settings, type PracticeCounter } from "../core/domain";
import type { UsageOverview } from "../core/usage";
import { firebase } from "./firebase";
import type { PracticeContext } from "../core/practiceContext";
import type { GrammarPractice } from "../core/grammar";
import { conversationSessionId, isPaywallError, publishConversationAccess } from "./conversationAccess";
import type { ConversationAccess } from "../core/conversationAccess";

export type Connections = {
  providers: Record<Provider, boolean>;
  access: boolean;
  message: string;
};
async function call<T>(data: unknown): Promise<T> {
  if (!firebase?.auth.currentUser)
    throw new Error("Sign in to your Language Partner account first.");
  const uid = firebase.auth.currentUser.uid;
  try {
    const result = await httpsCallable<unknown, T & { conversationAccess?: ConversationAccess }>(firebase.functions, "llm", {
      timeout: 70000,
    })({ ...(data as object), conversationSessionId });
    if (firebase.auth.currentUser?.uid !== uid) throw new Error("The account has changed.");
    if (result.data.conversationAccess) publishConversationAccess(uid, result.data.conversationAccess);
    return result.data;
  } catch (error: any) {
    if (isPaywallError(error) && error.details.access) publishConversationAccess(uid, error.details.access);
    throw error;
  }
}
export const connections = () => call<Connections>({ action: "connections" });
export const partnerUsage = (accountId: string, practice?: PracticeCounter) =>
  call<UsageOverview>({ action: "usage", accountId, ...(practice ? { practice } : {}) });
export const connectProvider = (provider: Provider, model: string) =>
  call<{ ok: true }>({ action: "connect", provider, model, trackPractice: true });
export async function reply(
  messages: Message[],
  settings: Settings,
  practice?: PracticeContext,
  grammar?: GrammarPractice,
  roleplay?: RoleplayPractice,
): Promise<string> {
  return (await replyWithCorrections(messages, settings, practice, grammar, roleplay)).text;
}
// The partner's reply, with the hidden log of the learner's mistakes split off.
export async function replyWithCorrections(
  messages: Message[],
  settings: Settings,
  practice?: PracticeContext,
  grammar?: GrammarPractice,
  roleplay?: RoleplayPractice,
) {
  return splitCorrections(await rawReply(messages, settings, practice, grammar, roleplay));
}
async function rawReply(
  messages: Message[],
  settings: Settings,
  practice?: PracticeContext,
  grammar?: GrammarPractice,
  roleplay?: RoleplayPractice,
): Promise<string> {
  if (settings.mode === "demo" && roleplay) {
    if (!messages.some((message) => message.role === "assistant"))
      return roleplay.openingLanguage === settings.target
        ? roleplay.openingPrompt
        : "Sign in to roleplay in your selected language.";
    return "This is a sample opening. Sign in to continue the roleplay with replies and feedback.";
  }
  if (settings.mode === "demo")
    return demoReply(messages, settings.target, grammar);
  // The app shows plain text, so emphasis markers a model adds anyway are dropped.
  return stripEmphasis((
    await call<{ text: string }>({
      action: "generate",
      trackPractice: true,
      messages: messages.slice(-40),
      settings,
      ...(practice ? { practice } : {}),
      ...(grammar ? { grammar } : {}),
      ...(roleplay ? { roleplay } : {}),
    })
  ).text);
}
export async function summarizeConversation(
  messages: Message[],
  settings: Settings,
  previousSummary = "",
) {
  if (settings.mode !== "api")
    throw new Error(
      "Sign in to prepare a summary, or write one yourself.",
    );
  return (
    await call<{ text: string }>({
      action: "summarize",
      trackPractice: true,
      settings,
      messages: messages.slice(-40),
      previousSummary,
    })
  ).text;
}
export async function translate(
  text: string,
  source: string,
  target: string,
  context: Message[],
  settings: Settings,
): Promise<string | undefined> {
  if (settings.mode === "demo") return demoTranslation(text, source, target);
  return (
    await call<{ text: string }>({
      action: "translate",
      trackPractice: true,
      text,
      source,
      target,
      context: context.slice(-8),
      settings,
    })
  ).text;
}

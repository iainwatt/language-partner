import type { RoleplayPractice } from "../core/roleplayTypes";
import { httpsCallable } from "firebase/functions";
import { demoReply, demoTranslation } from "../core/demo";
import { stripEmphasis } from "../core/speechText";
import { annotateScript, scriptCases, scriptText, turnNotes } from "../core/script";
import { type Message, type Provider, type Settings, type PracticeCounter } from "../core/domain";
import type { UsageOverview } from "../core/usage";
import { firebase } from "./firebase";
import type { PracticeContext } from "../core/practiceContext";
import type { VideoPractice } from "../core/videos";
import type { GrammarPractice } from "../core/grammar";
import { conversationSessionId, isPaywallError, publishConversationAccess } from "./conversationAccess";
import type { ConversationAccess } from "../core/conversationAccess";

export type Connections = {
  providers: Record<Provider, boolean>;
  access: boolean;
  message: string;
};
async function call<T>(data: unknown, timeout = 70000): Promise<T> {
  if (!firebase?.auth.currentUser)
    throw new Error("Sign in to your Language Partner account first.");
  const uid = firebase.auth.currentUser.uid;
  try {
    const result = await httpsCallable<unknown, T & { conversationAccess?: ConversationAccess }>(firebase.functions, "llm", {
      timeout,
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
// The partner's reply, with its corrections of the learner's turn kept apart.
export async function replyWithCorrections(
  messages: Message[],
  settings: Settings,
  practice?: PracticeContext,
  grammar?: GrammarPractice,
  roleplay?: RoleplayPractice,
  // The learner's first name, if known, for the partner's question about their gender.
  learnerName?: string,
  // The video being discussed, with the words saved from it.
  video?: VideoPractice,
): Promise<{ text: string; corrections?: string; meant?: string; speaker?: "male" | "female" }> {
  if (settings.mode === "demo" && video) return { text: "Sign in to talk about this video with your partner." };
  if (settings.mode === "demo") return { text: await demoOrRoleplay(messages, settings, grammar, roleplay) };
  const result = await call<{ text: string; corrections?: string; meant?: string; speaker?: "male" | "female" }>({
    action: "generate",
    trackPractice: true,
    messages: chatTurns(messages),
    settings,
    ...(learnerName && !settings.speaker ? { learnerName: learnerName.slice(0, 60) } : {}),
    ...(practice ? { practice } : {}),
    ...(grammar ? { grammar } : {}),
    ...(roleplay ? { roleplay } : {}),
    ...(video ? { video } : {}),
  });
  // The app shows plain text, so emphasis markers a model adds anyway are dropped.
  return {
    text: stripEmphasis(result.text),
    ...(result.corrections ? { corrections: stripEmphasis(result.corrections) } : {}),
    ...(result.meant ? { meant: result.meant } : {}),
    ...(result.speaker ? { speaker: result.speaker } : {}),
  };
}
async function demoOrRoleplay(
  messages: Message[],
  settings: Settings,
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
  return demoReply(messages, settings.target, grammar);
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
// The chat as the server needs it: recent turns, without what the app keeps for itself.
const chatTurns = (messages: Message[], most = 40) => messages.slice(-most).map(({ corrections, meant, ...message }) => message);
// Step one of the conversation script: what the learner said, as one blurb in
// their own language. Pass the earlier draft and their feedback to revise it.
export async function conversationOutline(
  messages: Message[],
  settings: Settings,
  saved: { phrase: string; meaning: string }[],
  // A change to the outline already there. `whole` is the full piece when
  // `draft` is one paragraph selected from it; `points` is what the learner said.
  revise?: { draft: string; feedback: string; whole?: string; points?: string },
): Promise<{ outline: string; points?: string }> {
  if (settings.mode !== "api") throw new Error("Sign in to prepare a script.");
  const step = async (name: "points" | "write" | "check" | "revise", data: object) =>
    stripEmphasis((await call<{ text: string }>({ action: "outline", step: name, trackPractice: true, settings, ...data }, writerTimeout)).text);
  const words = scriptWords(saved, 60);
  if (revise) return { outline: await step("revise", { ...revise, saved: words }), points: revise.points };
  const notes = turnNotes(messages);
  // Three calls, each with one job: list what was said, write the piece, check
  // nothing was left out. With notes of what was meant, the chat itself is not sent.
  const said = notes ? { notes } : { messages: chatTurns(messages, 400) };
  const points = await step("points", said);
  const draft = await step("write", { points, saved: words });
  // The check gets what was actually said, so it can verify names and relationships.
  return { outline: await step("check", { ...said, points, saved: words, draft }), points };
}
// The summary and script are long pieces from the larger model, so they may take a while.
const writerTimeout = 175000;
const scriptWords = (list: { phrase: string; meaning: string }[], most: number) =>
  list.slice(0, most).map(({ phrase, meaning }) => ({ phrase: phrase.slice(0, 300), meaning: meaning.slice(0, 300) }));
// Step two: the approved outline as natural speech in the language being learned.
export async function conversationScript(
  outline: string,
  messages: Message[],
  settings: Settings,
  saved: { phrase: string; meaning: string }[],
  dictionary: { phrase: string; meaning: string }[],
) {
  if (settings.mode !== "api") throw new Error("Sign in to prepare a script.");
  const step = async (data: object) =>
    (await call<{ text: string }>({ action: "script", trackPractice: true, settings, ...data }, writerTimeout)).text;
  const written = stripEmphasis(await step({
    step: "write", outline, messages: chatTurns(messages),
    saved: scriptWords(saved, 60), dictionary: scriptWords(dictionary, 30),
  }));
  // Case endings are marked by their own call on the finished text. If that
  // call fails, or changes the text, the script is simply shown without them.
  const cases = scriptCases[settings.target]
    ? await step({ step: "cases", text: scriptText(written) }).catch(() => undefined)
    : undefined;
  return annotateScript(written, { cases }).script;
}
// What each saved word in a script means where it stands, in the learner's
// own language. Answers that do not line up with the question are dropped.
export async function scriptMeanings(text: string, phrases: string[], settings: Settings): Promise<{ text: string; meaning: string }[]> {
  if (settings.mode !== "api") throw new Error("Sign in to see key words in your own language.");
  if (!phrases.length) return [];
  const asked = phrases.slice(0, 80);
  const answer = (await call<{ text: string }>({ action: "script", step: "meanings", settings, text: text.slice(0, 16000), phrases: asked })).text;
  let meanings: unknown;
  try {
    meanings = JSON.parse(answer.slice(answer.indexOf("["), answer.lastIndexOf("]") + 1));
  } catch {}
  if (!Array.isArray(meanings) || meanings.length !== asked.length) throw new Error("The meanings could not be prepared. Please try again.");
  return asked.flatMap((phrase, index) => {
    const meaning = typeof meanings[index] === "string" ? meanings[index].trim().slice(0, 300) : "";
    return meaning ? [{ text: phrase, meaning }] : [];
  });
}
// The end of each sentence in the learner's own language, to read on from its
// opening words. Asked for in batches; a batch that comes back the wrong
// length is dropped, and those sentences simply stay hidden.
export async function scriptRests(sentences: { start: string; rest: string }[], settings: Settings): Promise<{ rest: string; meaning: string }[]> {
  if (settings.mode !== "api") throw new Error("Sign in to see the rest of each sentence in your own language.");
  const usable = sentences.filter((item) => item.rest.length <= 1200).map((item) => ({ start: item.start.slice(-300), rest: item.rest }));
  const found: { rest: string; meaning: string }[] = [];
  for (let at = 0; at < usable.length; at += 40) {
    const batch = usable.slice(at, at + 40);
    const answer = (await call<{ text: string }>({ action: "script", step: "rests", settings, sentences: batch })).text;
    let meanings: unknown;
    try {
      meanings = JSON.parse(answer.slice(answer.indexOf("["), answer.lastIndexOf("]") + 1));
    } catch {}
    if (!Array.isArray(meanings) || meanings.length !== batch.length) continue;
    batch.forEach((item, index) => {
      const meaning = typeof meanings[index] === "string" ? meanings[index].trim() : "";
      if (meaning) found.push({ rest: item.rest, meaning });
    });
  }
  if (usable.length && !found.length) throw new Error("The sentences could not be put into your language. Please try again.");
  return found;
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

// How to say something in the language being learned: the natural version,
// and a close rendering of the learner's own wording when the two differ.
export async function translateNatural(
  text: string,
  source: string,
  target: string,
  context: Message[],
  settings: Settings,
): Promise<{ text?: string; literal?: string }> {
  if (settings.mode === "demo") return { text: demoTranslation(text, source, target) };
  // Only a request from the learner's own language into the one they are learning.
  if (source !== settings.native || target !== settings.target) return { text: await translate(text, source, target, context, settings) };
  return call<{ text: string; literal?: string }>({
    action: "translate", natural: true, trackPractice: true, text, source, target, context: chatTurns(context, 8), settings,
  });
}
// After a phrase is saved: is there a more natural way to say it?
export async function reviewPhrase(
  entry: { phrase: string; meaning: string; example?: { text: string } },
  settings: Settings,
): Promise<{ phrase: string; reason: string } | undefined> {
  if (settings.mode !== "api") return undefined;
  return (await call<{ suggestion?: { phrase: string; reason: string } }>({
    action: "review", trackPractice: true, settings,
    phrase: entry.phrase.slice(0, 600), meaning: entry.meaning.slice(0, 2000),
    ...(entry.example ? { example: entry.example.text.slice(0, 600) } : {}),
  }, writerTimeout)).suggestion;
}

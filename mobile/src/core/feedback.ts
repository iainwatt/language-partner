import { z } from "zod";
import { languages } from "./domain";

export const feedbackRequestSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  transcript: z.string().trim().min(1).max(6000),
  language: z.enum(languages.map(({ code }) => code)),
  targetLanguage: z.enum(languages.map(({ code }) => code)),
  screen: z.enum(["chat", "dictionary", "practice", "conversations", "grammar", "roleplay", "issues", "videos", "stats"]),
  appVersion: z.string().max(40),
  buildNumber: z.string().max(40).default("unknown"),
  platform: z.enum(["ios", "android", "web", "unknown"]),
}).strict();
export type FeedbackRequest = z.infer<typeof feedbackRequestSchema>;

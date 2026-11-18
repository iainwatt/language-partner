import { z } from "zod";

export const roleplayPracticeSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  title: z.string().trim().min(1).max(160),
  learnerRole: z.string().trim().min(1).max(160),
  partnerRole: z.string().trim().min(1).max(160),
  setting: z.string().trim().min(1).max(500),
  objectives: z.array(z.string().trim().min(1).max(200)).min(1).max(4),
  openingPrompt: z.string().trim().min(1).max(400),
  openingLanguage: z.string().trim().min(1).max(20),
  prompt: z.string().trim().min(1).max(3000),
});
export type RoleplayPractice = z.infer<typeof roleplayPracticeSchema>;

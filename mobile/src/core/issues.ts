import { z } from "zod";
import { documentIdSchema, id, languages } from "./domain";
import { firestoreFields } from "./cloudDictionary";

// Something the learner wants to work on, in their own words. "partner" is
// reserved for issues picked up from the learner's saved mistakes.
const language = z.enum(languages.map((item) => item.code) as [string, ...string[]]);
export const issueSchema = z.object({
  id: documentIdSchema,
  text: z.string().trim().min(1).max(2000),
  native: language,
  target: language,
  source: z.enum(["learner", "partner"]),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});
export type Issue = z.infer<typeof issueSchema>;

export function newIssue(text: string, native: string, target: string, now = new Date()): Issue {
  const at = now.toISOString();
  return issueSchema.parse({ id: id(), text, native, target, source: "learner", createdAt: at, updatedAt: at });
}
export const editIssue = (issue: Issue, text: string, now = new Date()): Issue =>
  issueSchema.parse({ ...issue, text, updatedAt: now.toISOString() });

// Newest first, for the practice language on screen.
export const issuesFor = (issues: Issue[], target: string) =>
  issues.filter((issue) => issue.target === target).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

// Firestore commit writes: an issue to save, or an ID to delete.
export function issueWrite(database: string, uid: string, change: Issue | { delete: string }) {
  if (!uid || uid.includes("/")) throw new Error("Invalid account.");
  const name = (issueId: string) =>
    `${database}/documents/users/${uid}/issues/${documentIdSchema.parse(issueId)}`;
  if ("delete" in change) return { delete: name(change.delete) };
  const issue = issueSchema.parse(change);
  return { update: { name: name(issue.id), fields: firestoreFields(issue) } };
}

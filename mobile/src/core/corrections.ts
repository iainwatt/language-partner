import { z } from "zod";

// Broad on purpose, so the same mistake always lands under the same label.
// "misheard" marks a speech-recognition slip, which is not the learner's error.
export const correctionCategories = [
  "case",
  "verb form",
  "tense or aspect",
  "agreement",
  "preposition",
  "word choice",
  "word order",
  "other",
  "misheard",
] as const;
export const correctionSchema = z.object({
  category: z.enum(correctionCategories),
  said: z.string().trim().min(1).max(300),
  better: z.string().trim().min(1).max(300),
});
export type Correction = z.infer<typeof correctionSchema>;

// Separate the reply the learner sees from the model's trailing <log> block.
// Lines that do not fit the format are dropped; the reply is never lost.
export function splitCorrections(raw: string): { text: string; corrections: Correction[] } {
  const corrections: Correction[] = [];
  const text = raw
    .replace(/<log>([\s\S]*?)(?:<\/log>|$)/gi, (_, body: string) => {
      for (const line of body.split("\n")) {
        const [category, said, better] = line.split("|").map((part) => part.trim());
        const parsed = correctionSchema.safeParse({ category: category?.toLowerCase(), said, better });
        if (parsed.success && corrections.length < 8) corrections.push(parsed.data);
      }
      return "";
    })
    .trim();
  return { text, corrections };
}

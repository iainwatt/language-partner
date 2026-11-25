// Compare phrase review prompt/model versions side by side:
//   npm run eval:review -- v0 v1
//   npm run eval:review -- v1 --repeats 3
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { managedModel, managedWriter } from "../src/core/managedAi";
import { reviewVerdict } from "../server/llm";
import { reviewPrompts } from "../server/prompts";
import { generate } from "../server/providers";
import { reviewSchemaFormat } from "../server/schemas";
import { russianReviewCases, type ReviewCase } from "./review.cases.ru";
import { apiKeys, option, pool, rate, table } from "./shared";

type ReviewVersion = keyof typeof reviewPrompts;
const args = process.argv.slice(2);
const repeats = Math.max(1, Number(option(args, "repeats") ?? 3));
const only = option(args, "case");
const versions = (args.length ? args : ["v0", "v1"]) as ReviewVersion[];
if (versions.some((version) => !(version in reviewPrompts))) {
  console.error(`Review versions: ${Object.keys(reviewPrompts).join(", ")}`);
  process.exit(1);
}
const cases = russianReviewCases.filter((item) => !only || item.id.includes(only));

type Run = {
  version: ReviewVersion;
  caseId: string;
  raw: string;
  passed: boolean;
  hasSuggestion: boolean;
  failure?: string;
};

async function once(testCase: ReviewCase, version: ReviewVersion, keys: ReturnType<typeof apiKeys>): Promise<Run> {
  const target = version === "v0" ? { ...managedWriter, effort: undefined } : managedModel("review");
  const settings = { ...target, mode: "api" as const, native: "en-US", target: "ru-RU", autoSpeak: false };
  const input = JSON.stringify({
    phrase: testCase.phrase,
    meaning: testCase.meaning,
    ...(testCase.example ? { example: testCase.example } : {}),
  });
  try {
    const raw = await generate(
      settings,
      [{ role: "user", text: input }],
      reviewPrompts[version]("English", "Русский"),
      keys,
      fetch,
      undefined,
      version === "v0" ? undefined : { effort: target.effort, format: reviewSchemaFormat },
    );
    const result = reviewVerdict(raw, testCase.phrase);
    const hasSuggestion = !!result.suggestion;
    const matchedExpected = !testCase.expectSuggestion
      ? !hasSuggestion
      : hasSuggestion && (!testCase.expectedAny || testCase.expectedAny.some((part) => result.suggestion!.phrase.toLowerCase().includes(part.toLowerCase())));
    return { version, caseId: testCase.id, raw, passed: matchedExpected, hasSuggestion };
  } catch (error) {
    return { version, caseId: testCase.id, raw: "", passed: false, hasSuggestion: false, failure: (error as Error).message };
  }
}

async function main() {
  const keys = apiKeys();
  const jobs = versions.flatMap((version) => cases.flatMap((testCase) => Array.from({ length: repeats }, () => ({ version, testCase }))));
  console.log(`${jobs.length} model calls: ${versions.join(", ")} × ${cases.length} cases × ${repeats} repeats`);
  const runs: Run[] = [];
  await pool(jobs, async ({ version, testCase }) => { runs.push(await once(testCase, version, keys)); });
  const of = (version: ReviewVersion) => runs.filter((run) => run.version === version);
  const summary = table(
    ["Check", ...versions],
    [
      ["overall pass", ...versions.map((v) => rate(of(v).filter((r) => r.passed).length, of(v).length))],
      ["ok kept untouched", ...versions.map((v) => {
        const sub = of(v).filter((r) => !cases.find((c) => c.id === r.caseId)!.expectSuggestion);
        return rate(sub.filter((r) => r.passed).length, sub.length);
      })],
      ["calques improved", ...versions.map((v) => {
        const sub = of(v).filter((r) => cases.find((c) => c.id === r.caseId)!.expectSuggestion);
        return rate(sub.filter((r) => r.passed).length, sub.length);
      })],
      ["failed calls", ...versions.map((v) => String(of(v).filter((r) => r.failure).length))],
    ],
  );
  console.log(summary);
  mkdirSync(join("evals", "results"), { recursive: true });
  const file = join("evals", "results", `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-review-${versions.join("-vs-")}`);
  writeFileSync(`${file}.md`, `# Phrase review eval: ${versions.join(" vs ")}\n\n${summary}\n`);
  writeFileSync(`${file}.json`, JSON.stringify({ versions, repeats, runs }, null, 2));
  console.log(`\nResults: ${file}.md`);
}
void main();

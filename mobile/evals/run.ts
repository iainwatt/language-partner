// Run prompt versions over the eval cases and report how each behaves.
//   npm run eval -- v2                 one version, 5 repeats per case
//   npm run eval -- v1 v2 --repeats 3  two versions side by side
//   npm run eval -- v2 --case slip     only cases whose id contains "slip"
// Needs an OpenAI key: LLM_API_KEYS in the environment, or in functions/.secret.local.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { managedPartner } from "../src/core/managedAi";
import { chatInstruction, llmRequestSchema, parseKeys } from "../server/llm";
import { generate } from "../server/providers";
import { chatPrompts, type ChatPromptVersion } from "../server/prompts";
import { chatSchemaFormat } from "../server/schemas";
import { judge, type CheckName, type EvalCase, type Verdict } from "./checks";
import { russianCases } from "./cases.ru";
import { report, type Run } from "./report";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args.splice(at, 2)[1];
};
const repeats = Math.max(1, Number(option("repeats") ?? 5));
const only = option("case");
const versions = args as ChatPromptVersion[];
if (!versions.length || versions.some((version) => !(version in chatPrompts))) {
  console.error(`Name one or more prompt versions: ${Object.keys(chatPrompts).join(", ")}`);
  process.exit(1);
}
const cases = russianCases.filter((item) => !only || item.id.includes(only));

function keys() {
  let raw = process.env.LLM_API_KEYS;
  if (!raw)
    try {
      raw = readFileSync(join("functions", ".secret.local"), "utf8").match(/^LLM_API_KEYS=(.*)$/m)?.[1];
    } catch {}
  const parsed = parseKeys(raw ?? "");
  if (!parsed.openai) {
    console.error("No OpenAI key found. Set LLM_API_KEYS, or add it to functions/.secret.local.");
    process.exit(1);
  }
  return parsed;
}

async function once(testCase: EvalCase, version: ChatPromptVersion, apiKeys: ReturnType<typeof keys>) {
  const turns = [...testCase.history, { role: "user" as const, text: testCase.turn }];
  const request = llmRequestSchema.parse({
    action: "generate",
    settings: { ...managedPartner, mode: "api", native: "en-US", target: "ru-RU", autoSpeak: false, speaker: "male" },
    messages: turns.map((turn, index) => ({
      ...turn, id: `m${index}`, final: true, createdAt: "2026-01-01T00:00:00.000Z",
    })),
  });
  if (request.action !== "generate") throw new Error("Expected a chat request");
  const options = version === "v7" ? { effort: "low" as const, format: chatSchemaFormat } : undefined;
  return generate(request.settings, request.messages, chatInstruction(request, chatPrompts[version]), apiKeys, fetch, undefined, options);
}

async function main() {
  const apiKeys = keys();
  const jobs = versions.flatMap((version) =>
    cases.flatMap((testCase) => Array.from({ length: repeats }, () => ({ version, testCase }))),
  );
  console.log(`${jobs.length} model calls: ${versions.join(", ")} × ${cases.length} cases × ${repeats} repeats`);
  const runs: Run[] = [];
  let next = 0;
  // A few calls at a time keeps within rate limits without taking all day.
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < jobs.length) {
        const { version, testCase } = jobs[next++];
        try {
          const raw = await once(testCase, version, apiKeys);
          runs.push({ version, caseId: testCase.id, raw, verdict: judge(testCase, raw) });
        } catch (error) {
          runs.push({ version, caseId: testCase.id, raw: "", failure: (error as Error).message });
        }
        process.stdout.write(".");
      }
    }),
  );
  console.log("\n");
  const { summary, document } = report(versions, cases, runs, repeats);
  console.log(summary);
  mkdirSync(join("evals", "results"), { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const file = join("evals", "results", `${stamp}-${versions.join("-vs-")}`);
  writeFileSync(`${file}.md`, document);
  writeFileSync(`${file}.json`, JSON.stringify({ versions, repeats, runs }, null, 2));
  console.log(`\nEvery reply, side by side: ${file}.md`);
}
void main();

export type { CheckName, Verdict };

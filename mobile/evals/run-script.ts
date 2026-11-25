// Run the two-step conversation script over the eval cases and report on it.
//   npm run eval:script                   3 repeats per case, current prompt versions
//   npm run eval:script -- --repeats 1    a quick look
//   npm run eval:script -- --case work    only cases whose id contains "work"
//   npm run eval:script -- --summary v0 --script v2    named prompt versions
// Needs an OpenAI key: LLM_API_KEYS in the environment, or in functions/.secret.local.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { managedModel, managedWriter } from "../src/core/managedAi";
import { llmRequestSchema, outlineStep, scriptStep } from "../server/llm";
import { generate } from "../server/providers";
import {
  annotatePrompts,
  annotatePromptVersion,
  scriptPrompts,
  scriptPromptVersion,
  summaryPrompts,
  summaryPromptVersion,
} from "../server/prompts";
import { casesSchemaFormat } from "../server/schemas";
import { annotateScript, applyWordCases, scriptText } from "../src/core/script";
import { judgeOutline, judgeRevision, judgeScript, wordCount, type Checks, type ScriptCase } from "./script.checks";
import { russianScriptCases } from "./script.cases.ru";
import { apiKeys, option, pool, rate, table } from "./shared";

const args = process.argv.slice(2);
const repeats = Math.max(1, Number(option(args, "repeats") ?? 3));
const only = option(args, "case");
const outlineVersion = (option(args, "summary") ?? summaryPromptVersion) as keyof typeof summaryPrompts;
const scriptVersion = (option(args, "script") ?? scriptPromptVersion) as keyof typeof scriptPrompts;
const annotateVersion = (option(args, "annotate") ?? annotatePromptVersion) as keyof typeof annotatePrompts;
if (!(outlineVersion in summaryPrompts) || !(scriptVersion in scriptPrompts) || !(annotateVersion in annotatePrompts)) {
  console.error(`Summary versions: ${Object.keys(summaryPrompts).join(", ")}. Script versions: ${Object.keys(scriptPrompts).join(", ")}. Annotate versions: ${Object.keys(annotatePrompts).join(", ")}.`);
  process.exit(1);
}
const cases = russianScriptCases.filter((item) => !only || item.id.includes(only));
type Run = { caseId: string; points?: string; firstDraft?: string; outline?: string; written?: string; applied?: { cases: number; stress: number }; revised?: string; script?: string; checks: Checks; failure?: string };

async function once(testCase: ScriptCase, keys: ReturnType<typeof apiKeys>): Promise<Run> {
  const run: Run = { caseId: testCase.id, checks: {} };
  const baseSettings = { ...managedWriter, mode: "api" as const, native: "en-US", target: "ru-RU", autoSpeak: false, speaker: "male" as const };
  const ask = async (request: { action: "outline" | "script"; step?: string; [key: string]: unknown }) => {
    const useNewRouting =
      (request.action === "outline" && outlineVersion === "v4") ||
      (request.action === "script" && request.step === "write" && scriptVersion === "v8") ||
      (request.action === "script" && request.step === "cases" && annotateVersion !== "v0");
    const target = useNewRouting ? managedModel(request.action, request.step) : managedWriter;
    const input = llmRequestSchema.parse({ ...request, settings: { ...baseSettings, ...target } });
    const step = input.action === "outline" ? outlineStep(input, summaryPrompts[outlineVersion])
      : input.action === "script" ? scriptStep(input, scriptPrompts[scriptVersion], annotatePrompts[annotateVersion]) : undefined;
    if (!step || !("settings" in input)) throw new Error("Unexpected request");
    const effort = useNewRouting && "effort" in target ? target.effort : undefined;
    const format = request.action === "script" && request.step === "cases" && annotateVersion === "v2" ? casesSchemaFormat : undefined;
    const raw = (await generate(input.settings, [{ role: "user", text: step.data }], step.instruction, keys, fetch, undefined, { ...(effort ? { effort } : {}), ...(format ? { format } : {}) })).trim();
    if (format && typeof request.text === "string" && raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as { items?: unknown[] };
      if (Array.isArray(parsed.items)) return applyWordCases(request.text, parsed.items as any);
    }
    return raw;
  };
  const messages = testCase.turns.map((turn, index) => ({ ...turn, id: `m${index}`, final: true, createdAt: "2026-01-01T00:00:00.000Z" }));
  try {
    // The same three calls the app makes: list the points, write the piece, check it.
    run.points = await ask({ action: "outline", step: "points", messages });
    run.firstDraft = await ask({ action: "outline", step: "write", points: run.points, saved: testCase.saved });
    run.outline = await ask({ action: "outline", step: "check", points: run.points, saved: testCase.saved, draft: run.firstDraft });
    Object.assign(run.checks, judgeOutline(testCase, run.outline));
    if (testCase.feedback) {
      run.revised = await ask({ action: "outline", step: "revise", draft: run.outline, feedback: testCase.feedback.text, points: run.points, saved: testCase.saved });
      Object.assign(run.checks, judgeRevision(testCase, run.revised));
    }
    // As in the app: write the script, then mark the cases in a separate call,
    // kept only where it left the text unchanged.
    run.written = await ask({
      action: "script", step: "write", messages, outline: run.revised ?? run.outline,
      saved: testCase.saved, dictionary: testCase.dictionary,
    });
    const text = scriptText(run.written);
    const cases = await ask({ action: "script", step: "cases", text }).catch(() => undefined);
    const annotated = annotateScript(run.written, { cases });
    run.script = annotated.script;
    run.applied = annotated.applied;
    Object.assign(run.checks, judgeScript(testCase, run.script));
  } catch (error) {
    run.failure = (error as Error).message;
  }
  return run;
}

async function main() {
  const keys = apiKeys();
  const jobs = cases.flatMap((testCase) => Array.from({ length: repeats }, () => testCase));
  console.log(`Up to ${jobs.length * 6} model calls: ${cases.length} cases × ${repeats} repeats, summary ${String(outlineVersion)}, script ${String(scriptVersion)}`);
  const runs: Run[] = [];
  await pool(jobs, async (testCase) => { runs.push(await once(testCase, keys)); });
  const names = [...new Set(runs.flatMap((run) => Object.keys(run.checks)))];
  const of = (id: string) => runs.filter((run) => run.caseId === id);
  const cell = (list: Run[], name: string) => {
    const relevant = list.filter((run) => name in run.checks);
    return rate(relevant.filter((run) => run.checks[name]).length, relevant.length);
  };
  const average = (values: number[]) => (values.length ? String(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)) : "–");
  const summary = [
    table(["Scored check", "all", ...cases.map((item) => item.id)],
      names.map((name) => [name, cell(runs, name), ...cases.map((item) => cell(of(item.id), name))])),
    table(["Reported, not scored", "all", ...cases.map((item) => item.id)], [
      ["average words in the outline", ...[runs, ...cases.map((item) => of(item.id))].map((list) =>
        average(list.flatMap((run) => (run.revised ?? run.outline ? [wordCount((run.revised ?? run.outline)!)] : []))))],
      ["average words in the script", ...[runs, ...cases.map((item) => of(item.id))].map((list) =>
        average(list.flatMap((run) => (run.script ? [wordCount(scriptText(run.script))] : []))))],
      ["case marks kept (share of paragraphs)", ...[runs, ...cases.map((item) => of(item.id))].map((list) =>
        average(list.flatMap((run) => (run.applied ? [run.applied.cases * 100] : []))) + "%")],
      ["runs that failed part-way", ...[runs, ...cases.map((item) => of(item.id))].map((list) => String(list.filter((run) => run.failure).length))],
    ]),
  ].join("\n\n");
  console.log(summary);
  const block = (title: string, text?: string) => (text ? `**${title}**\n\n\`\`\`\n${text}\n\`\`\`` : "");
  const document = [
    `# Conversation script eval: summary ${String(outlineVersion)}, script ${String(scriptVersion)}`,
    `${repeats} repeats per case. Texts are shown exactly as the model wrote them, marks included.`,
    summary,
    ...cases.flatMap((testCase) => [
      `## ${testCase.id}`,
      testCase.about,
      block("Learner's turns", testCase.turns.filter((turn) => turn.role === "user").map((turn) => turn.text).join("\n")),
      ...of(testCase.id).flatMap((run, index) => {
        const failed = Object.entries(run.checks).filter(([, passed]) => !passed).map(([name]) => name);
        return [
          `### Run ${index + 1}${run.failure ? ` — STOPPED: ${run.failure}` : ""}${failed.length ? ` — FAILED: ${failed.join("; ")}` : ""}`,
          block("Step 1: points", run.points),
          block("Step 2: first draft", run.firstDraft),
          block("Step 3: checked summary", run.outline),
          block(`After "${testCase.feedback?.text}"`, run.revised),
          block("Script", run.script),
        ];
      }),
    ]),
  ].filter(Boolean).join("\n\n");
  mkdirSync(join("evals", "results"), { recursive: true });
  const file = join("evals", "results", `${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-script-${outlineVersion}-${scriptVersion}`);
  writeFileSync(`${file}.md`, `${document}\n`);
  writeFileSync(`${file}.json`, JSON.stringify({ outlineVersion, scriptVersion, repeats, runs }, null, 2));
  console.log(`\nEvery outline and script: ${file}.md`);
}
void main();

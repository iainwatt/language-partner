import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseKeys } from "../server/llm";

// The OpenAI key, from the environment or the local emulator's secret file.
export function apiKeys() {
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
// Take `--name value` out of the arguments and return the value.
export function option(args: string[], name: string) {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? undefined : args.splice(at, 2)[1];
}
export const rate = (passed: number, total: number) =>
  total ? `${passed}/${total} (${Math.round((100 * passed) / total)}%)` : "–";
export function table(head: string[], rows: string[][]) {
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}
// Run jobs a few at a time, which keeps within rate limits.
export async function pool<T>(jobs: T[], work: (job: T) => Promise<void>, width = 4) {
  let next = 0;
  await Promise.all(Array.from({ length: width }, async () => {
    while (next < jobs.length) {
      await work(jobs[next++]);
      process.stdout.write(".");
    }
  }));
  console.log("\n");
}

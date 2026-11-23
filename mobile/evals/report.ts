import type { CheckName, EvalCase, Verdict } from "./checks";

export type Run = { version: string; caseId: string; raw: string; verdict?: Verdict; failure?: string };

const checkNames: CheckName[] = ["format", "plain text", "slip left alone", "error corrected", "clean turn untouched"];
const rate = (passed: number, total: number) =>
  total ? `${passed}/${total} (${Math.round((100 * passed) / total)}%)` : "–";
const average = (values: number[]) =>
  values.length ? String(Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)) : "–";
function table(head: string[], rows: string[][]) {
  return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.join(" | ")} |`)].join("\n");
}

// Turn the raw runs into a summary for the terminal and a document with every reply.
export function report(versions: string[], cases: EvalCase[], runs: Run[], repeats: number) {
  const of = (version: string) => runs.filter((run) => run.version === version && run.verdict);
  const scored = table(
    ["Scored check", ...versions],
    checkNames.map((name) => [
      name,
      ...versions.map((version) => {
        const relevant = of(version).filter((run) => name in run.verdict!.checks);
        return rate(relevant.filter((run) => run.verdict!.checks[name]).length, relevant.length);
      }),
    ]),
  );
  const observed = (label: string, pick: (verdict: Verdict) => boolean | undefined) => [
    label,
    ...versions.map((version) => {
      const relevant = of(version).filter((run) => pick(run.verdict!) !== undefined);
      return rate(relevant.filter((run) => pick(run.verdict!)).length, relevant.length);
    }),
  ];
  const reported = table(
    ["Reported, not scored", ...versions],
    [
      ["average words in the reply", ...versions.map((version) => average(of(version).map((run) => run.verdict!.observed.replyWords)))],
      ["average words of corrections, when present", ...versions.map((version) =>
        average(of(version).map((run) => run.verdict!.observed.correctionWords).filter(Boolean)))],
      observed("reply ends with a question", (verdict) => verdict.observed.endsWithQuestion),
      observed("slip recorded as misheard", (verdict) => verdict.observed.slipsFlagged),
      observed("note of what was meant, in English", (verdict) => verdict.observed.noted),
      ...(["first", "middle", "last"] as const).map((place) =>
        observed(`corrections placed ${place}`, (verdict) =>
          verdict.observed.position === "none" ? undefined : verdict.observed.position === place)),
      ...(["corrected", "flagged as misheard", "left alone"] as const).map((outcome) =>
        observed(`ambiguous form ${outcome}`, (verdict) =>
          verdict.observed.ambiguous === undefined ? undefined : verdict.observed.ambiguous === outcome)),
      ["model calls that failed", ...versions.map((version) =>
        String(runs.filter((run) => run.version === version && run.failure).length))],
    ],
  );
  const scoredCheck = (testCase: EvalCase): CheckName | undefined =>
    testCase.kind === "slip" ? "slip left alone" : testCase.kind === "error" ? "error corrected" : testCase.kind === "clean" ? "clean turn untouched" : undefined;
  const perCase = table(
    ["Case", "Checks", ...versions],
    cases.map((testCase) => [
      testCase.id,
      scoredCheck(testCase) ?? "reported only",
      ...versions.map((version) => {
        const mine = of(version).filter((run) => run.caseId === testCase.id);
        const name = scoredCheck(testCase);
        return name
          ? rate(mine.filter((run) => run.verdict!.checks[name]).length, mine.length)
          : mine.map((run) => run.verdict!.observed.ambiguous).join(", ");
      }),
    ]),
  );
  const summary = [scored, reported, perCase].join("\n\n");
  const replies = cases
    .map((testCase) =>
      [
        `## ${testCase.id}`,
        testCase.about,
        `Learner: ${testCase.turn}`,
        ...versions.flatMap((version) =>
          runs
            .filter((run) => run.version === version && run.caseId === testCase.id)
            .map((run, index) => {
              const failed = run.verdict ? Object.entries(run.verdict.checks).filter(([, passed]) => !passed).map(([name]) => name) : [];
              return `### ${version}, run ${index + 1}${failed.length ? ` — FAILED: ${failed.join(", ")}` : ""}\n\n\`\`\`\n${run.failure ? `Call failed: ${run.failure}` : run.raw}\n\`\`\``;
            }),
        ),
      ].join("\n\n"),
    )
    .join("\n\n");
  return {
    summary,
    document: `# Chat prompt eval: ${versions.join(" vs ")}\n\n${repeats} repeats per case. Replies are shown exactly as the model wrote them, tags included.\n\n${summary}\n\n${replies}\n`,
  };
}

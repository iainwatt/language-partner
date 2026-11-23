import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { editIssue, issueSchema, issuesFor, issueWrite, newIssue } from "../src/core/issues";

const at = new Date("2026-11-18T12:00:00.000Z");

test("a learner's issue keeps their words, languages and dates, and edits move it to the top", () => {
  const first = newIssue("  when to use от… до… and when с… по…  ", "en-US", "ru-RU", at);
  assert.deepEqual({ ...first, id: "x" }, {
    id: "x", text: "when to use от… до… and when с… по…", native: "en-US", target: "ru-RU",
    source: "learner", createdAt: at.toISOString(), updatedAt: at.toISOString(),
  });
  const second = newIssue("много, немного, мало, несколько", "en-US", "ru-RU", new Date("2026-11-18T12:05:00.000Z"));
  const spanish = newIssue("ser or estar", "en-US", "es-ES", at);
  assert.deepEqual(issuesFor([first, spanish, second], "ru-RU").map((issue) => issue.id), [second.id, first.id]);
  const edited = editIssue(first, "the по- prefix", new Date("2026-11-18T13:00:00.000Z"));
  assert.equal(edited.createdAt, first.createdAt);
  assert.deepEqual(issuesFor([second, edited], "ru-RU")[0], edited);
  assert.throws(() => newIssue("   ", "en-US", "ru-RU"));
  assert.throws(() => newIssue("x", "en-US", "xx-XX"));
});

test("issue writes target only the account's own issues collection", () => {
  const issue = newIssue("inside, outside, upstairs, downstairs", "en-US", "ru-RU", at);
  const database = "projects/p/databases/(default)";
  const write: any = issueWrite(database, "uid1", issue);
  assert.equal(write.update.name, `${database}/documents/users/uid1/issues/${issue.id}`);
  assert.deepEqual(Object.keys(write.update.fields).sort(), ["createdAt", "id", "native", "source", "target", "text", "updatedAt"]);
  assert.deepEqual(issueWrite(database, "uid1", { delete: issue.id }), { delete: `${database}/documents/users/uid1/issues/${issue.id}` });
  assert.throws(() => issueWrite(database, "a/b", issue));
  assert.throws(() => issueWrite(database, "uid1", { delete: "../other" }));
});

test("the security rules cover exactly the fields an issue has", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const fields = rules.match(/function validIssue[\s\S]*?hasOnly\(\[([^\]]+)\]/)![1].replace(/['\s]/g, "").split(",");
  assert.deepEqual(fields.sort(), Object.keys(issueSchema.shape).sort());
  assert.match(rules, /match \/users\/\{uid\}\/issues\/\{issueId\}/);
});

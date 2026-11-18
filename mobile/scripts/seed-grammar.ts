import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { languages } from "../src/core/domain";
import { bundledGrammarTopics } from "../src/core/grammar";

const projectId = process.argv[2] ?? process.env.GCLOUD_PROJECT;
if (!projectId)
  throw new Error(
    "Pass the Firebase project ID: npm run seed:grammar -- PROJECT_ID",
  );

const requestedLanguage = process.argv[3];
const selectedLanguages = requestedLanguage
  ? languages.filter(({ code }) => code === requestedLanguage)
  : languages;
if (!selectedLanguages.length)
  throw new Error(
    `Unknown language ${requestedLanguage}. Use one of: ${languages
      .map(({ code }) => code)
      .join(", ")}`,
  );

async function main() {
  if (!getApps().length) initializeApp({ projectId });
  const database = getFirestore();
  const batch = database.batch();
  let count = 0;

  for (const { code } of selectedLanguages) {
    for (const topic of bundledGrammarTopics(code)) {
      const { id, language: _language, ...fields } = topic;
      batch.set(database.doc(`grammar/${code}/topics/${id}`), fields, {
        merge: true,
      });
      count++;
    }
  }

  await batch.commit();
  console.log(`Seeded ${count} grammar topics in ${projectId}.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

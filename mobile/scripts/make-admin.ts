// Let an account manage shared content in the app (for now: delete videos).
// Give the account's User UID, from Authentication > Users in the Firebase
// console, or its email address. The UID needs only Firestore access; looking
// an account up by email also needs the Identity Toolkit API on the project
// your Google credentials bill to.
//   npm run make:admin -- PROJECT_ID USER_UID
//   npm run make:admin -- PROJECT_ID you@example.com
//   npm run make:admin -- PROJECT_ID USER_UID remove
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const [projectId, account, action] = process.argv.slice(2);
if (!projectId || !account || (action && action !== "remove"))
  throw new Error("Usage: npm run make:admin -- PROJECT_ID USER_UID_OR_EMAIL [remove]");

async function main() {
  if (!getApps().length) initializeApp({ projectId });
  const uid = account.includes("@") ? (await getAuth().getUserByEmail(account)).uid : account;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error(`"${uid}" does not look like a User UID.`);
  const admin = getFirestore().doc(`admins/${uid}`);
  if (action === "remove") {
    await admin.delete();
    console.log(`${account} is no longer an admin of ${projectId}.`);
  } else {
    await admin.set({ addedAt: new Date().toISOString() });
    console.log(`${account} is now an admin of ${projectId}.`);
  }
}
void main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});

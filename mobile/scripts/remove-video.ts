// Take a video out of the "Watch and repeat" library.
//   npm run remove:video -- PROJECT_ID ru-RU "https://youtu.be/VIDEO"
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { youtubeId } from "../src/core/videos";

const [projectId, language, link] = process.argv.slice(2);
if (!projectId || !language || !link)
  throw new Error('Usage: npm run remove:video -- PROJECT_ID LANGUAGE "YOUTUBE_LINK_OR_ID"');
const id = youtubeId(link);
if (!id) throw new Error(`Could not find a YouTube video ID in ${link}`);

async function main() {
  if (!getApps().length) initializeApp({ projectId });
  const video = getFirestore().doc(`videos/${language}/items/${id}`);
  const found = await video.get();
  if (!found.exists) throw new Error(`There is no video ${id} under ${language} in ${projectId}.`);
  await video.delete();
  console.log(`Removed "${found.get("title")}" from ${language} in ${projectId}.`);
}
void main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});

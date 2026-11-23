// Add a video to the "Watch and repeat" library, from its YouTube link and a
// subtitle export with a time column (Language Reactor's .xlsx, or .srt/.vtt).
//   npm run add:video -- PROJECT_ID ru-RU "https://youtu.be/VIDEO" subtitles.xlsx "Optional title"
// Running it again for the same video replaces its transcript.
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { linesFromRows, videoSchema, youtubeId } from "../src/core/videos";
import { readXlsx } from "./xlsx";

const [projectId, language, link, file, title] = process.argv.slice(2);
if (!projectId || !language || !link || !file)
  throw new Error('Usage: npm run add:video -- PROJECT_ID LANGUAGE "YOUTUBE_LINK" SUBTITLE_FILE ["Title"]');
const id = youtubeId(link);
if (!id) throw new Error(`Could not find a YouTube video ID in ${link}`);

// .srt and .vtt: blocks of "start --> end" followed by the text.
function captionRows(text: string) {
  return text.replace(/\r/g, "").split(/\n\s*\n/).flatMap((block) => {
    const lines = block.split("\n");
    const timing = lines.findIndex((line) => line.includes("-->"));
    if (timing < 0) return [];
    const start = lines[timing].split("-->")[0].trim().replace(",", ".");
    return [[start, lines.slice(timing + 1).join(" ").replace(/<[^>]+>/g, "").trim()]];
  });
}

async function main() {
  const data = readFileSync(file);
  const rows = /\.xlsx$/i.test(file) ? readXlsx(data) : captionRows(data.toString("utf8"));
  const video = videoSchema.parse({
    id,
    youtubeId: id,
    // A title cell above the table, as in Language Reactor's export, is used if none is given.
    title: title ?? rows.find((row) => typeof row[0] === "string" && row[0].trim() && row.filter(Boolean).length === 1 && !/-->/.test(String(row[0])))?.[0] ?? basename(file).replace(/\.\w+$/, "").replace(/^Language Reactor\s*[-–—]\s*/i, ""),
    language,
    lines: linesFromRows(rows),
    createdAt: new Date().toISOString(),
  });
  if (!video.lines.length) throw new Error(`No timed lines were found in ${file}.`);
  if (!getApps().length) initializeApp({ projectId });
  await getFirestore().doc(`videos/${language}/items/${id}`).set(video);
  console.log(`Added "${video.title}" with ${video.lines.length} lines to ${language} in ${projectId}.`);
}
void main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});

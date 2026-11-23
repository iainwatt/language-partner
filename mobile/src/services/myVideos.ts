import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { firestoreFields } from "../core/cloudDictionary";
import { videoSchema, type Video } from "../core/videos";
import { commit } from "./dictionary";
import { firebase } from "./firebase";

// The videos the learner found and saved themselves, newest first.
export function useMyVideos(uid: string | undefined, language: string, report: (message: string) => void) {
  const [videos, setVideos] = useState<Video[]>([]);
  useEffect(() => {
    setVideos([]);
    if (!uid || !firebase) return;
    return onSnapshot(
      collection(firebase.db, "users", uid, "videos"),
      (snapshot) =>
        setVideos(
          snapshot.docs
            .flatMap((doc) => {
              const parsed = videoSchema.safeParse({ ...doc.data(), id: doc.id });
              return parsed.success && parsed.data.language === language ? [parsed.data] : [];
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      (error) => report(error.message),
    );
  }, [uid, language, report]);
  return videos;
}

const name = (database: string, uid: string, id: string) => `${database}/documents/users/${uid}/videos/${id}`;
export async function saveMyVideo(uid: string | undefined, input: Video) {
  if (!uid || uid.includes("/")) throw new Error("Sign in to save videos.");
  const video = videoSchema.parse(input);
  await commit(uid, (database) => [{ update: { name: name(database, uid, video.id), fields: firestoreFields(video) } }]);
}
export async function removeMyVideo(uid: string | undefined, id: string) {
  if (!uid || uid.includes("/") || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error("Sign in to manage your videos.");
  await commit(uid, (database) => [{ delete: name(database, uid, id) }]);
}
// A video whose transcript could not be fetched is noted for the library's owner,
// who can add one by hand. Best effort: failing to leave the note costs nothing.
export async function requestTranscript(uid: string | undefined, video: Video) {
  if (!uid || uid.includes("/")) return;
  try {
    await commit(uid, (database) => [{
      update: {
        name: `${database}/documents/videoRequests/${video.language}_${video.youtubeId}`,
        fields: firestoreFields({ youtubeId: video.youtubeId, title: video.title, language: video.language, note: video.note ?? "", createdAt: new Date().toISOString() }),
      },
    }]);
  } catch {}
}

// A video's title and channel, from YouTube's public page-preview service.
// It refuses videos that are private, removed or not allowed to be embedded,
// which are the ones the app's player could not show either.
export async function videoDetails(youtubeId: string): Promise<{ title: string; channel?: string }> {
  let response: Response;
  // The phone has no ready-made timeout for a request, so one is set by hand.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`,
      { signal: controller.signal },
    );
  } catch {
    throw new Error("YouTube could not be reached. Check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error("This video cannot be played in the app. It may be private, removed, or not allowed outside YouTube.");
  const details = (await response.json()) as { title?: unknown; author_name?: unknown };
  return {
    title: typeof details.title === "string" ? details.title : "",
    ...(typeof details.author_name === "string" ? { channel: details.author_name } : {}),
  };
}

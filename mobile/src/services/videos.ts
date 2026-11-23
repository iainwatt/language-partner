import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { commit } from "./dictionary";
import { videoSchema, type Video } from "../core/videos";
import { firebase } from "./firebase";

// The videos in the library for one language, newest first.
export function useVideos(uid: string | undefined, language: string, report: (message: string) => void) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setVideos([]);
    setReady(false);
    setFailed(false);
    if (!uid || !firebase) return;
    return onSnapshot(
      collection(firebase.db, "videos", language, "items"),
      (snapshot) => {
        setVideos(
          snapshot.docs
            .flatMap((doc) => {
              const parsed = videoSchema.safeParse({ ...doc.data(), id: doc.id });
              return parsed.success ? [parsed.data] : [];
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setReady(true);
      },
      (error) => {
        setFailed(true);
        report(error.message);
      },
    );
  }, [uid, language, report]);
  return { videos, ready, failed };
}

// Whether this account may manage the shared library. Admins are listed in
// Firestore by the owner's tooling (scripts/make-admin.ts); the rules enforce it.
export function useAdmin(uid: string | undefined) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    setAdmin(false);
    if (!uid || !firebase) return;
    let current = true;
    getDoc(doc(firebase.db, "admins", uid))
      .then((snapshot) => { if (current) setAdmin(snapshot.exists()); })
      .catch(() => {});
    return () => { current = false; };
  }, [uid]);
  return admin;
}

// Refused by the rules for anyone who is not an admin.
export async function removeVideo(uid: string | undefined, language: string, id: string) {
  if (!uid || !/^[A-Za-z0-9_-]{1,128}$/.test(id) || !/^[A-Za-z-]{2,10}$/.test(language)) throw new Error("Sign in to manage videos.");
  await commit(uid, (database) => [{ delete: `${database}/documents/videos/${language}/items/${id}` }]);
}

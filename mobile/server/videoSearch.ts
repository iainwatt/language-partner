import { createHash } from "node:crypto";
import { searchResultSchema, type SearchResult } from "../src/core/videos";

// Searching YouTube for videos to watch and repeat, through its official Data
// API. A search costs 100 units of a daily allowance that starts at 10,000,
// so identical searches are answered from a day-long cache and each account
// is limited to a few fresh ones a day.
export const searchesPerDay = 10;
export const cacheMs = 24 * 60 * 60 * 1000;
export type VideoSearch = { query: string; language: string; length: "short" | "medium" | "any"; subtitled: boolean };

export const searchKey = (search: VideoSearch) =>
  createHash("sha256").update(JSON.stringify([search.query.toLowerCase().replace(/\s+/g, " "), search.language, search.length, search.subtitled])).digest("hex").slice(0, 40);

export function searchUrl(search: VideoSearch, key: string) {
  const parameters = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "15",
    q: search.query,
    relevanceLanguage: search.language.slice(0, 2),
    // Only videos that may be played in the app's embedded player.
    videoEmbeddable: "true",
    safeSearch: "moderate",
    key,
  });
  if (search.length !== "any") parameters.set("videoDuration", search.length);
  if (search.subtitled) parameters.set("videoCaption", "closedCaption");
  return `https://www.googleapis.com/youtube/v3/search?${parameters}`;
}
export const detailsUrl = (ids: string[], key: string) =>
  `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "snippet,contentDetails", id: ids.join(","), key })}`;

// "PT1H2M3S" as seconds.
export function isoSeconds(duration: string) {
  const match = duration.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match.map((part) => Number(part ?? 0));
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}
const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" };
const plain = (text: string) => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, code: string) => entities[code]);

type Details = { items?: { id?: string; snippet?: { title?: string; channelTitle?: string; liveBroadcastContent?: string }; contentDetails?: { duration?: string } }[] };
// The videos in the order the search returned them. Live streams and
// anything without a length are left out: there is nothing to repeat.
export function searchResults(ids: string[], details: Details): SearchResult[] {
  const byId = new Map((details.items ?? []).map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    const seconds = isoSeconds(item?.contentDetails?.duration ?? "");
    if (!item || !seconds || (item.snippet?.liveBroadcastContent ?? "none") !== "none") return [];
    const parsed = searchResultSchema.safeParse({
      youtubeId: id,
      title: plain(item.snippet?.title ?? "").slice(0, 200),
      channel: plain(item.snippet?.channelTitle ?? "").slice(0, 200),
      seconds,
    });
    return parsed.success ? [parsed.data] : [];
  });
}

export async function searchYouTube(search: VideoSearch, key: string, transport: typeof fetch = fetch): Promise<SearchResult[]> {
  const get = async (url: string) => {
    const response = await transport(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status === 403 ? "quota" : `YouTube answered ${response.status}`);
    return response.json();
  };
  const found = (await get(searchUrl(search, key))) as { items?: { id?: { videoId?: string } }[] };
  const ids = (found.items ?? []).flatMap((item) => (item.id?.videoId ? [item.id.videoId] : []));
  if (!ids.length) return [];
  return searchResults(ids, (await get(detailsUrl(ids, key))) as Details);
}

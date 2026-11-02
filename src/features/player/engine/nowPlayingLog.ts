import { log, type LogColor } from "@/shared/utils/logger";
import type { PlaybackSource, PlaybackStream } from "./playbackStream";

const SOURCE_COLORS: Record<PlaybackSource, LogColor> = {
  r2: "yellow",
  youtube: "red",
  "youtube-tv": "magenta",
  soundcloud: "blue",
  local: "gray",
};

interface StreamOrigin {
  source: PlaybackSource;
  standIn: boolean;
  codec: string;
  bitrate: number;
}

const origins = new Map<string, StreamOrigin>();

const LISTENING_STATS_KEY = "liner:listening-stats:v1";
const MIN_LISTENED_MS_TO_COUNT = 1_000;
const MAX_LISTENING_ENTRIES = 50_000;
let listeningSnapshot: ListeningEntry[] | null = null;

export interface ListeningEntry {
  trackId: string;
  title: string;
  artists: string;
  coverUrl?: string;
  listenedMs: number;
  playedAt: number;
}

export interface ListeningSummary {
  listenedMs: number;
  weeklyMinutes: number[];
  topTracks: Array<{
    trackId: string;
    title: string;
    artists: string;
    coverUrl?: string;
    listenedMs: number;
    plays: number;
  }>;
}

const listeningSubscribers = new Set<() => void>();

function readListeningEntries(): ListeningEntry[] {
  if (typeof localStorage === "undefined") return [];
  if (listeningSnapshot) return listeningSnapshot;
  try {
    const serialized = localStorage.getItem(LISTENING_STATS_KEY);
    const value: unknown = JSON.parse(serialized ?? "[]");
    if (!Array.isArray(value)) {
      listeningSnapshot = [];
      return listeningSnapshot;
    }
    listeningSnapshot = value.filter(
      (entry): entry is ListeningEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof entry.trackId === "string" &&
        typeof entry.title === "string" &&
        typeof entry.artists === "string" &&
        (entry.coverUrl === undefined || typeof entry.coverUrl === "string") &&
        Number.isFinite(entry.listenedMs) &&
        entry.listenedMs >= 0 &&
        Number.isFinite(entry.playedAt),
    );
    return listeningSnapshot;
  } catch {
    listeningSnapshot = [];
    return [];
  }
}

function writeListeningEntries(entries: ListeningEntry[]): void {
  if (typeof localStorage === "undefined") return;
  listeningSnapshot = entries.slice(-MAX_LISTENING_ENTRIES);
  try {
    localStorage.setItem(
      LISTENING_STATS_KEY,
      JSON.stringify(listeningSnapshot),
    );
  } catch {
    // Stats are best-effort and must never interrupt playback.
  }
  listeningSubscribers.forEach((listener) => listener());
}

export function recordListeningTime(
  track: Omit<ListeningEntry, "listenedMs" | "playedAt">,
  listenedMs: number,
  playedAt = Date.now(),
): void {
  if (!Number.isFinite(listenedMs) || listenedMs < MIN_LISTENED_MS_TO_COUNT)
    return;
  const entries = readListeningEntries();
  entries.push({ ...track, listenedMs: Math.round(listenedMs), playedAt });
  writeListeningEntries(entries);
}

export function startListeningSession(
  track: Omit<ListeningEntry, "listenedMs" | "playedAt">,
): number {
  const playedAt = Date.now();
  if (typeof localStorage !== "undefined") {
    const entries = readListeningEntries();
    entries.push({ ...track, listenedMs: 0, playedAt });
    writeListeningEntries(entries);
  }
  return playedAt;
}

export function finishListeningSession(
  trackId: string,
  playedAt: number,
  listenedMs: number,
): void {
  if (typeof localStorage === "undefined") return;
  const entries = readListeningEntries();
  const index = entries.findIndex(
    (entry) => entry.trackId === trackId && entry.playedAt === playedAt,
  );
  if (index < 0) return;
  if (!Number.isFinite(listenedMs) || listenedMs < MIN_LISTENED_MS_TO_COUNT) {
    entries.splice(index, 1);
  } else {
    entries[index].listenedMs = Math.round(listenedMs);
  }
  writeListeningEntries(entries);
}

export function getListeningEntries(): ListeningEntry[] {
  return readListeningEntries();
}

export function clearListeningEntries(): void {
  listeningSnapshot = [];
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(LISTENING_STATS_KEY);
    } catch {
      // Keep the current in-memory history cleared even if storage is blocked.
    }
  }
  listeningSubscribers.forEach((listener) => listener());
}

export function subscribeListeningEntries(listener: () => void): () => void {
  listeningSubscribers.add(listener);
  return () => listeningSubscribers.delete(listener);
}

export function getListeningSummary(
  entries = getListeningEntries(),
  now = new Date(),
): ListeningSummary {
  const weeklyMinutes = Array.from({ length: 7 }, () => 0);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const tracks = new Map<string, ListeningSummary["topTracks"][number]>();
  let listenedMs = 0;

  for (const entry of entries) {
    listenedMs += entry.listenedMs;
    const playedAt = new Date(entry.playedAt);
    if (playedAt >= weekStart && playedAt < weekEnd) {
      weeklyMinutes[(playedAt.getDay() + 6) % 7] += entry.listenedMs / 60_000;
    }
    const track = tracks.get(entry.trackId) ?? {
      trackId: entry.trackId,
      title: entry.title,
      artists: entry.artists,
      coverUrl: entry.coverUrl,
      listenedMs: 0,
      plays: 0,
    };
    track.listenedMs += entry.listenedMs;
    track.plays += 1;
    tracks.set(entry.trackId, track);
  }

  return {
    listenedMs,
    weeklyMinutes: weeklyMinutes.map(Math.round),
    topTracks: [...tracks.values()]
      .sort((a, b) => b.listenedMs - a.listenedMs)
      .slice(0, 10),
  };
}

export function rememberStreamOrigin(trackId: string, stream: PlaybackStream) {
  origins.set(trackId, {
    source: stream.source ?? "youtube",
    standIn: Boolean(stream.standIn),
    codec: stream.codec,
    bitrate: stream.bitrate,
  });
}

interface NowPlayingTrack {
  id: string;
  title: string;
  artists: string;
  coverUrl?: string;
}

export function logNowPlaying(
  track: NowPlayingTrack,
  fromCache: boolean,
  latencyMs: number,
): void {
  const origin = origins.get(track.id);
  const details: string[] = [];
  if (origin?.standIn) details.push("youtube stand-in");
  if (origin?.codec) details.push(origin.codec);
  if (origin?.bitrate)
    details.push(`${Math.round(origin.bitrate / 1000)} kbps`);
  if (fromCache) details.push("from cache");
  details.push(`${latencyMs} ms`);
  log(
    origin ? SOURCE_COLORS[origin.source] : "gray",
    origin?.source ?? "cache",
    `now playing "${track.title}" — ${track.artists} · ${details.join(" · ")}`,
  );
}

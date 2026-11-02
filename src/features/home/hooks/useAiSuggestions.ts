import { useCallback, useEffect, useState } from "react";
import { api, toClientTrack } from "@/shared/api";
import type { Track } from "@/shared/types";
import { useRecentlyPlayed } from "./useRecentlyPlayed";

export type AiSuggestionsStatus =
  "idle" | "loading" | "ready" | "need-key" | "empty" | "error";

const SESSION_KEY = "liner:ai-suggestions:v1";

interface SessionCache {
  stamp: string;
  tracks: Track[];
}

function readCache(stamp: string): Track[] | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionCache;
    if (parsed.stamp !== stamp) return null;
    return parsed.tracks;
  } catch {
    return null;
  }
}

function writeCache(stamp: string, tracks: Track[]): void {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ stamp, tracks } satisfies SessionCache),
    );
  } catch {
    // storage may be full or unavailable — cache is best-effort
  }
}

// Asks ScoutCode (via the main process) for songs the user never played,
// then resolves each suggestion to a playable catalog track.
export function useAiSuggestions(limit = 12) {
  const { data: recentItems } = useRecentlyPlayed(30);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<AiSuggestionsStatus>("idle");

  const playedTracks = recentItems.filter((entry) => entry.type === "track");
  const stamp = playedTracks
    .map((entry) => entry.item.id)
    .slice(0, 30)
    .join(",");

  const load = useCallback(
    async (force: boolean) => {
      const electron = window.linerElectron;
      if (!electron?.ai) {
        setStatus("need-key");
        return;
      }
      setStatus("loading");
      try {
        const state = await electron.ai.status();
        if (!state?.hasKey) {
          setStatus("need-key");
          return;
        }

        if (!force) {
          const cached = readCache(stamp);
          if (cached) {
            setTracks(cached);
            setStatus(cached.length ? "ready" : "empty");
            return;
          }
        }

        const played = playedTracks.map((entry) => ({
          title: entry.item.title,
          artist: entry.item.artists,
        }));
        if (played.length < 3) {
          setStatus("empty");
          return;
        }

        const suggestions = await electron.ai.suggestTracks({
          played,
          count: limit,
        });
        if (!suggestions.length) {
          setStatus("empty");
          return;
        }

        const knownIds = new Set(playedTracks.map((entry) => entry.item.id));
        const resolved = await Promise.all(
          suggestions.map(async (suggestion) => {
            const query = `${suggestion.title} ${suggestion.artist}`.trim();
            try {
              const res = await api.search(query, "track");
              const hit = res.items.find(
                (item) => item.type === "track" && item.id,
              );
              if (!hit || hit.type !== "track") return null;
              const track = toClientTrack(hit);
              if (knownIds.has(track.id)) return null;
              knownIds.add(track.id);
              return track;
            } catch {
              return null;
            }
          }),
        );
        const found = resolved.filter((t): t is Track => t !== null);
        setTracks(found);
        writeCache(stamp, found);
        setStatus(found.length ? "ready" : "empty");
      } catch (error) {
        console.error("[ai] suggestions failed:", error);
        setStatus("error");
      }
    },
    [limit, playedTracks, stamp],
  );

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  return { tracks, status, refresh };
}

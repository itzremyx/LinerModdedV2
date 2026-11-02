import { useEffect, useMemo } from "react";
import { useCachedTracksStore } from "../cached";
import { useLocalTracks } from "../local/hooks/useLocalTracks";
import { useSavedTracks } from "../saved/hooks/useSavedTracks";
import { mergeOfflineTracks } from "../lib/offlineMix";

/**
 * Every track that plays without a connection: downloaded liked songs,
 * the audio cache and local files, deduplicated across the three sources.
 * Shared by the offline mix card and its detail page so both always agree.
 */
export function useOfflineTracks() {
  const { tracks: saved, isLoading: savedLoading } = useSavedTracks();
  const { tracks: local, isLoading: localLoading } = useLocalTracks();
  const cachedItems = useCachedTracksStore((state) => state.items);
  const cachedLoaded = useCachedTracksStore((state) => state.loaded);
  const loadCached = useCachedTracksStore((state) => state.load);

  useEffect(() => {
    void loadCached();
  }, [loadCached]);

  const tracks = useMemo(
    () =>
      mergeOfflineTracks(
        saved,
        cachedItems.map((item) => item.track),
        local,
      ),
    [saved, cachedItems, local],
  );

  return {
    tracks,
    isLoading: savedLoading || localLoading || !cachedLoaded,
  };
}

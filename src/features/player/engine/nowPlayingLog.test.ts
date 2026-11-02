import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearListeningEntries,
  finishListeningSession,
  getListeningEntries,
  getListeningSummary,
  recordListeningTime,
  startListeningSession,
  subscribeListeningEntries,
} from "./nowPlayingLog";

const track = { trackId: "track-1", title: "Track One", artists: "Artist" };

afterEach(() => {
  clearListeningEntries();
  vi.useRealTimers();
});

describe("listening history", () => {
  it("records valid listen time and ignores very short plays", () => {
    recordListeningTime(track, 999, 1_700_000_000_000);
    recordListeningTime(track, 12_345, 1_700_000_060_000);

    expect(getListeningEntries()).toEqual([
      { ...track, listenedMs: 12_345, playedAt: 1_700_000_060_000 },
    ]);
  });

  it("completes or removes a session when playback finishes", () => {
    const startedAt = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(startedAt);
    const session = startListeningSession(track);
    finishListeningSession(track.trackId, session, 60_501);

    expect(getListeningEntries()[0]?.listenedMs).toBe(60_501);

    const shortSession = startListeningSession({ ...track, trackId: "short" });
    finishListeningSession("short", shortSession, 500);
    expect(getListeningEntries()).toHaveLength(1);
  });

  it("summarizes weekly listening by day and sorts top tracks", () => {
    const now = new Date(2026, 10, 4, 12);
    // Weeks start on Monday (index 0). The test uses a Monday and Tuesday at 9am UTC.
    const monday = new Date(2026, 10, 2, 9).getTime(); // Monday
    const tuesday = new Date(2026, 10, 3, 9).getTime(); // Tuesday
    const summary = getListeningSummary(
      [
        { ...track, listenedMs: 120_000, playedAt: monday },
        { ...track, listenedMs: 60_000, playedAt: tuesday },
        {
          trackId: "track-2",
          title: "Track Two",
          artists: "Other Artist",
          listenedMs: 240_000,
          playedAt: tuesday,
        },
      ],
      now,
    );

    expect(summary.listenedMs).toBe(420_000);
    // Monday has 2 minutes (120,000 ms) and Tuesday totals 5 minutes (60,000 + 240,000 ms)
    expect(summary.weeklyMinutes.slice(0, 2)).toEqual([2, 5]);
    expect(summary.topTracks.map(({ trackId }) => trackId)).toEqual([
      "track-2",
      "track-1",
    ]);
  });

  it("notifies subscribers when entries change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeListeningEntries(listener);
    recordListeningTime(track, 5_000);
    unsubscribe();
    recordListeningTime(track, 5_000);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

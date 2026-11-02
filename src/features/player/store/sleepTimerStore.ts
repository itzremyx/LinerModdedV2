import { create } from "zustand";
import { playerEngine } from "../engine/playerEngine";
import { usePlayerStore } from "./playerStore";

export type SleepMode = "off" | "end-of-track" | number;

interface SleepTimerState {
  mode: SleepMode;
  endsAt: number | null;
  remaining: number;
  set: (mode: SleepMode) => void;
  cancel: () => void;
  onTrackStarted: () => void;
}

let ticker: ReturnType<typeof setInterval> | null = null;

function stopTicker() {
  if (ticker !== null) {
    clearInterval(ticker);
    ticker = null;
  }
}

function pausePlaybackIfPlaying() {
  if (usePlayerStore.getState().status === "playing") playerEngine.pause();
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => {
  const startTicker = () => {
    stopTicker();
    ticker = setInterval(() => {
      const { endsAt } = get();
      if (endsAt === null) {
        stopTicker();
        return;
      }
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      set({ remaining });
      if (remaining <= 0) {
        stopTicker();
        pausePlaybackIfPlaying();
        set({ mode: "off", endsAt: null, remaining: 0 });
      }
    }, 1000);
  };

  return {
    mode: "off",
    endsAt: null,
    remaining: 0,

    set: (mode) => {
      if (mode === "off") {
        stopTicker();
        set({ mode: "off", endsAt: null, remaining: 0 });
        return;
      }
      if (mode === "end-of-track") {
        stopTicker();
        set({ mode: "end-of-track", endsAt: null, remaining: 0 });
        return;
      }
      const endsAt = Date.now() + mode * 60 * 1000;
      set({ mode, endsAt, remaining: mode * 60 });
      startTicker();
    },

    cancel: () => {
      stopTicker();
      set({ mode: "off", endsAt: null, remaining: 0 });
    },

    onTrackStarted: () => {
      if (get().mode === "end-of-track") {
        // Pause when the track that was current when armed finishes:
        // called on transition to a *new* track, so pause at that moment.
        stopTicker();
        pausePlaybackIfPlaying();
        set({ mode: "off", endsAt: null, remaining: 0 });
      }
    },
  };
});

// Auto-subscribe to track changes to handle end-of-track mode without
// importing this store from playerEngine (avoids a circular dependency).
let lastTrackId: string | null = null;
usePlayerStore.subscribe((state) => {
  const id = state.currentTrack?.id ?? null;
  if (id !== lastTrackId) {
    const first = lastTrackId === null;
    lastTrackId = id;
    if (!first) useSleepTimerStore.getState().onTrackStarted();
  }
});

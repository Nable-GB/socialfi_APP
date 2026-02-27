import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import type { ApiTrack } from "../lib/api";
import { musicApi } from "../lib/api";

interface PlayerState {
  currentTrack: ApiTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: ApiTrack[];
}

interface PlayerContextType extends PlayerState {
  play: (track: ApiTrack) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  playNext: () => void;
  playPrev: () => void;
  addToQueue: (track: ApiTrack) => void;
  setQueue: (tracks: ApiTrack[]) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    queue: [],
  });
  const playRecordedRef = useRef<Set<string>>(new Set());

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = state.volume;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      setState(s => ({ ...s, currentTime: audio.currentTime }));
    });
    audio.addEventListener("loadedmetadata", () => {
      setState(s => ({ ...s, duration: audio.duration }));
    });
    audio.addEventListener("ended", () => {
      setState(s => ({ ...s, isPlaying: false }));
      // auto-play next
      playNextInternal();
    });
    audio.addEventListener("pause", () => {
      setState(s => ({ ...s, isPlaying: false }));
    });
    audio.addEventListener("play", () => {
      setState(s => ({ ...s, isPlaying: true }));
    });

    return () => { audio.pause(); audio.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback((track: ApiTrack) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.audioUrl;
    audio.play().catch(() => {});
    setState(s => ({ ...s, currentTrack: track, isPlaying: true, currentTime: 0 }));

    // Record play (fire and forget)
    if (!playRecordedRef.current.has(track.id)) {
      playRecordedRef.current.add(track.id);
      musicApi.recordPlay(track.id).catch(() => {});
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (audioRef.current) audioRef.current.volume = vol;
    setState(s => ({ ...s, volume: vol }));
  }, []);

  const playNextInternal = useCallback(() => {
    setState(s => {
      if (s.queue.length === 0 || !s.currentTrack) return s;
      const idx = s.queue.findIndex(t => t.id === s.currentTrack!.id);
      const next = s.queue[idx + 1];
      if (next) {
        setTimeout(() => play(next), 0);
      }
      return s;
    });
  }, [play]);

  const playNext = useCallback(() => {
    playNextInternal();
  }, [playNextInternal]);

  const playPrev = useCallback(() => {
    setState(s => {
      if (s.queue.length === 0 || !s.currentTrack) return s;
      const idx = s.queue.findIndex(t => t.id === s.currentTrack!.id);
      const prev = s.queue[idx - 1];
      if (prev) setTimeout(() => play(prev), 0);
      return s;
    });
  }, [play]);

  const addToQueue = useCallback((track: ApiTrack) => {
    setState(s => ({ ...s, queue: [...s.queue, track] }));
  }, []);

  const setQueue = useCallback((tracks: ApiTrack[]) => {
    setState(s => ({ ...s, queue: tracks }));
  }, []);

  return (
    <PlayerContext.Provider value={{ ...state, play, pause, resume, seek, setVolume, playNext, playPrev, addToQueue, setQueue }}>
      {children}
    </PlayerContext.Provider>
  );
}

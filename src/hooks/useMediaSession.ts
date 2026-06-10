import { useEffect } from "react";
import { Song } from "../types";

interface UseMediaSessionProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextSong: () => void;
  onPreviousSong: () => void;
  progress: number;
  setProgress: (secs: number) => void;
}

export function useMediaSession({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
  progress,
  setProgress
}: UseMediaSessionProps) {
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong) return;

    // Set metadata
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || "Melo Sound",
      artwork: [
        {
          src: currentSong.coverUrl || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300",
          sizes: "300x300",
          type: "image/jpeg"
        },
        {
          src: currentSong.coverUrl || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=512&h=512",
          sizes: "512x512",
          type: "image/jpeg"
        }
      ]
    });
  }, [currentSong]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong) return;

    // Sync playing/paused status
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

    // Set position state
    try {
      navigator.mediaSession.setPositionState({
        duration: currentSong.durationSeconds || 180,
        playbackRate: 1.0,
        position: progress
      });
    } catch (err) {
      console.warn("MediaSession setPositionState error:", err);
    }
  }, [currentSong, isPlaying, progress]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentSong) return;

    try {
      navigator.mediaSession.setActionHandler("play", onTogglePlay);
      navigator.mediaSession.setActionHandler("pause", onTogglePlay);
      navigator.mediaSession.setActionHandler("nexttrack", onNextSong);
      navigator.mediaSession.setActionHandler("previoustrack", onPreviousSong);
      
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          setProgress(details.seekTime);
        }
      });
    } catch (err) {
      console.warn("Failed to register MediaSession action handlers:", err);
    }

    return () => {
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    };
  }, [currentSong, onTogglePlay, onNextSong, onPreviousSong, setProgress]);
}

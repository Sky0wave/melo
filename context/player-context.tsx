import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Song, dbService } from '@/services/db';
import { useAuth } from './auth-context';

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  queue: Song[];
  isExpanded: boolean;
  playSong: (song: Song, newQueue?: Song[]) => void;
  pauseSong: () => void;
  resumeSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (seconds: number) => void;
  setIsExpanded: (expanded: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(180); // Default simulated 3 minutes (180s)
  const [queue, setQueue] = useState<Song[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const timerRef = useRef<any>(null);

  // Clear player state when user logs out or switches accounts
  useEffect(() => {
    setCurrentSong(null);
    setIsPlaying(false);
    setProgress(0);
    setQueue([]);
    setIsExpanded(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [user?.id]);

  // Stop playback timer on unmount or when song/playing changes
  useEffect(() => {
    if (isPlaying && currentSong) {
      // Start simulated playback timer
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            // End of song, go to next song
            clearInterval(timerRef.current!);
            setTimeout(() => nextSong(), 500);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentSong, duration]);

  // Record to recently played when song starts
  useEffect(() => {
    if (currentSong && user) {
      dbService.recordRecentlyPlayed(user.id, currentSong.id).catch(err => {
        console.error('Error recording recently played:', err);
      });
      // Pick a semi-random duration for simulation (between 140s and 260s)
      const randomDuration = Math.floor(Math.random() * (260 - 140 + 1)) + 140;
      setDuration(randomDuration);
      setProgress(0);
    }
  }, [currentSong, user]);

  const playSong = (song: Song, newQueue: Song[] = []) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);
    if (newQueue.length > 0) {
      setQueue(newQueue);
    } else if (!queue.some((s) => s.id === song.id)) {
      setQueue((prev) => [...prev, song]);
    }
  };

  const pauseSong = () => {
    setIsPlaying(false);
  };

  const resumeSong = () => {
    if (currentSong) {
      setIsPlaying(true);
    }
  };

  const nextSong = () => {
    if (queue.length === 0 || !currentSong) return;
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1]);
    } else {
      // Loop back to start or stop
      playSong(queue[0]);
    }
  };

  const prevSong = () => {
    if (queue.length === 0 || !currentSong) return;
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex > 0) {
      playSong(queue[currentIndex - 1]);
    } else {
      // Loop back to end
      playSong(queue[queue.length - 1]);
    }
  };

  const seek = (seconds: number) => {
    if (seconds >= 0 && seconds <= duration) {
      setProgress(seconds);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
        duration,
        queue,
        isExpanded,
        playSong,
        pauseSong,
        resumeSong,
        nextSong,
        prevSong,
        seek,
        setIsExpanded,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}

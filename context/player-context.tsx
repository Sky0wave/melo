import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Song, dbService } from '@/services/db';
import { useAuth } from './auth-context';
import { isSupabaseConfigured } from '@/services/supabase-client';

export interface JamRoomState {
  room_id: string;
  isHost: boolean;
  creator_id: string;
}

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
  // Jam properties
  jamRoom: JamRoomState | null;
  createJamRoom: (password: string) => Promise<string>;
  joinJamRoom: (roomId: string, password: string) => Promise<boolean>;
  leaveJamRoom: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Helper to map songs to SoundHelix sample MP3 streams for real playback
export const getAudioSourceForSong = (song: Song) => {
  const helixUrls: Record<string, string> = {
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a1': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a2': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a3': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a4': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a5': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a6': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a7': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    'f5b5f25a-4933-4f0e-be4c-0c1598f828a8': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  };
  return helixUrls[song.id] || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(180); // Default simulated 3 minutes (180s)
  const [queue, setQueue] = useState<Song[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Jam room state
  const [jamRoom, setJamRoom] = useState<JamRoomState | null>(null);

  const timerRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const isAudioInitializedRef = useRef<boolean>(false);
  const lastRecordedSongIdRef = useRef<string | null>(null);

  const nextSongRef = useRef<() => void>(() => {});
  useEffect(() => {
    nextSongRef.current = nextSong;
  });

  // Initialize expo-audio
  useEffect(() => {
    let subscription: any = null;
    let p: any = null;
    try {
      const { createAudioPlayer, setAudioModeAsync } = require('expo-audio');
      
      setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers'
      }).catch((err: any) => console.log('Audio mode config not available on this platform:', err));

      p = createAudioPlayer(null, {
        updateInterval: 500,
      });
      playerRef.current = p;
      isAudioInitializedRef.current = true;
      console.log('expo-audio successfully initialized for background playback.');

      subscription = p.addListener('playbackStatusUpdate', (status: any) => {
        setProgress(status.currentTime || 0);
        if (status.duration && status.duration > 0) {
          setDuration(status.duration);
        }
        setIsPlaying(status.playing);

        if (status.didJustFinish) {
          nextSongRef.current();
        }
      });
    } catch (error) {
      console.log('expo-audio not available. Falling back to simulated playback.', error);
    }

    return () => {
      if (subscription) subscription.remove();
      if (p) p.remove();
    };
  }, []);

  // Clear player state when user logs out or switches accounts, and load last played song
  useEffect(() => {
    if (user?.id) {
      setIsPlaying(false);
      setProgress(0);
      setIsExpanded(false);
      setJamRoom(null);
      
      // Load last played song
      dbService.getRecentlyPlayed(user.id)
        .then((history) => {
          if (history && history.length > 0) {
            const lastSong = history[0];
            setCurrentSong(lastSong);
            setQueue(history);
            // Pre-load in expo-audio if available (but don't play)
            if (isAudioInitializedRef.current && playerRef.current) {
              try {
                playerRef.current.replace(getAudioSourceForSong(lastSong));
                playerRef.current.pause();
              } catch (e) {
                console.error('Error pre-loading last played song:', e);
              }
            }
          } else {
            // Fallback: load all songs and use the first one
            dbService.getSongs().then((songs) => {
              if (songs && songs.length > 0) {
                const firstSong = songs[0];
                setCurrentSong(firstSong);
                setQueue(songs);
                if (isAudioInitializedRef.current && playerRef.current) {
                  playerRef.current.replace(getAudioSourceForSong(firstSong));
                  playerRef.current.pause();
                }
              }
            });
          }
        })
        .catch(err => {
          console.error('Error loading last played song for player startup:', err);
        });
    } else {
      setCurrentSong(null);
      setIsPlaying(false);
      setProgress(0);
      setQueue([]);
      setIsExpanded(false);
      setJamRoom(null);
      if (isAudioInitializedRef.current && playerRef.current) {
        playerRef.current.replace(null);
      }
    }
  }, [user?.id]);

  // Fallback simulated progress timer (only active if expo-audio failed to load)
  useEffect(() => {
    if (isAudioInitializedRef.current) return;

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

  // Record to recently played when song starts playing
  useEffect(() => {
    if (currentSong && user && isPlaying && lastRecordedSongIdRef.current !== currentSong.id) {
      dbService.recordRecentlyPlayed(user.id, currentSong.id)
        .then(() => {
          lastRecordedSongIdRef.current = currentSong.id;
        })
        .catch(err => {
          console.error('Error recording recently played:', err);
        });
    }
  }, [currentSong?.id, user?.id, isPlaying]);

  // Realtime subscription for Jam Room listeners
  useEffect(() => {
    if (!jamRoom || jamRoom.isHost || !user) return;

    let cleanupRealtime: (() => void) | null = null;

    if (isSupabaseConfigured) {
      const { supabase } = require('@/services/supabase-client');
      
      const channel = supabase
        .channel(`jam-room:${jamRoom.room_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jams',
            filter: `room_id=eq.${jamRoom.room_id}`
          },
          async (payload: any) => {
            const updatedJam = payload.new;
            if (!updatedJam) return;
            
            // Sync song
            if (updatedJam.current_song_id) {
              if (currentSong?.id !== updatedJam.current_song_id) {
                const allSongs = await dbService.getSongs();
                const song = allSongs.find(s => s.id === updatedJam.current_song_id);
                if (song) {
                  setCurrentSong(song);
                  if (isAudioInitializedRef.current && playerRef.current) {
                    playerRef.current.replace(getAudioSourceForSong(song));
                  }
                }
              }
            } else {
              setCurrentSong(null);
              if (isAudioInitializedRef.current && playerRef.current) {
                playerRef.current.replace(null);
              }
            }

            // Sync play/pause state
            setIsPlaying(updatedJam.current_song_is_playing);
            if (isAudioInitializedRef.current && playerRef.current) {
              if (updatedJam.current_song_is_playing) {
                playerRef.current.play();
              } else {
                playerRef.current.pause();
              }
            }

            // Sync progress (if drift is > 3 seconds)
            setProgress((prevProgress) => {
              const drift = Math.abs(prevProgress - updatedJam.current_song_progress);
              if (drift > 3) {
                if (isAudioInitializedRef.current && playerRef.current) {
                  playerRef.current.seekTo(updatedJam.current_song_progress);
                }
                return updatedJam.current_song_progress;
              }
              return prevProgress;
            });
          }
        )
        .subscribe();

      cleanupRealtime = () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Mock realtime fallback using a polling interval
      const interval = setInterval(async () => {
        try {
          const jam = await dbService.getJam(jamRoom.room_id);
          if (!jam) {
            // Room deleted by host, automatically leave
            clearInterval(interval);
            setJamRoom(null);
            alert('The Jam Room has been closed by the host.');
            return;
          }

          // Sync song
          if (jam.current_song_id) {
            if (currentSong?.id !== jam.current_song_id) {
              const allSongs = await dbService.getSongs();
              const song = allSongs.find(s => s.id === jam.current_song_id);
              if (song) {
                setCurrentSong(song);
                if (isAudioInitializedRef.current && playerRef.current) {
                  playerRef.current.replace(getAudioSourceForSong(song));
                }
              }
            }
          } else {
            setCurrentSong(null);
            if (isAudioInitializedRef.current && playerRef.current) {
              playerRef.current.replace(null);
            }
          }

          // Sync play/pause state
          setIsPlaying(jam.current_song_is_playing);
          if (isAudioInitializedRef.current && playerRef.current) {
            if (jam.current_song_is_playing) {
              playerRef.current.play();
            } else {
              playerRef.current.pause();
            }
          }

          // Sync progress (if drift is > 3 seconds)
          setProgress((prevProgress) => {
            const drift = Math.abs(prevProgress - jam.current_song_progress);
            if (drift > 3) {
              if (isAudioInitializedRef.current && playerRef.current) {
                playerRef.current.seekTo(jam.current_song_progress);
              }
              return jam.current_song_progress;
            }
            return prevProgress;
          });
        } catch (err) {
          console.error('Error polling mock jam state:', err);
        }
      }, 2000);

      cleanupRealtime = () => {
        clearInterval(interval);
      };
    }

    return () => {
      if (cleanupRealtime) cleanupRealtime();
    };
  }, [jamRoom?.room_id, jamRoom?.isHost, currentSong?.id, user]);

  // Periodic progress sync from Host to Database (every 5 seconds)
  useEffect(() => {
    if (!jamRoom || !jamRoom.isHost || !isPlaying || !currentSong) return;

    const interval = setInterval(() => {
      dbService.updateJam(jamRoom.room_id, {
        current_song_progress: Math.floor(progress)
      }).catch(err => console.error('Error sending periodic progress sync:', err));
    }, 5000);

    return () => clearInterval(interval);
  }, [jamRoom?.room_id, jamRoom?.isHost, isPlaying, currentSong?.id, progress]);

  // Jam creation
  const createJamRoom = async (password: string): Promise<string> => {
    if (!user) throw new Error('Must be logged in to create a Jam room');
    // Generate 8-digit random room ID
    const roomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    await dbService.createJam(roomId, password, user.id);
    setJamRoom({ room_id: roomId, isHost: true, creator_id: user.id });
    return roomId;
  };

  // Jam joining
  const joinJamRoom = async (roomId: string, password: string): Promise<boolean> => {
    if (!user) throw new Error('Must be logged in to join a Jam room');
    const jam = await dbService.getJam(roomId);
    if (!jam) {
      throw new Error('Jam room not found');
    }
    if (jam.password !== password) {
      throw new Error('Incorrect password');
    }

    // Stop local playback
    pauseSong();

    setJamRoom({
      room_id: roomId,
      isHost: jam.creator_id === user.id,
      creator_id: jam.creator_id
    });

    // Sync initial playback state
    if (jam.current_song_id) {
      const allSongs = await dbService.getSongs();
      const song = allSongs.find(s => s.id === jam.current_song_id);
      if (song) {
        setCurrentSong(song);
        setProgress(jam.current_song_progress);
        setIsPlaying(jam.current_song_is_playing);

        if (isAudioInitializedRef.current && playerRef.current) {
          playerRef.current.replace(getAudioSourceForSong(song));
          playerRef.current.seekTo(jam.current_song_progress);
          if (jam.current_song_is_playing) {
            playerRef.current.play();
          } else {
            playerRef.current.pause();
          }
        }
      }
    } else {
      setCurrentSong(null);
      setProgress(0);
      setIsPlaying(false);
      if (isAudioInitializedRef.current && playerRef.current) {
        playerRef.current.replace(null);
      }
    }

    return true;
  };

  // Leaving jam
  const leaveJamRoom = () => {
    if (jamRoom && jamRoom.isHost) {
      // Host closes the room for everyone
      dbService.deleteJam(jamRoom.room_id).catch(err => console.error('Error deleting jam room:', err));
    }
    setJamRoom(null);
  };

  const playSong = (song: Song, newQueue: Song[] = []) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);
    if (newQueue.length > 0) {
      setQueue(newQueue);
    } else if (!queue.some((s) => s.id === song.id)) {
      setQueue((prev) => [...prev, song]);
    }

    // Play via expo-audio if initialized
    if (isAudioInitializedRef.current && playerRef.current) {
      try {
        const audioUrl = getAudioSourceForSong(song);
        playerRef.current.replace(audioUrl);
        playerRef.current.play();
      } catch (err) {
        console.error('Error playing song with expo-audio:', err);
      }
    }

    // Host updates Jam room
    if (jamRoom && jamRoom.isHost) {
      dbService.updateJam(jamRoom.room_id, {
        current_song_id: song.id,
        current_song_progress: 0,
        current_song_is_playing: true
      }).catch(err => console.error('Error updating jam room on play:', err));
    }
  };

  const pauseSong = () => {
    setIsPlaying(false);
    if (isAudioInitializedRef.current && playerRef.current) {
      try {
        playerRef.current.pause();
      } catch (err) {
        console.error('Error pausing song with expo-audio:', err);
      }
    }

    // Host updates Jam room
    if (jamRoom && jamRoom.isHost) {
      dbService.updateJam(jamRoom.room_id, {
        current_song_is_playing: false,
        current_song_progress: Math.floor(progress)
      }).catch(err => console.error('Error updating jam room on pause:', err));
    }
  };

  const resumeSong = () => {
    if (currentSong) {
      setIsPlaying(true);
      if (isAudioInitializedRef.current && playerRef.current) {
        try {
          playerRef.current.play();
        } catch (err) {
          console.error('Error resuming song with expo-audio:', err);
        }
      }

      // Host updates Jam room
      if (jamRoom && jamRoom.isHost) {
        dbService.updateJam(jamRoom.room_id, {
          current_song_is_playing: true,
          current_song_progress: Math.floor(progress)
        }).catch(err => console.error('Error updating jam room on resume:', err));
      }
    }
  };

  const nextSong = () => {
    if (queue.length === 0 || !currentSong) return;
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex !== -1 && currentIndex < queue.length - 1) {
      playSong(queue[currentIndex + 1]);
    } else {
      // Loop back to start
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
      if (isAudioInitializedRef.current && playerRef.current) {
        try {
          playerRef.current.seekTo(seconds);
        } catch (err) {
          console.error('Error seeking song with expo-audio:', err);
        }
      }

      // Host updates Jam room
      if (jamRoom && jamRoom.isHost) {
        dbService.updateJam(jamRoom.room_id, {
          current_song_progress: Math.floor(seconds)
        }).catch(err => console.error('Error updating jam room on seek:', err));
      }
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
        jamRoom,
        createJamRoom,
        joinJamRoom,
        leaveJamRoom,
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


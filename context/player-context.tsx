import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Song, dbService, BACKEND_URL, SEED_SONGS } from '@/services/db';
import { useAuth } from './auth-context';
import { isSupabaseConfigured } from '@/services/supabase-client';
import { Platform, View } from 'react-native';

let WebView: any = null;
let TrackPlayer: any = null;
let State: any = null;
let Event: any = null;
let Capability: any = null;

if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    console.error('Failed to import react-native-webview:', e);
  }
  try {
    const trackPlayerMod = require('react-native-track-player');
    TrackPlayer = trackPlayerMod.default || trackPlayerMod;
    State = trackPlayerMod.State;
    Event = trackPlayerMod.Event;
    Capability = trackPlayerMod.Capability;
  } catch (e) {
    console.error('Failed to import react-native-track-player:', e);
  }
}

const playerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: black; }
    #player { width: 100%; height: 100%; }
  </style>
  <script src="https://www.youtube.com/iframe_api"></script>
</head>
<body>
  <div id="player"></div>
  <script>
    var player;
    var duration = 0;
    var lastTime = 0;

    // Override page visibility and focus/blur to prevent YouTube player from auto-pausing in background
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    document.hasFocus = function() { return true; };
    
    // Stop all visibility and focus/blur event propagation
    var preventSuspension = function(e) {
      e.stopImmediatePropagation();
    };
    window.addEventListener('visibilitychange', preventSuspension, true);
    document.addEventListener('visibilitychange', preventSuspension, true);
    window.addEventListener('blur', preventSuspension, true);
    document.addEventListener('blur', preventSuspension, true);

    function sendToRN(type, data) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: data }));
      }
    }

    window.onYouTubeIframeAPIReady = function() {
      sendToRN('ready', true);
    };

    function initPlayer(videoId, autoplay, startTime) {
      if (player) {
        try { player.destroy(); } catch(e) {}
      }
      player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          playsinline: 1,
          start: Math.floor(startTime || 0)
        },
        events: {
          onReady: function(event) {
            sendToRN('playerReady', { duration: player.getDuration() });
            if (autoplay) {
              event.target.playVideo();
            }
          },
          onStateChange: function(event) {
            sendToRN('stateChange', event.data);
          },
          onError: function(event) {
            sendToRN('error', event.data);
          }
        }
      });
    }

    setInterval(function() {
      if (player && player.getCurrentTime) {
        try {
          var currentTime = player.getCurrentTime();
          var dur = player.getDuration();
          if (currentTime !== lastTime || dur !== duration) {
            lastTime = currentTime;
            duration = dur;
            sendToRN('progress', { currentTime: currentTime, duration: dur });
          }
        } catch(e) {}
      }
    }, 1000);

    var handleMessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.action === 'load') {
          initPlayer(msg.videoId, msg.autoplay, msg.startTime);
        } else if (msg.action === 'play') {
          if (player && player.playVideo) player.playVideo();
        } else if (msg.action === 'pause') {
          if (player && player.pauseVideo) player.pauseVideo();
        } else if (msg.action === 'seek') {
          if (player && player.seekTo) player.seekTo(msg.time, true);
        }
      } catch(e) {
        sendToRN('log', 'Error handling message: ' + e.message);
      }
    };
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  </script>
</body>
</html>
`;

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
  chatMessages: { id: string; username: string; message: string; created_at: string }[];
  sendChatMessage: (messageText: string) => void;
  registerWebView: (ref: any) => void;
  handleWebViewMessage: (event: any) => void;
  playerHtml: string;
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
  if (helixUrls[song.id]) return helixUrls[song.id];

  // Try to parse YouTube Video ID
  let videoId: string | null = null;
  if (song.id && song.id.startsWith('yt_')) {
    videoId = song.id.replace('yt_', '');
  } else if (song.id && /^[a-zA-Z0-9_-]{11}$/.test(song.id)) {
    videoId = song.id;
  } else if (song.youtube_url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = song.youtube_url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
  }

  if (videoId) {
    return `${BACKEND_URL}/api/stream/${videoId}`;
  }

  const idStr = song.id || song.title || '1';
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const songNumber = Math.abs(hash % 8) + 1;
  return `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songNumber}.mp3`;
};

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentSong, setCurrentSong] = useState<Song | null>(SEED_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(180); // Default simulated 3 minutes (180s)
  const [queue, setQueue] = useState<Song[]>(SEED_SONGS);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Jam room state
  const [jamRoom, setJamRoom] = useState<JamRoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<{ id: string; username: string; message: string; created_at: string }[]>([]);

  const timerRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);
  const html5AudioRef = useRef<any>(null);
  const isAudioInitializedRef = useRef<boolean>(false);
  const lastRecordedSongIdRef = useRef<string | null>(null);
  const webViewRef = useRef<any>(null);

  const isYoutubeTrack = (song: Song | null): boolean => {
    if (Platform.OS !== 'web') return false;
    if (!song) return false;
    const isYtId = song.id && (song.id.startsWith('yt_') || /^[a-zA-Z0-9_-]{11}$/.test(song.id));
    return !!isYtId || !!song.youtube_url || (song as any).source === 'youtube';
  };

  const sendToWebView = (action: string, data?: any) => {
    if (Platform.OS !== 'web' && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ action, ...data }));
    }
  };

  const registerWebView = (ref: any) => {
    webViewRef.current = ref;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'progress') {
        const roundedTime = Math.floor(msg.data.currentTime || 0);
        setProgress(roundedTime);
        if (msg.data.duration && msg.data.duration > 0) {
          setDuration(Math.floor(msg.data.duration));
        }
      } else if (msg.type === 'stateChange') {
        if (msg.data === 1) {
          setIsPlaying(true);
        } else if (msg.data === 2) {
          setIsPlaying(false);
        } else if (msg.data === 0) {
          setIsPlaying(false);
          nextSong();
        }
      } else if (msg.type === 'playerReady') {
        if (msg.data.duration) {
          setDuration(Math.floor(msg.data.duration));
        }
      } else if (msg.type === 'error') {
        console.error('YouTube WebView Player error:', msg.data);
      } else if (msg.type === 'log') {
        console.log('WebView log:', msg.data);
      }
    } catch (e) {
      console.error('Failed to parse WebView message:', e);
    }
  };

  const nextSongRef = useRef<() => void>(() => {});
  useEffect(() => {
    nextSongRef.current = nextSong;
  });

  // Initialize standard HTML5 Audio player on Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const audio = new Audio();
      html5AudioRef.current = audio;

      const onTimeUpdate = () => {
        setProgress(audio.currentTime);
      };

      const onDurationChange = () => {
        setDuration(audio.duration || 180);
      };

      const onEnded = () => {
        nextSongRef.current();
      };

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('durationchange', onDurationChange);
      audio.addEventListener('ended', onEnded);

      return () => {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('durationchange', onDurationChange);
        audio.removeEventListener('ended', onEnded);
        audio.pause();
      };
    }
  }, []);

  // Sync playback state to Media Session API on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Initialize react-native-track-player
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    let isMounted = true;
    const initPlayer = async () => {
      try {
        if (!TrackPlayer) {
          console.warn('TrackPlayer module not loaded yet.');
          return;
        }
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
        });
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
        });
        if (isMounted) {
          isAudioInitializedRef.current = true;
          console.log('react-native-track-player successfully configured.');
        }
      } catch (err) {
        console.log('TrackPlayer setup error or already initialized:', err);
        if (isMounted) {
          isAudioInitializedRef.current = true;
        }
      }
    };

    initPlayer();

    // Request notification permissions for Android 13+
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const { PermissionsAndroid } = require('react-native');
      PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS')
        .then((status: string) => {
          console.log('POST_NOTIFICATIONS status:', status);
        })
        .catch((err: any) => {
          console.warn('Failed to request POST_NOTIFICATIONS permission:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Poll TrackPlayer progress and playback state
  useEffect(() => {
    if (Platform.OS === 'web' || !isAudioInitializedRef.current || !TrackPlayer) return;

    const interval = setInterval(async () => {
      try {
        if (currentSong && !isYoutubeTrack(currentSong)) {
          const state = await TrackPlayer.getPlaybackState();
          const isCurrentPlaying = state.state === State.Playing || state.state === 'playing';
          setIsPlaying(isCurrentPlaying);

          const trackProgress = await TrackPlayer.getProgress();
          setProgress(Math.floor(trackProgress.position));
          if (trackProgress.duration && trackProgress.duration > 0) {
            setDuration(Math.floor(trackProgress.duration));
          }
        }
      } catch (err) {
        // Ignore transition errors
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentSong, isAudioInitializedRef.current]);

  // Handle TrackPlayer queue ended event
  useEffect(() => {
    if (Platform.OS === 'web' || !isAudioInitializedRef.current || !TrackPlayer) return;

    const sub = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      if (currentSong && !isYoutubeTrack(currentSong)) {
        nextSongRef.current();
      }
    });

    return () => {
      sub.remove();
    };
  }, [currentSong, isAudioInitializedRef.current]);

  const loadSong = async (song: Song, shouldPlay: boolean) => {
    if (Platform.OS === 'web') {
      if (html5AudioRef.current) {
        html5AudioRef.current.src = getAudioSourceForSong(song);
        if (shouldPlay) {
          html5AudioRef.current.play().catch((err: any) => {
            console.warn('Playback prevented by browser policies, requires interaction first:', err);
          });
        } else {
          html5AudioRef.current.pause();
        }
      }
      return;
    }

    if (isYoutubeTrack(song)) {
      if (isAudioInitializedRef.current && TrackPlayer) {
        try {
          await TrackPlayer.reset();
        } catch (e) {
          console.log('Error resetting TrackPlayer:', e);
        }
      }

      let videoId = '';
      if (song.id && song.id.startsWith('yt_')) {
        videoId = song.id.replace('yt_', '');
      } else if (song.id && /^[a-zA-Z0-9_-]{11}$/.test(song.id)) {
        videoId = song.id;
      } else if (song.youtube_url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = song.youtube_url.match(regExp);
        if (match && match[2].length === 11) {
          videoId = match[2];
        }
      }

      console.log('Loading YouTube song via WebView videoId:', videoId);
      if (videoId) {
        sendToWebView('load', { videoId, autoplay: shouldPlay, startTime: progress });
      }

      // Keep the foreground service alive with a long silent audio file
      // so Android does not kill the process when the YouTube WebView plays
      if (isAudioInitializedRef.current && TrackPlayer) {
        try {
          // 1-hour silent MP3 — keeps the foreground media service active
          // without spamming events the way a 250ms loop would
          const silenceUrl = 'https://raw.githubusercontent.com/anars/blank-audio/master/1-hour-of-silence.mp3';
          console.log('[TrackPlayer] Starting long-silence background keep-alive');

          await TrackPlayer.add({
            id: 'silence',
            url: silenceUrl,
            title: song.title,
            artist: song.artist,
            artwork: song.coverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300',
            duration: 3600,
          });

          if (shouldPlay) {
            await TrackPlayer.play();
          }
        } catch (err) {
          console.error('[TrackPlayer] Error starting background silence keep-alive:', err);
        }
      }

      return;
    }

    sendToWebView('pause');

    if (!isAudioInitializedRef.current || !TrackPlayer) return;

    try {
      const audioUrl = getAudioSourceForSong(song);
      console.log('Creating TrackPlayer for URL:', audioUrl);
      
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: song.id,
        url: audioUrl,
        title: song.title,
        artist: song.artist,
        artwork: song.coverUrl || 'https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300',
      });

      if (shouldPlay) {
        await TrackPlayer.play();
        setIsPlaying(true);
      } else {
        await TrackPlayer.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('Error instantiating TrackPlayer:', err);
    }
  };


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
            if (isAudioInitializedRef.current) {
              loadSong(lastSong, false);
            }
          } else {
            // Fallback: load all songs and use the first one
            dbService.getSongs().then((songs) => {
              if (songs && songs.length > 0) {
                const firstSong = songs[0];
                setCurrentSong(firstSong);
                setQueue(songs);
                if (isAudioInitializedRef.current) {
                  loadSong(firstSong, false);
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
      if (isAudioInitializedRef.current && TrackPlayer) {
        TrackPlayer.pause().catch(() => {});
      }
    }
  }, [user?.id]);

  // Fallback simulated progress timer (only active if expo-audio failed to load and not on Web)
  useEffect(() => {
    if (isAudioInitializedRef.current || Platform.OS === 'web') return;

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
    if (!jamRoom || !user) return;

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
                const song = await dbService.getSongById(updatedJam.current_song_id);
                if (song) {
                  setCurrentSong(song);
                  if (isAudioInitializedRef.current) {
                    loadSong(song, updatedJam.current_song_is_playing);
                  } else if (Platform.OS === 'web' && html5AudioRef.current) {
                    html5AudioRef.current.src = getAudioSourceForSong(song);
                  }
                }
              }
            } else {
              setCurrentSong(null);
              if (isAudioInitializedRef.current && TrackPlayer) {
                TrackPlayer.pause().catch(() => {});
              } else if (Platform.OS === 'web' && html5AudioRef.current) {
                html5AudioRef.current.pause();
              }
            }

            // Sync play/pause state
            setIsPlaying(updatedJam.current_song_is_playing);
            if (isYoutubeTrack(currentSong)) {
              sendToWebView(updatedJam.current_song_is_playing ? 'play' : 'pause');
            } else if (isAudioInitializedRef.current && TrackPlayer) {
              if (updatedJam.current_song_is_playing) {
                TrackPlayer.play().catch(() => {});
              } else {
                TrackPlayer.pause().catch(() => {});
              }
            } else if (Platform.OS === 'web' && html5AudioRef.current) {
              if (updatedJam.current_song_is_playing) {
                html5AudioRef.current.play().catch(() => {});
              } else {
                html5AudioRef.current.pause();
              }
            }

            // Sync progress (if drift is > 3 seconds)
            setProgress((prevProgress) => {
              const drift = Math.abs(prevProgress - updatedJam.current_song_progress);
              if (drift > 3) {
                if (isYoutubeTrack(currentSong)) {
                  sendToWebView('seek', { time: updatedJam.current_song_progress });
                } else if (isAudioInitializedRef.current && TrackPlayer) {
                  TrackPlayer.seekTo(updatedJam.current_song_progress).catch(() => {});
                } else if (Platform.OS === 'web' && html5AudioRef.current) {
                  html5AudioRef.current.currentTime = updatedJam.current_song_progress;
                }
                return updatedJam.current_song_progress;
              }
              return prevProgress;
            });
          }
        )
        .on(
          'broadcast',
          { event: 'chat_message' },
          (response: any) => {
            const msg = response.payload;
            if (msg) {
              setChatMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
            }
          }
        )
        .subscribe();

      cleanupRealtime = () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Mock/REST realtime fallback using a polling interval
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
              const song = await dbService.getSongById(jam.current_song_id);
              if (song) {
                setCurrentSong(song);
                 if (isAudioInitializedRef.current) {
                  loadSong(song, jam.current_song_is_playing);
                } else if (Platform.OS === 'web' && html5AudioRef.current) {
                  html5AudioRef.current.src = getAudioSourceForSong(song);
                }
              }
            }
          } else {
            setCurrentSong(null);
            if (isAudioInitializedRef.current && TrackPlayer) {
              TrackPlayer.pause().catch(() => {});
            } else if (Platform.OS === 'web' && html5AudioRef.current) {
              html5AudioRef.current.pause();
            }
          }

          // Sync play/pause state
          setIsPlaying(jam.current_song_is_playing);
          if (isYoutubeTrack(currentSong)) {
            sendToWebView(jam.current_song_is_playing ? 'play' : 'pause');
          } else if (isAudioInitializedRef.current && TrackPlayer) {
            if (jam.current_song_is_playing) {
              TrackPlayer.play().catch(() => {});
            } else {
              TrackPlayer.pause().catch(() => {});
            }
          } else if (Platform.OS === 'web' && html5AudioRef.current) {
            if (jam.current_song_is_playing) {
              html5AudioRef.current.play().catch(() => {});
            } else {
              html5AudioRef.current.pause();
            }
          }

          // Sync progress (if drift is > 3 seconds)
          setProgress((prevProgress) => {
            const drift = Math.abs(prevProgress - jam.current_song_progress);
            if (drift > 3) {
              if (isYoutubeTrack(currentSong)) {
                sendToWebView('seek', { time: jam.current_song_progress });
              } else if (isAudioInitializedRef.current && TrackPlayer) {
                TrackPlayer.seekTo(jam.current_song_progress).catch(() => {});
              } else if (Platform.OS === 'web' && html5AudioRef.current) {
                html5AudioRef.current.currentTime = jam.current_song_progress;
              }
              return jam.current_song_progress;
            }
            return prevProgress;
          });

          // Sync chat messages from Neon Postgres Express API
          const messages = await dbService.getJamMessages(jamRoom.room_id);
          if (messages && messages.length > 0) {
            setChatMessages(messages);
          }
        } catch (err) {
          console.error('Error polling jam state:', err);
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
    setChatMessages([]);
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

    setChatMessages([]);
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

        if (isAudioInitializedRef.current) {
          loadSong(song, jam.current_song_is_playing);
        } else if (Platform.OS === 'web' && html5AudioRef.current) {
          html5AudioRef.current.src = getAudioSourceForSong(song);
          html5AudioRef.current.currentTime = jam.current_song_progress;
          if (jam.current_song_is_playing) {
            html5AudioRef.current.play().catch(() => {});
          } else {
            html5AudioRef.current.pause();
          }
        }
      }
    } else {
      setCurrentSong(null);
      setProgress(0);
      setIsPlaying(false);
      if (isAudioInitializedRef.current && playerRef.current) {
        playerRef.current.pause();
      } else if (Platform.OS === 'web' && html5AudioRef.current) {
        html5AudioRef.current.pause();
      }
      sendToWebView('pause');
    }

    return true;
  };

  // Leaving jam
  const leaveJamRoom = () => {
    if (jamRoom && jamRoom.isHost) {
      // Host closes the room for everyone
      dbService.deleteJam(jamRoom.room_id).catch(err => console.error('Error deleting jam room:', err));
    }
    setChatMessages([]);
    setJamRoom(null);
  };

  const sendChatMessage = (messageText: string) => {
    if (!jamRoom || !messageText.trim()) return;
    const msg = {
      id: Math.random().toString(36).substring(7),
      username: user?.name || 'Guest',
      message: messageText.trim(),
      created_at: new Date().toISOString()
    };
    
    // Add locally
    setChatMessages(prev => [...prev, msg]);

    // Broadcast
    if (isSupabaseConfigured) {
      const { supabase } = require('@/services/supabase-client');
      supabase
        .channel(`jam-room:${jamRoom.room_id}`)
        .send({
          type: 'broadcast',
          event: 'chat_message',
          payload: msg
        })
        .catch((err: any) => console.error('Error broadcasting chat:', err));
    } else {
      // Post message to Neon Postgres Express API
      dbService.sendChatMessage(jamRoom.room_id, user?.name || 'Guest', messageText.trim())
        .catch(err => console.error('Error sending chat to backend:', err));
    }
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

    loadSong(song, true);

    // Jam room updates
    if (jamRoom) {
      dbService.updateJam(jamRoom.room_id, {
        current_song_id: song.id,
        current_song_progress: 0,
        current_song_is_playing: true
      }).catch(err => console.error('Error updating jam room on play:', err));
    }
  };

  const pauseSong = () => {
    setIsPlaying(false);
    if (isYoutubeTrack(currentSong)) {
      sendToWebView('pause');
    } else if (isAudioInitializedRef.current && TrackPlayer) {
      TrackPlayer.pause().catch((err: any) => console.log('TrackPlayer pause error:', err));
    } else if (Platform.OS === 'web' && html5AudioRef.current) {
      html5AudioRef.current.pause();
    }

    // Jam room updates
    if (jamRoom) {
      dbService.updateJam(jamRoom.room_id, {
        current_song_is_playing: false,
        current_song_progress: Math.floor(progress)
      }).catch(err => console.error('Error updating jam room on pause:', err));
    }
  };

  const resumeSong = () => {
    if (currentSong) {
      setIsPlaying(true);
      if (isYoutubeTrack(currentSong)) {
        sendToWebView('play');
      } else if (isAudioInitializedRef.current && TrackPlayer) {
        TrackPlayer.play().catch((err: any) => console.log('TrackPlayer play error:', err));
      } else if (Platform.OS === 'web' && html5AudioRef.current) {
        html5AudioRef.current.play().catch((err: any) => console.log('Resume playback failed:', err));
      }

      // Jam room updates
      if (jamRoom) {
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
      if (isYoutubeTrack(currentSong)) {
        sendToWebView('seek', { time: seconds });
      } else if (isAudioInitializedRef.current && TrackPlayer) {
        TrackPlayer.seekTo(seconds).catch((err: any) => console.log('TrackPlayer seek error:', err));
      } else if (Platform.OS === 'web' && html5AudioRef.current) {
        html5AudioRef.current.currentTime = seconds;
      }

      // Jam room updates
      if (jamRoom) {
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
        chatMessages,
        sendChatMessage,
        registerWebView,
        handleWebViewMessage,
        playerHtml,
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


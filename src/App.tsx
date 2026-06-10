import { useState, useEffect, useRef } from "react";
import { Home, Search, Library, Music, User, Pause, Play, Compass, HardDrive, ArrowRight, HelpCircle } from "lucide-react";
import { Song, Playlist, ListeningHabit } from "./types";
import { AudioEngine } from "./components/AudioEngine";
import { HomeFeed } from "./components/HomeFeed";
import { SearchEngine } from "./components/SearchEngine";
import { LibraryManager } from "./components/LibraryManager";
import { ActivePlayer } from "./components/ActivePlayer";
import { ProfilePanel } from "./components/ProfilePanel";
import { YouTubePlayer } from "./components/YouTubePlayer";
import { LoginScreen } from "./components/LoginScreen";
import { MiniPlayer } from "./components/MiniPlayer";
import { QueuePanel } from "./components/QueuePanel";
import { Equalizer } from "./components/Equalizer";
import { Notifications, NotificationItem } from "./components/Notifications";
import { useMediaSession } from "./hooks/useMediaSession";

// const PRESET_SONGS: Song[] = [
//   {
//     id: "vivid_obsessions",
//     title: "Vivid Obsessions",
//     artist: "Elena Cross",
//     album: "Obsidian Vibe",
//     duration: "03:42",
//     durationSeconds: 222,
//     genre: "Experimental House",
//     mood: "Sophisticated, Moody, High-Gloss",
//     lyrics: "In the depth of the obsidian night,\nWe seek the shades of digital light.\nMoving slow through the velvet breeze,\nWhispering secrets to the ancient trees.\n\nOh Vivid Obsessions, keeping me warm,\nGuiding my spirit through the digital storm.\nSilver ripples on a silent lake,\nEvery single breath we take.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDGWAh1VFYsxQ0g-qkNGuQGf-Ng7SUaWAqeUKBUrzObFGk8LREsSS52TQWm16L6PJQGUHBbtO5-fyjwCJiAYeUQuiBtWFnvAPRR-Mw7GlV64-6H9ymHsuAOAXSGTAKrJph6khODQ2v-6nQZvwwXhwuNSo5TkbarQ6nSUF_VOigBsNqgPokeRGsZGOXc6IgrMPJI7yTO7m4jDmsxZl3IEZfI5Rwzg96R7-01Pzxf0ZISu_7XOu40w9muva4OIYlVenxofxFUPu5o5EM"
//   },
//   {
//     id: "midnight_bloom",
//     title: "Midnight Bloom",
//     artist: "The Quintet",
//     album: "The Vault Sessions",
//     duration: "04:10",
//     durationSeconds: 250,
//     genre: "Jazz-Fusion",
//     mood: "Ethereal, Smoky, Late-night",
//     lyrics: "Under the purple spotlight scene,\nA smoky soundscape, pure and clean.\nThe keys start to wander, the bass starts to groove,\nMidnight bloom makes the shadows move.\n\nIn this high-fidelity room we hide,\nLet the waves of sound take us inside.\nRemastered echoes of a brass design,\nDrinking in the mulberry wine.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuA63bp1UMtapYi6fPhLuMwB2cKTS5VktL8SZVj0TaEGR6gU3BgrnSALCh0BTA9Ap51nhR3P4yDlVKfF5dUcNourcoZo0wWxAVe9R9E6L48viehYWYDe6nNRbyB32Hy3fcy4r0P_hSM5xbTqpg3taHf0cRwkO2Xy1ovWEza_505NPfjBfN8uPqaO-TrU7VlK4KObfJ2AVcDBQfsqJKJLk9_FA2KL1xkzoh3QwPYA9hEBFr862kdgfFVSqnGSbUMEE4RIGaCsSvCbfYg"
//   },
//   {
//     id: "subsonic_waves",
//     title: "Subsonic Waves",
//     artist: "Aura Digital",
//     album: "Electronic Visions",
//     duration: "05:12",
//     durationSeconds: 312,
//     genre: "Ambient Electronic",
//     mood: "Deep, Slow, Fluid",
//     lyrics: "Deep frequencies, felt not heard,\nMoving past the spoken word.\nSubsonic ripples in the dark,\nIgniting an electric spark.\n\nFeel the weight of the digital tides,\nWhere the soul of the machine abides.\nResonance flowing through your device,\nTransforming simple waves to ice.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCVvNydBj_g56HeqfdTofcEDY5vWPDz_oI8PLg68HQ-3adjQZ5t1KpuYaT536BpB-PIq6DNHPa6xMfMOzSi-0ow9wVLDCg7ZHWUA2GwPcn0_pSxzhTvmjZjrrYezC3_1T_cyFmJK-51y09J7bwXV45vjFStBEfF2fClNZkS9ulcYE8H-Dv8S01H6Ttf5nZe0B0U2z9z8sZKzCFePi3dAvtaecs7mj8qlvgxc4MzfadB5KnVU6rjREoZG8auMsF1sPtulew62WSWuz4"
//   },
//   {
//     id: "nocturnal_radiance",
//     title: "Nocturnal Radiance",
//     artist: "AETHERIS",
//     album: "Deep Transmissions",
//     duration: "05:12",
//     durationSeconds: 312,
//     genre: "Space Ambient",
//     mood: "Mysterious, Majestic, Cosmic",
//     lyrics: "Gleaming silver, cosmic streams,\nEchoes of forgotten dreams.\nNocturnal Radiance guide us home,\nThrough the infinite sky we roam.\n\nPure acoustics, stellar sound,\nIn this space we are unbound.\nFloating beyond the gravity field,\nLetting the absolute dark be revealed.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBZB17HlkwoRIoV6mcyhJyW6ePcvosKZxu0gwF_ONaBuyyEQhRrk8a8sxdfgxsRv0vDFWkHr0V5tj4fAK0YQ_FIRFgc_hQqXkVcBxxLPlHz2VxQLkz1GdYMQKZemoSKqrAtekSmNqkdakREq-djoQfCLjbbNgO5R491f3rhWpc_WqjJsC4DzsmVczaNltKQJ6O06q3BHoolUwrpbEg2hqTv15oMgwIRmAFVA89h-r-B2hMV3BvAUNI1PWaLEB-l0o9lpm_sk-4F11g"
//   },
//   {
//     id: "shadow_choreography",
//     title: "Shadow Choreography",
//     artist: "Luz Vora",
//     album: "The Obsidian Room",
//     duration: "04:25",
//     durationSeconds: 265,
//     genre: "Dark Techno",
//     mood: "Enigmatic, Intense, Premium",
//     lyrics: "Moving in sync, a perfect line,\nSteps aligned to the click of time.\nIn the shadow room we choreograph,\nA silent cry, a modern laugh.\n\nTurn the dial to forty-eight,\nEnter the premium high-grade gate.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC1FAjjyahWX3x_xtxEfzpXijTXbqfdOMeD0BBgxMiggpyc5CUZz1zf_ow-Xo4wVLR5PoXwN-y-gqS4eYOPZ4txBYwmxMZnmay-1bESzdbvvPjrl4_kGKXYe4Z4VngpHLnO7RGmLdgHxoNTOmdfIteXUO3XpZrmqdSbwK2enhSzbyEMZcdIzmlwtd1A4jnM2N8PlPoV2qxdUjszDHvlwofriUSlplh3dr6JEEhWxX5bY6CN7qjLhUV2IkawsnUaZ_KGwebxCQQ4ESc"
//   },
//   {
//     id: "neon_resurgence",
//     title: "Neon Resurgence",
//     artist: "Synthetix Collective",
//     album: "Electric Pulse",
//     duration: "03:58",
//     durationSeconds: 238,
//     genre: "Synthwave",
//     mood: "Energetic, Nostalgic, Glossy",
//     lyrics: "Revving up on a laser lane,\nSynthesizers wash away the pain.\nNeon resurgence under warm city stars,\nSpeeding along in luxury cars.\n\nSilver metallic, glossy and sleek,\nHere is the acoustic peak we seek.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAm0QDFiHjmOfSZ0AdxVNTSs7GLlAxaEOjDs-C8GrivgoYa3NwW9YhqlpHMRuufolPWZlvaxUVWOXhuwBwAVdC1nqXG7wShphuUdJYTPlDlUfdgDKz45Fw66R-S4HVWVUogcm2BlEdbA8yj-FbG5lRpsbmUlltfTV2L0tUcHqMtn00b5ALpFInlNIQMuE1mzAODUvGZD0nTjO44rI41Q5YI1igiA1rVaKzLeraiiHHoPUWLpekenSzcPwAyd98GNVW7xvjhHIdPVGo"
//   },
//   {
//     id: "silk_static",
//     title: "Silk & Static",
//     artist: "Marlowe",
//     album: "Silk Road Remasters",
//     duration: "05:12",
//     durationSeconds: 312,
//     genre: "Acoustic Electronica",
//     mood: "Smooth, Textural, Serene",
//     lyrics: "Soft silk touches the analog crackle,\nBreaking away from the digital shackle.\nStatic whispering in your left ear,\nBrushed metal chords starting to appear.\n\nEnjoy the physical depth of sound,\nWhere pure acoustics can be found.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuChTHrEpU0H7RQpLMYRSoSNzxXYPAyczK-zBEtJqVgcitUUf8aEnItOboAxLP9x9T4U42hnj10vDFPNraS9tdzJAh6VIbLJJI9VY1fPr7sEfuNNTusfnaZCocpC0DwRx1e_cFL55RkLm56lOtDtA_urrjBpr6DKDQwwF0Lc0JrdFCd1D9JKWOjbuOOnio0Lw9qqDaT80IHz92KzqP7eMF184GOVrxYByq7OXnu65xjaTiep-FfWMmMRde_Nhc8HWOyX6aQxp3b1Ua8"
//   },
//   {
//     id: "atmospheric_redux",
//     title: "Atmospheric Redux",
//     artist: "M. Sterling",
//     album: "Acoustic Logic",
//     duration: "12:00",
//     durationSeconds: 720,
//     genre: "Deep House / Jazz-Fusion",
//     mood: "Immersive, Spacey, Journey",
//     lyrics: "A twelve-hour trip into experimental soundscapes.\nNo words exist here, only the soft vibration of organic pads,\ncoupled with silver highlights that glisten in your ears.\nExperience the sheer grandeur of high-fidelity silence.",
//     coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDF8ISXacJ8Z4_ZAH29Hq3dsWFbPzfglUIQmxAXu4UwtxznSobGfBUtCagiIAXDIdPf6TlTDJo3FN4k7W_RwwS5Durnr96CTbQq_0FTYoUbK54Vx9uN7jwMUFcNXkVFo5tvuoUbsydpKskCTtA7PkPnI9w7Td64B4h_-vbGvGkgL_tE8g4XpcXTjsSPS5ExR9ttWA9-XaA1U8sBpTJfbTKvNVAPP-zv-gQzFpkiM2bIdCPSA8178bxFGAo6J695Zt5UjVqNpTY8JO8"
//   }
// ];

const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "950921906220-dt0pscki7erf5j27ahdqj33q01qnlbiv.apps.googleusercontent.com";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ytSeekTo, setYtSeekTo] = useState<number | null>(null);

  // User details
  const [username, setUsername] = useState("skywave_listener");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [listeningHabits, setListeningHabits] = useState<ListeningHabit[]>([]);

  // Equalizer, Queue, Notifications and Media Session states
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [eqBands, setEqBands] = useState<number[]>([0, 0, 0, 0, 0]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = (type: "info" | "success" | "warning", message: string) => {
    const newNotif: NotificationItem = {
      id: String(Date.now()),
      type,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    // Auto-dismiss toast style after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };


  // Google OAuth State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Google sign in callback
  const handleGoogleSignInResponse = async (response: any) => {
    setIsAuthLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Google authentication failed.");
      }

      const data = await res.json();
      if (data.success && data.user) {
        setGoogleUser(data.user);
        setUsername(data.user.name);
        localStorage.setItem("melo_google_user", JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("[Google Sign-In Error]", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    setGoogleUser(null);
    setUsername("skywave_listener");
    localStorage.removeItem("melo_google_user");
    if ((window as any).google) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
  };

  // Load Google user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("melo_google_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setGoogleUser(parsed);
        setUsername(parsed.name);
      } catch (e) {
        console.warn("Failed to parse saved google user:", e);
      }
    }
  }, []);

  // Load user data from DB upon login
  useEffect(() => {
    if (!googleUser || !googleUser.id) {
      setFavorites([]);
      setPlaylists([]);
      setListeningHabits([]);
      return;
    }

    const loadUserData = async () => {
      try {
        // 1. Liked songs
        const likesRes = await fetch(`/api/user/likes?userId=${googleUser.id}`);
        if (likesRes.ok) {
          const likes = await likesRes.json();
          setFavorites(likes.map((s: any) => 'yt_' + s.video_id));
        }

        // 2. Playlists
        const playlistsRes = await fetch(`/api/user/playlists?userId=${googleUser.id}`);
        if (playlistsRes.ok) {
          const plData = await playlistsRes.json();
          setPlaylists(plData);
        }

        // 3. Listening history
        const historyRes = await fetch(`/api/user/history?userId=${googleUser.id}`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          const habitsMap: Record<string, any> = {};
          historyData.forEach((h: any) => {
            const id = 'yt_' + h.song_id;
            if (!habitsMap[id]) {
              habitsMap[id] = { songId: id, songTitle: h.song_title, artist: h.artist, count: 0 };
            }
            habitsMap[id].count += 1;
          });
          setListeningHabits(Object.values(habitsMap));
        }
      } catch (err) {
        console.warn("Failed loading user persistent database data:", err);
      }
    };

    loadUserData();
  }, [googleUser]);

  // Initialize Google Identity Services once when script is loaded
  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).google?.accounts?.id && !(window as any).googleAccountsInitialized) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignInResponse,
          auto_select: false
        });
        (window as any).googleAccountsInitialized = true;
        clearInterval(interval);
      } else if ((window as any).googleAccountsInitialized) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Render the Google sign-in button if not logged in and on profile tab
  useEffect(() => {
    if (activeTab === "profile" && !googleUser && (window as any).google?.accounts?.id) {
      const btnElem = document.getElementById("google-signin-btn");
      if (btnElem) {
        (window as any).google.accounts.id.renderButton(
          btnElem,
          { theme: "outline", size: "large", text: "signin_with" }
        );
      }
    }
  }, [activeTab, googleUser]);



  // Queue properties (sequential "line-wise" queue or random play)
  const [musicQueue, setMusicQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);

  // Synchronisation network properties
  const [activeUsersOnNetwork, setActiveUsersOnNetwork] = useState<any[]>([]);
  const [followingTarget, setFollowingTarget] = useState<string | null>(null);

  // Sync references to preserve positions without stale loops
  const followingTargetRef = useRef<string | null>(null);
  const presetSongsRef = useRef<Song[]>([]);
  const selfSyncUpdateTimer = useRef<any>(null);

  useEffect(() => {
    followingTargetRef.current = followingTarget;
  }, [followingTarget]);

  useEffect(() => {
    presetSongsRef.current = songs;
  }, [songs]);

  // Fetch initial tracks on mount
  useEffect(() => {
    fetch("/api/tracks")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSongs(data);
          setMusicQueue(data);
          setCurrentSong(data[0]);
        }
      })
      .catch(err => console.warn("Failed fetching metadata presets:", err));
  }, []);

  const handleSetProgress = (secs: number) => {
    setProgress(secs);
    if (currentSong && (currentSong.id.startsWith("yt_") || currentSong.videoId)) {
      setYtSeekTo(secs);
      setTimeout(() => setYtSeekTo(null), 50);
    }
  };

  // Set up progress interval ticker when playing
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && currentSong) {
      // If playing a YouTube song, let the YouTubePlayer handle progress tracking
      if (currentSong.id.startsWith("yt_") || currentSong.videoId) {
        return;
      }
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= currentSong.durationSeconds - 1) {
            // Song completed, progress to the next inline or queue item
            setTimeout(() => onNextSong(), 50);
            return 0;
          }
          return p + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSong, musicQueue, queueIndex]);

  // Server state updater (submits play position to backend for other viewers)
  useEffect(() => {
    if (selfSyncUpdateTimer.current) {
      clearTimeout(selfSyncUpdateTimer.current);
    }

    selfSyncUpdateTimer.current = setTimeout(() => {
      fetch("/api/sync/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          currentSongId: currentSong ? currentSong.id : null,
          isPlaying,
          progress,
          songTitle: currentSong ? currentSong.title : undefined,
          songArtist: currentSong ? currentSong.artist : undefined,
          songCoverUrl: currentSong ? currentSong.coverUrl : undefined
        })
      }).catch(err => console.warn("Broadcasting play position to server failed:", err));
    }, 1000);

    return () => clearTimeout(selfSyncUpdateTimer.current);
  }, [username, currentSong, isPlaying, progress]);

  // Submit listening history to database when a song starts playing or changes
  const lastRecordedSongId = useRef<string>("");
  useEffect(() => {
    if (currentSong && isPlaying) {
      if (progress === 0 || lastRecordedSongId.current !== currentSong.id) {
        lastRecordedSongId.current = currentSong.id;
        fetch("/api/listens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: googleUser?.id || null,
            username: googleUser?.name || username || "Guest",
            songId: currentSong.id,
            songTitle: currentSong.title,
            artist: currentSong.artist
          })
        }).catch(err => console.warn("[Listens] Failed to submit listen count:", err));
      }
    }
  }, [currentSong?.id, isPlaying, progress === 0, googleUser?.id, googleUser?.name, username]);

  // Server Sent Events (SSE) network registration: sync other users instantly
  useEffect(() => {
    const sse = new EventSource("/api/sync/stream");

    sse.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data);
        if (envelope.type === "INITIAL_USERS") {
          setActiveUsersOnNetwork(envelope.data);
        } else if (envelope.type === "PLAYBACK_CHANGE") {
          const u = envelope.data;
          setActiveUsersOnNetwork(prev => {
            const rest = prev.filter(item => item.username !== u.username);
            return [...rest, u];
          });

          // Live follow check
          if (followingTargetRef.current === u.username) {
            if (u.currentSongId) {
              const matchedPreset = presetSongsRef.current.find(s => s.id === u.currentSongId);
              if (matchedPreset) {
                if (currentSong?.id !== matchedPreset.id) {
                  setCurrentSong(matchedPreset);
                }
                setIsPlaying(u.isPlaying);
                setProgress(u.progress);
              } else {
                // Sourced from an AI prompt on the target's side, formulate matching song wrapper
                const artificialTrack: Song = {
                  id: u.currentSongId,
                  title: u.songTitle || "AI Synthesised Stream",
                  artist: u.songArtist || "Grounding Collective",
                  album: "AI Sourced Cloud",
                  duration: "04:00",
                  durationSeconds: 240,
                  genre: "Real-time Fusion",
                  mood: "Liquid Harmony",
                  lyrics: "Sourced through the Mulberry Sound network stream.",
                  coverUrl: u.songCoverUrl || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"
                };

                setSongs(prev => {
                  if (prev.some(p => p.id === artificialTrack.id)) return prev;
                  return [artificialTrack, ...prev];
                });
                setCurrentSong(artificialTrack);
                setIsPlaying(u.isPlaying);
                setProgress(u.progress);
              }
            } else {
              setIsPlaying(false);
            }
          }
        }
      } catch (err) {
        console.error("SSE parsing error:", err);
      }
    };

    return () => {
      sse.close();
    };
  }, []);

  const handlePlaySongDirectly = (song: Song) => {
    // Break follow sync on active manual select
    if (followingTarget) {
      setFollowingTarget(null);
    }

    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);

    addNotification("success", `Now playing: ${song.title}`);

    // Register song in central songs state so Liked Songs and Playlists can reference it
    setSongs(prev => {
      if (prev.some(s => s.id === song.id)) return prev;
      return [song, ...prev];
    });

    // Permanently cache YouTube songs into the database so they're searchable forever
    if (song.videoId && (song.id.startsWith("yt_") || song.source === "youtube")) {
      fetch("/api/tracks/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          durationSeconds: song.durationSeconds,
          coverUrl: song.coverUrl,
          genre: song.genre
        })
      }).catch(() => {}); // fire-and-forget, DB offline is handled gracefully
    }

    // Track listening habit increment
    setListeningHabits(prev => {
      const existing = prev.find(h => h.songId === song.id);
      if (existing) {
        return prev.map(h => h.songId === song.id ? { ...h, count: h.count + 1 } : h);
      }
      return [...prev, { songId: song.id, songTitle: song.title, artist: song.artist, count: 1 }];
    });

    // Persist listen event to the database
    if (googleUser && googleUser.id) {
      const cleanSongId = song.id.startsWith("yt_") ? song.id.substring(3) : song.id;
      fetch("/api/user/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: googleUser.id,
          songVideoId: cleanSongId,
          title: song.title,
          artist: song.artist,
          coverUrl: song.coverUrl,
          duration: song.duration,
          durationSeconds: song.durationSeconds
        })
      })
        .then(async () => {
          // Reload habits
          const historyRes = await fetch(`/api/user/history?userId=${googleUser.id}`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            const habitsMap: Record<string, any> = {};
            historyData.forEach((h: any) => {
              const id = 'yt_' + h.song_id;
              if (!habitsMap[id]) {
                habitsMap[id] = { songId: id, songTitle: h.song_title, artist: h.artist, count: 0 };
              }
              habitsMap[id].count += 1;
            });
            setListeningHabits(Object.values(habitsMap));
          }
        })
        .catch(err => console.warn("Failed recording listen history:", err));
    }
  };

  const onNextSong = () => {
    if (musicQueue.length === 0) return;
    if (repeatOn && currentSong) {
      setProgress(0);
      const songCopy = { ...currentSong } as Song;
      setCurrentSong(songCopy);
      return;
    }
    let nextIdx = 0;
    if (shuffleOn) {
      nextIdx = Math.floor(Math.random() * musicQueue.length);
    } else {
      nextIdx = (queueIndex + 1) % musicQueue.length;
    }
    setQueueIndex(nextIdx);
    setCurrentSong(musicQueue[nextIdx]);
    setProgress(0);
  };

  const onPreviousSong = () => {
    if (musicQueue.length === 0) return;
    let prevIdx = 0;
    if (shuffleOn) {
      prevIdx = Math.floor(Math.random() * musicQueue.length);
    } else {
      prevIdx = (queueIndex - 1 + musicQueue.length) % musicQueue.length;
    }
    setQueueIndex(prevIdx);
    setCurrentSong(musicQueue[prevIdx]);
    setProgress(0);
  };

  const handleTogglePlay = () => {
    // If following anyone, break flow on local pause/play toggle
    if (followingTarget) {
      setFollowingTarget(null);
    }
    setIsPlaying(!isPlaying);
  };

  // Connect Media Session API for lock screen controls
  useMediaSession({
    currentSong,
    isPlaying,
    onTogglePlay: () => setIsPlaying(p => !p),
    onNextSong,
    onPreviousSong,
    progress,
    setProgress: handleSetProgress
  });

  const handleToggleFavorite = async (songId: string) => {
    const isFav = favorites.includes(songId);
    const cleanSongId = songId.startsWith("yt_") ? songId.substring(3) : songId;
    
    // Find song info
    const song = songs.find(s => s.id === songId) || currentSong;
    if (!song) return;

    // Optimistic UI updates
    setFavorites(prev => {
      if (prev.includes(songId)) {
        addNotification("info", `Removed "${song.title}" from favorites`);
        return prev.filter(id => id !== songId);
      }
      addNotification("success", `Added "${song.title}" to favorites`);
      return [...prev, songId];
    });

    if (googleUser && googleUser.id) {
      try {
        if (isFav) {
          await fetch(`/api/user/likes?userId=${googleUser.id}&songVideoId=${cleanSongId}`, {
            method: "DELETE"
          });
        } else {
          await fetch("/api/user/likes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: googleUser.id,
              songVideoId: cleanSongId,
              title: song.title,
              artist: song.artist,
              coverUrl: song.coverUrl,
              duration: song.duration,
              durationSeconds: song.durationSeconds
            })
          });
        }
      } catch (err) {
        console.warn("Failed syncing favorite to database:", err);
      }
    }
  };

  const handleTrackQueueChange = (queue: Song[], startIdx: number, shuffle: boolean) => {
    let compiledQueue = [...queue];
    setShuffleOn(shuffle);
    if (shuffle) {
      // Fisher-Yates Shuffle
      for (let i = compiledQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [compiledQueue[i], compiledQueue[j]] = [compiledQueue[j], compiledQueue[i]];
      }
    }
    setMusicQueue(compiledQueue);
    setQueueIndex(startIdx);
    if (compiledQueue[startIdx]) {
      handlePlaySongDirectly(compiledQueue[startIdx]);
    }
  };

  const handleAddSongToLibrary = (song: Song) => {
    if (!favorites.includes(song.id)) {
      setFavorites(prev => [...prev, song.id]);
    }
  };

  const handleCreatePlaylist = async (name: string, description: string, initialSongs: Song[] = []) => {
    addNotification("success", `Created playlist "${name}"`);

    if (!googleUser || !googleUser.id) {
      // Fallback local-only creation for guests
      const newPL: Playlist = {
        id: "pl_" + Date.now(),
        name,
        description,
        isCustom: true,
        songs: initialSongs,
        coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDesJQhVHAwD48gusRnhSWxi2Wr4Se4dXJ2dNzny1LFufaJZskiTKIqdRsCcw180iEcexkCxubLMpt4CcIn01QzrzbAYlyyb15lMkDwy5-w82vvPYCnV_jl4NM-ctTd-lFkGawRTWky4mNLUpivTYBXLAfZSQV9gpm3aj3biLnKxwR794EB0klNZ51Mhb8POyFyI7nJOnQzK_HMq2v-WEw3bkzEMEM_FExWR1qVHUfoli1rlhkB9Z783f5QAQq7Yuwt9FXFr6tHk1Q"
      };
      setPlaylists(prev => [...prev, newPL]);
      return;
    }

    try {
      const res = await fetch("/api/user/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: googleUser.id,
          name,
          description,
          coverUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"
        })
      });
      if (res.ok) {
        const newPLData = await res.json();
        const playlistId = newPLData.id;
        
        // If there are initial songs, add them
        if (initialSongs.length > 0) {
          for (const song of initialSongs) {
            const cleanSongId = song.id.startsWith("yt_") ? song.id.substring(3) : song.id;
            await fetch("/api/user/playlists/songs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playlistId,
                songVideoId: cleanSongId,
                title: song.title,
                artist: song.artist,
                coverUrl: song.coverUrl,
                duration: song.duration,
                durationSeconds: song.durationSeconds
              })
            });
          }
        }

        // Re-fetch playlists to get fully synced list
        const plRes = await fetch(`/api/user/playlists?userId=${googleUser.id}`);
        if (plRes.ok) {
          const plData = await plRes.json();
          setPlaylists(plData);
        }
      }
    } catch (err) {
      console.warn("Failed creating database playlist:", err);
    }
  };

  const handleAddPlaylistDirect = (pl: Playlist) => {
    setPlaylists(prev => [...prev, pl]);
  };

  const handleAddSongToPlaylist = async (song: Song, playlistId: string) => {
    addNotification("success", `Added "${song.title}" to playlist`);

    // Check if it's a guest local playlist
    if (playlistId.startsWith("pl_")) {
      setPlaylists(prev => prev.map(p => {
        if (p.id === playlistId) {
          if (p.songs.some(s => s.id === song.id)) return p;
          return { ...p, songs: [...p.songs, song] };
        }
        return p;
      }));
      return;
    }

    if (!googleUser || !googleUser.id) return;

    try {
      const cleanSongId = song.id.startsWith("yt_") ? song.id.substring(3) : song.id;
      const res = await fetch("/api/user/playlists/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: parseInt(playlistId, 10),
          songVideoId: cleanSongId,
          title: song.title,
          artist: song.artist,
          coverUrl: song.coverUrl,
          duration: song.duration,
          durationSeconds: song.durationSeconds
        })
      });
      if (res.ok) {
        // Re-fetch playlists
        const plRes = await fetch(`/api/user/playlists?userId=${googleUser.id}`);
        if (plRes.ok) {
          const plData = await plRes.json();
          setPlaylists(plData);
        }
      }
    } catch (err) {
      console.warn("Failed adding song to database playlist:", err);
    }
  };

  const handleRemoveFromPlaylist = async (songId: string, playlistId: string) => {
    addNotification("info", "Removed song from playlist");

    if (playlistId.startsWith("pl_")) {
      setPlaylists(prev => prev.map(p => {
        if (p.id === playlistId) {
          return { ...p, songs: p.songs.filter(s => s.id !== songId) };
        }
        return p;
      }));
      return;
    }

    if (!googleUser || !googleUser.id) return;

    try {
      const cleanSongId = songId.startsWith("yt_") ? songId.substring(3) : songId;
      const res = await fetch(`/api/user/playlists/songs?playlistId=${playlistId}&songVideoId=${cleanSongId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        // Re-fetch playlists
        const plRes = await fetch(`/api/user/playlists?userId=${googleUser.id}`);
        if (plRes.ok) {
          const plData = await plRes.json();
          setPlaylists(plData);
        }
      }
    } catch (err) {
      console.warn("Failed removing song from database playlist:", err);
    }
  };

  const handleFollowUser = (target: string | null) => {
    setFollowingTarget(target);
    if (target) {
      const activeState = activeUsersOnNetwork.find(u => u.username === target);
      if (activeState && activeState.currentSongId) {
        const match = songs.find(s => s.id === activeState.currentSongId);
        if (match) {
          setCurrentSong(match);
          setIsPlaying(activeState.isPlaying);
          setProgress(activeState.progress);
        }
      }
    }
  };

  // Sandboxed triggers allowing users to simulatedly shift another user's server properties
  const handleTriggerSimulatedState = (targetUsername: string, songIdx: number, activeState: boolean) => {
    const song = songs[songIdx] || songs[0];
    fetch("/api/sync/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: targetUsername,
        currentSongId: song.id,
        isPlaying: activeState,
        progress: 12,
        songTitle: song.title,
        songArtist: song.artist,
        songCoverUrl: song.coverUrl
      })
    }).catch(err => console.warn("Simulated network feed trigger failed:", err));
  };

  // Equalizer & Queue helpers
  const handleChangeBand = (idx: number, value: number) => {
    setEqBands(prev => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  const handleApplyPreset = (presetGains: number[]) => {
    setEqBands(presetGains);
    addNotification("info", "Applied Equalizer preset");
  };

  const handlePlayQueueIndex = (index: number) => {
    if (musicQueue[index]) {
      setQueueIndex(index);
      setCurrentSong(musicQueue[index]);
      setIsPlaying(true);
      setProgress(0);
      addNotification("success", `Playing from queue: ${musicQueue[index].title}`);
    }
  };

  const handleRemoveQueueIndex = (index: number) => {
    const removedSong = musicQueue[index];
    setMusicQueue(prev => prev.filter((_, i) => i !== index));
    if (removedSong) {
      addNotification("info", `Removed "${removedSong.title}" from queue`);
    }
    if (queueIndex === index) {
      onNextSong();
    } else if (queueIndex > index) {
      setQueueIndex(prev => prev - 1);
    }
  };

  const handleClearQueue = () => {
    setMusicQueue([]);
    setQueueIndex(0);
    addNotification("info", "Cleared music queue");
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  // Derived Liked Songs matching
  const likedSongs = songs.filter(s => favorites.includes(s.id));

  // Determine which subpanel is active
  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomeFeed
            songs={songs}
            onPlaySong={handlePlaySongDirectly}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            setTab={setActiveTab}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            listeningHabits={listeningHabits}
          />
        );
      case "search":
        return (
          <SearchEngine
            userId={googleUser?.id || null}
            onPlaySong={handlePlaySongDirectly}
            onAddSongToLibrary={handleAddSongToLibrary}
            playlists={playlists}
            onAddSongToPlaylist={handleAddSongToPlaylist}
            songs={songs}
          />
        );
      case "library":
        return (
          <LibraryManager
            likedSongs={likedSongs}
            playlists={playlists}
            onCreatePlaylist={handleCreatePlaylist}
            onPlaySong={handlePlaySongDirectly}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onTrackQueueChange={handleTrackQueueChange}
            onRemoveFromPlaylist={handleRemoveFromPlaylist}
            recentHistory={listeningHabits}
            onAddPlaylist={handleAddPlaylistDirect}
          />
        );
      case "playing":
        return (
          <ActivePlayer
            currentSong={currentSong}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onNextSong={onNextSong}
            onPreviousSong={onPreviousSong}
            progress={progress}
            setProgress={handleSetProgress}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            username={username}
            activeUsersOnNetwork={activeUsersOnNetwork}
            followingTarget={followingTarget}
            onFollowUser={handleFollowUser}
            onTriggerSimulatedState={handleTriggerSimulatedState}
            playlists={playlists}
            onAddSongToPlaylist={handleAddSongToPlaylist}
            onCreatePlaylist={handleCreatePlaylist}
            shuffleOn={shuffleOn}
            onToggleShuffle={() => setShuffleOn(!shuffleOn)}
            repeatOn={repeatOn}
            onToggleRepeat={() => setRepeatOn(!repeatOn)}
            onOpenEqualizer={() => setIsEqualizerOpen(true)}
            onOpenQueue={() => setIsQueueOpen(true)}
          />
        );
      case "profile":
        return (
          <ProfilePanel
            username={username}
            onChangeUsername={setUsername}
            favoritesCount={favorites.length}
            playlistsCount={playlists.length}
            listeningHabits={listeningHabits}
            googleUser={googleUser}
            onSignOut={handleSignOut}
          />
        );
      default:
        return null;
    }
  };

  if (!googleUser) {
    return <LoginScreen onSignIn={handleGoogleSignInResponse} isLoading={isAuthLoading} />;
  }

  return (
    <div id="melo-app" className="relative z-10 w-full max-w-[430px] md:max-w-[800px] lg:max-w-[1200px] mx-auto min-h-screen bg-mulberry-base text-mulberry-on flex flex-col justify-between selection:bg-mulberry-primary selection:text-mulberry-base font-sans shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-x-hidden md:border-x md:border-white/5">
      {/* Sound Engine Node (Browser Audio context oscillator synthesizer loop) */}
      <AudioEngine isPlaying={isPlaying} songId={currentSong ? currentSong.id : null} eqBands={eqBands} />

      {/* YouTube Player Node */}
      {currentSong && (currentSong.id.startsWith("yt_") || currentSong.videoId) && (
        <YouTubePlayer
          videoId={currentSong.videoId || currentSong.id.replace("yt_", "")}
          isPlaying={isPlaying}
          onTimeUpdate={(currentTime) => setProgress(Math.floor(currentTime))}
          onEnded={onNextSong}
          onReady={() => console.log("YouTube Player Ready")}
          seekTo={ytSeekTo}
        />
      )}

      {/* Top HUD bar header */}
      <header className="w-full flex justify-between items-center px-5 md:px-8 pt-6 pb-2 shrink-0 select-none z-50">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" className="w-6 h-6 animate-pulse" alt="Melo logo" />
          <span className="font-serif text-lg font-bold tracking-widest text-[#FF007A]">MELO</span>
        </div>
        <div className="flex items-center gap-4">
          {followingTarget && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-500/20 rounded-full font-mono text-[8px] text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SYNC
            </div>
          )}
          <button className="font-sans text-[9px] font-bold text-[#FF007A] border border-[#FF007A]/22 rounded-full px-3 py-1 bg-[#FF007A]/10 tracking-wider hover:bg-[#FF007A]/20 transition-all active:scale-95">
            PLATINUM
          </button>
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-1.5 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer"
            aria-label="Open notifications"
          >
            <span className="text-sm">🔔</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#FF007A] rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* Primary content area container */}
      <main className="flex-grow pb-44 md:pb-48 w-full overflow-y-auto px-5 md:px-8 pt-4">
        {renderTabContent()}
      </main>

      {/* Mini Player */}
      {currentSong && activeTab !== "playing" && (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(p => !p)}
          onNextSong={onNextSong}
          progress={progress}
          onClick={() => setActiveTab("playing")}
          followingTarget={followingTarget}
          isFavorite={favorites.includes(currentSong.id)}
          onToggleFavorite={() => handleToggleFavorite(currentSong.id)}
        />
      )}

      {/* Queue Drawer Overlay */}
      <QueuePanel
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={musicQueue}
        currentIndex={queueIndex}
        onPlayIndex={handlePlayQueueIndex}
        onRemoveIndex={handleRemoveQueueIndex}
        onClearQueue={handleClearQueue}
      />

      {/* Equalizer Drawer Overlay */}
      <Equalizer
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
        eqBands={eqBands}
        onChangeBand={handleChangeBand}
        onApplyPreset={handleApplyPreset}
      />

      {/* Notifications Drawer Overlay */}
      <Notifications
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAllNotifications}
      />

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 md:bottom-2 left-1/2 transform -translate-x-1/2 w-full max-w-[430px] md:max-w-[700px] z-50 flex justify-around items-center h-16 bg-[#080507]/92 backdrop-blur-xl border-t md:border border-white/5 md:rounded-2xl">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${activeTab === "home" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
            }`}
        >
          <span className="text-lg">⌂</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("search")}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${activeTab === "search" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
            }`}
        >
          <span className="text-lg">⌕</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Search</span>
        </button>

        <button
          onClick={() => setActiveTab("playing")}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${activeTab === "playing" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
            }`}
        >
          <span className="text-lg">♪</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Playing</span>
        </button>

        <button
          onClick={() => setActiveTab("library")}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${activeTab === "library" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
            }`}
        >
          <span className="text-lg">☰</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Library</span>
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${activeTab === "profile" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
            }`}
        >
          <span className="text-lg">◯</span>
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Profile</span>
        </button>


      </nav>
    </div>
  );
}

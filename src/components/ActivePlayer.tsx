import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Shuffle, Repeat, Heart, Users, Sparkles, Plus, Check, Trash2, FolderPlus, Radio } from "lucide-react";
import { Song, Playlist } from "../types";

interface ActivePlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextSong: () => void;
  onPreviousSong: () => void;
  progress: number;
  setProgress: (secs: number) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;

  // Real-time Follow and Sync state
  username: string;
  activeUsersOnNetwork: { username: string; currentSongId: string | null; isPlaying: boolean; progress: number; songTitle?: string; lastUpdated: number }[];
  followingTarget: string | null;
  onFollowUser: (username: string | null) => void;
  onTriggerSimulatedState: (target: string, songIdx: number, isPlaying: boolean) => void;

  // Playlist Props
  playlists: Playlist[];
  onAddSongToPlaylist: (song: Song, playlistId: string) => void;
  onCreatePlaylist: (name: string, description: string, initialSongs?: Song[]) => void;
  shuffleOn: boolean;
  onToggleShuffle: () => void;
  repeatOn: boolean;
  onToggleRepeat: () => void;
}

interface LyricLine {
  time: number | null;
  text: string;
}

const parseLyrics = (rawText: string): LyricLine[] => {
  if (!rawText) return [];
  const lines = rawText.split("\n");
  const parsed: LyricLine[] = [];
  const timeRegex = /^\[(\d{1,2}):(\d{2})(?:\.\d+)?\]\s*(.*)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      parsed.push({ time: null, text: "" });
      continue;
    }
    const match = trimmed.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const timeInSecs = minutes * 60 + seconds;
      const text = match[3].trim();
      parsed.push({ time: timeInSecs, text });
    } else {
      parsed.push({ time: null, text: trimmed });
    }
  }
  return parsed;
};

export function ActivePlayer({
  currentSong,
  isPlaying,
  onTogglePlay,
  onNextSong,
  onPreviousSong,
  progress,
  setProgress,
  favorites,
  onToggleFavorite,
  username,
  activeUsersOnNetwork,
  followingTarget,
  onFollowUser,
  onTriggerSimulatedState,
  playlists,
  onAddSongToPlaylist,
  onCreatePlaylist,
  shuffleOn,
  onToggleShuffle,
  repeatOn,
  onToggleRepeat
}: ActivePlayerProps) {
  const [activeTab, setActiveTab] = useState<"lyrics" | "sync" | "playlist">("lyrics");
  const [showSimControls, setShowSimControls] = useState(false);
  const [lyricsText, setLyricsText] = useState<string>("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lastFetchedSongId = useRef<string>("");

  // Playlist menu state
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addedStatus, setAddedStatus] = useState<string | null>(null);

  // Seek bar dragging state
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!currentSong || activeTab !== "lyrics") return;
    if (lastFetchedSongId.current === currentSong.id) return;

    lastFetchedSongId.current = currentSong.id;

    if (currentSong.lyrics && currentSong.lyrics.trim().length > 0) {
      setLyricsText(currentSong.lyrics);
      setLyricsLines(parseLyrics(currentSong.lyrics));
      return;
    }

    setLyricsLoading(true);
    fetch("/api/lyrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: currentSong.title,
        artist: currentSong.artist,
        durationSeconds: currentSong.durationSeconds
      })
    })
      .then(res => res.json())
      .then(data => {
        const text = data.lyrics || "Lyrics not available for this track.";
        setLyricsText(text);
        setLyricsLines(parseLyrics(text));
      })
      .catch(() => {
        setLyricsText("Could not load lyrics.");
        setLyricsLines([{ time: null, text: "Could not load lyrics." }]);
      })
      .finally(() => setLyricsLoading(false));
  }, [currentSong?.id, activeTab]);

  useEffect(() => {
    if (currentSong && lastFetchedSongId.current !== currentSong.id) {
      setLyricsText("");
      setLyricsLines([]);
    }
  }, [currentSong?.id]);

  const getActiveLyricIndex = () => {
    if (!currentSong || lyricsLines.length === 0) return -1;

    const hasTimestamps = lyricsLines.some(line => line.time !== null);

    if (hasTimestamps) {
      let activeIndex = -1;
      for (let i = 0; i < lyricsLines.length; i++) {
        const line = lyricsLines[i];
        if (line.time !== null && line.time <= progress) {
          activeIndex = i;
        }
      }
      return activeIndex;
    } else {
      const nonEmptyLines = lyricsLines.filter(l => l.text.trim().length > 0);
      if (nonEmptyLines.length === 0) return -1;
      const progressPercent = progress / currentSong.durationSeconds;
      const targetNonEmptyIdx = Math.min(
        Math.floor(progressPercent * nonEmptyLines.length),
        nonEmptyLines.length - 1
      );

      let count = 0;
      for (let i = 0; i < lyricsLines.length; i++) {
        if (lyricsLines[i].text.trim().length > 0) {
          if (count === targetNonEmptyIdx) return i;
          count++;
        }
      }
      return -1;
    }
  };

  const activeLineIndex = getActiveLyricIndex();

  useEffect(() => {
    if (!lyricsContainerRef.current || activeLineIndex < 0) return;
    const container = lyricsContainerRef.current;
    const activeLine = container.querySelector(`[data-line-idx="${activeLineIndex}"]`);
    if (activeLine) {
      activeLine.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLineIndex]);

  const handleProgressSeek = (clientX: number) => {
    if (!currentSong || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const targetSeconds = Math.floor(percent * currentSong.durationSeconds);
    setDragProgress(targetSeconds);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentSong) return;
    setIsDragging(true);
    handleProgressSeek(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!currentSong) return;
    setIsDragging(true);
    if (e.touches[0]) {
      handleProgressSeek(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleProgressSeek(e.clientX);
    };

    const handleMouseUp = () => {
      if (dragProgress !== null) {
        setProgress(dragProgress);
      }
      setIsDragging(false);
      setDragProgress(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleProgressSeek(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      if (dragProgress !== null) {
        setProgress(dragProgress);
      }
      setIsDragging(false);
      setDragProgress(null);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, dragProgress, currentSong]);

  const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
    if (!currentSong) return;
    onAddSongToPlaylist(currentSong, playlistId);
    setAddedStatus(playlistName);
    setTimeout(() => setAddedStatus(null), 2000);
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || !currentSong) return;
    onCreatePlaylist(newPlaylistName, "Custom user playlist", [currentSong]);
    setAddedStatus(newPlaylistName);
    setNewPlaylistName("");
    setTimeout(() => setAddedStatus(null), 2000);
  };

  if (!currentSong) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center select-none animate-fade-in text-white/40">
        <Radio className="w-10 h-10 mb-4 animate-pulse text-[#FF007A]" />
        <h2 className="font-serif text-sm font-bold text-white">Cathedral Standby</h2>
        <p className="font-sans text-[10px] text-white/30 max-w-xs mt-1">Select a soundtrack from home feed or search tab to initialize audio playback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Album Art Frame */}
      <div className="flex justify-center select-none pt-2">
        <div className="relative w-48 h-48 rounded-2xl overflow-hidden silver-edge shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <img
            src={currentSong.coverUrl}
            alt={currentSong.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/5">
            <span className="font-sans text-[7px] text-white/85 tracking-widest font-bold uppercase">
              {currentSong.id.startsWith("yt_") || currentSong.videoId ? "YouTube Stream" : "Lossless"}
            </span>
          </div>
        </div>
      </div>

      {/* Info Desk */}
      <div className="text-center space-y-1 select-none">
        <h2 className="font-serif text-lg font-bold text-white leading-tight px-4 truncate">
          {currentSong.title}
        </h2>
        <p className="font-sans text-[11px] text-white/50 truncate px-4">
          {currentSong.artist} • <span className="italic text-[10px]">{currentSong.album}</span>
        </p>
      </div>

      {/* Progress & Slider */}
      <div className="space-y-2 select-none">
        <div 
          ref={progressBarRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="h-[4.5px] bg-white/5 rounded-full relative overflow-visible cursor-pointer group"
        >
          <div 
            className="h-full bg-[#FF007A] rounded-full relative"
            style={{ width: `${((dragProgress !== null ? dragProgress : progress) / currentSong.durationSeconds) * 100}%` }}
          >
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-[#FF007A] rounded-full transition-transform ${isDragging ? 'scale-100' : 'scale-0 group-hover:scale-100'}`}></div>
          </div>
        </div>
        <div className="flex justify-between font-mono text-[9px] text-white/30 px-0.5">
          <span>{formatTime(dragProgress !== null ? dragProgress : progress)}</span>
          <span>{currentSong.duration}</span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="flex items-center justify-between px-4 select-none">
        <button 
          onClick={onToggleShuffle}
          className={`transition-colors cursor-pointer ${shuffleOn ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"}`}
        >
          <Shuffle className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-6">
          <button 
            onClick={onPreviousSong}
            className="text-white/80 hover:text-white transition-colors cursor-pointer text-sm"
          >
            ⏮
          </button>

          <button 
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-lg shadow-white/5"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-black" />
            ) : (
              <Play className="w-4 h-4 fill-current text-black ml-0.5" />
            )}
          </button>

          <button 
            onClick={onNextSong}
            className="text-white/80 hover:text-white transition-colors cursor-pointer text-sm"
          >
            ⏭
          </button>
        </div>

        <button 
          onClick={onToggleRepeat}
          className={`transition-colors cursor-pointer ${repeatOn ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"}`}
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Favorite / Share / Playlist Options Row */}
      <div className="flex justify-center gap-6 select-none border-t border-white/5 pt-4">
        <button
          onClick={() => onToggleFavorite(currentSong.id)}
          className={`flex items-center gap-1.5 text-[9px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            favorites.includes(currentSong.id) ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${favorites.includes(currentSong.id) ? "fill-current" : ""}`} />
          Like
        </button>
        <span className="text-white/10">|</span>
        <button
          onClick={() => onToggleFavorite(currentSong.id)}
          className="flex items-center gap-1.5 text-[9px] font-sans font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors cursor-pointer"
        >
          <span>Share</span>
        </button>
      </div>

      {/* Tab Switcher for Details Deck */}
      <div className="flex bg-[#0f0b0d] p-1 rounded-full border border-white/5">
        {(["lyrics", "sync", "playlist"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 rounded-full text-[8px] font-sans font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === tab ? "bg-[#FF007A] text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab === "lyrics" ? "Lyrics" : tab === "sync" ? "Sync Hub" : "Playlist"}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Body panels */}
      <div className="min-h-[160px]">
        {activeTab === "lyrics" && (
          <div 
            ref={lyricsContainerRef}
            className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-4 pr-1 scroll-smooth"
          >
            {lyricsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-5 h-5 border border-[#FF007A]/30 border-t-[#FF007A] rounded-full animate-spin"></div>
                <p className="font-sans text-[9px] text-white/40 italic">Fetching lyrics...</p>
              </div>
            ) : lyricsLines.length > 0 ? (
              lyricsLines.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                const isPast = activeLineIndex >= 0 && idx < activeLineIndex;
                const isEmpty = line.text.trim().length === 0;

                if (isEmpty) return <div key={idx} data-line-idx={idx} className="h-3"></div>;

                return (
                  <p
                    key={idx}
                    data-line-idx={idx}
                    className={`font-sans text-xs font-bold leading-relaxed transition-all duration-300 ${
                      isActive
                        ? "text-[#FF007A] scale-105 origin-left"
                        : isPast
                        ? "text-white/35"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {line.text}
                  </p>
                );
              })
            ) : (
              <p className="font-sans text-[10px] text-white/30 italic text-center py-8">
                No lyrics available.
              </p>
            )}
          </div>
        )}

        {activeTab === "sync" && (
          <div className="space-y-4">
            <p className="text-[9px] text-white/40 leading-relaxed text-left">
              Synchronize playback state, seconds-timestamp, and soundtracks live with other users on the network.
            </p>

            {/* Network listing */}
            <div className="space-y-2">
              {activeUsersOnNetwork.filter(u => u.username !== username).length === 0 ? (
                <p className="text-[9px] italic text-white/30 py-2">
                  No other active users. Open Melo in another window to test.
                </p>
              ) : (
                activeUsersOnNetwork.filter(u => u.username !== username).map(user => {
                  const isFollowed = followingTarget === user.username;
                  return (
                    <div 
                      key={user.username}
                      className={`p-2.5 rounded-xl flex items-center justify-between transition-all border ${
                        isFollowed 
                          ? "bg-[#FF007A]/5 border-[#FF007A]/20" 
                          : "bg-white/5 border-transparent hover:bg-white/10"
                      }`}
                    >
                      <div className="min-w-0 text-left">
                        <span className="font-sans text-[10px] font-bold text-white block truncate">
                          {user.username}
                        </span>
                        <p className="text-[8px] text-white/45 truncate">
                          {user.songTitle ? `Playing: ${user.songTitle}` : "Idle Space"}
                        </p>
                      </div>
                      <button
                        onClick={() => onFollowUser(isFollowed ? null : user.username)}
                        className={`font-sans text-[8px] font-bold uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer transition-all ${
                          isFollowed 
                            ? "bg-[#FF007A] text-white" 
                            : "bg-white/5 border border-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        {isFollowed ? "Following" : "Sync"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sandbox Simulator */}
            <div className="border border-white/5 bg-white/[0.02] p-3 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-[9px] font-sans">
                <span className="text-white/40 font-bold uppercase tracking-wider">Sync Simulator</span>
                <button 
                  onClick={() => setShowSimControls(!showSimControls)}
                  className="text-[#FF007A] font-bold uppercase cursor-pointer"
                >
                  {showSimControls ? "Hide" : "Show"}
                </button>
              </div>

              {showSimControls && (
                <div className="space-y-2 text-left pt-1">
                  <p className="text-[8px] text-white/30 leading-normal">Simulate Aria or Julian's network broadcast state to verify sync handlers:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => onTriggerSimulatedState("Aria Vance", 1, true)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 text-[8px] font-bold text-white px-2.5 py-1 rounded-lg cursor-pointer transition-transform"
                    >
                      Aria: Play Track 2
                    </button>
                    <button
                      onClick={() => onTriggerSimulatedState("Julian Thorne", 0, true)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 text-[8px] font-bold text-white px-2.5 py-1 rounded-lg cursor-pointer transition-transform"
                    >
                      Julian: Play Track 1
                    </button>
                    <button
                      onClick={() => onTriggerSimulatedState("Aria Vance", 0, false)}
                      className="bg-white/5 hover:bg-white/10 border border-white/5 text-[8px] font-bold text-red-300 px-2.5 py-1 rounded-lg cursor-pointer transition-transform"
                    >
                      Aria: Pause
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "playlist" && (
          <div className="space-y-3">
            <h3 className="font-serif text-xs font-bold text-white/80">Add to Playlist</h3>
            {addedStatus && (
              <div className="bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-3 py-1 rounded-lg flex items-center gap-1 justify-center animate-fade-in">
                <Check className="w-3 h-3" />
                Added to "{addedStatus}"!
              </div>
            )}

            <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar">
              {playlists.length === 0 ? (
                <p className="text-[9px] text-white/30 italic">No playlists found.</p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id, pl.name)}
                    className="w-full text-left p-1.5 hover:bg-white/5 rounded-lg text-[10px] text-white/60 hover:text-white transition-colors flex justify-between cursor-pointer"
                  >
                    <span>{pl.name}</span>
                    <span className="text-[8px] text-white/30">{pl.songs.length} tracks</span>
                  </button>
                ))
              )}
            </div>

            <form onSubmit={handleCreateAndAdd} className="flex gap-1.5 border-t border-white/5 pt-2">
              <input
                type="text"
                placeholder="New playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF007A]"
              />
              <button
                type="submit"
                className="bg-[#FF007A]/15 border border-[#FF007A]/30 text-[#FF007A] hover:bg-[#FF007A] hover:text-white px-2.5 rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer"
              >
                Create
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

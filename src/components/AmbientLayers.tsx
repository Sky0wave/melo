import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Shuffle, RotateCcw, Volume2, Plus, Trash2, ArrowRight, ShieldAlert, Radio } from "lucide-react";
import { MusicPlaybackEngine } from "../engine/MusicPlaybackEngine";
import { Song, PlaybackState } from "../engine/types";

interface AmbientLayersProps {
  engine: MusicPlaybackEngine;
  songs: Song[];
  onPlaySongDirectly: (song: Song) => void;
}

export function AmbientLayers({ engine, songs, onPlaySongDirectly }: AmbientLayersProps) {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [fadeDuration, setFadeDuration] = useState(1.2);
  const [queue, setQueue] = useState<Song[]>([]);
  const [history, setHistory] = useState<Song[]>([]);
  const [preloadedSong, setPreloadedSong] = useState<Song | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  // Transition countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Form input for adding song
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");

  // Sync state from engine
  useEffect(() => {
    const updateState = () => {
      const state = engine.getPlaybackState();
      setActiveLayer(state.activeLayer);
      setIsPlaying(state.isPlaying);
      setActiveSong(state.currentSong);
      setVolume(state.volume);
      setQueue(engine.getQueue());
      setHistory(engine.getHistory());
    };

    updateState();

    // Subscribe to engine events
    engine.on("play", updateState);
    engine.on("pause", updateState);
    engine.on("resume", updateState);
    engine.on("stop", updateState);
    engine.on("layer-changed", (layer) => {
      setActiveLayer(layer);
      updateState();
    });
    engine.on("queue-changed", (newQ) => {
      setQueue(newQ);
    });
    engine.on("state-change", updateState);

    engine.on("ended", () => {
      // Start 2-second transition countdown visualizer
      let remaining = 2.0;
      setCountdown(remaining);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 0.1;
        if (remaining <= 0) {
          setCountdown(null);
          clearInterval(countdownIntervalRef.current);
        } else {
          setCountdown(parseFloat(remaining.toFixed(1)));
        }
      }, 100);
    });

    engine.on("preload-start", (song) => {
      setIsPreloading(true);
      setPreloadedSong(song);
    });

    engine.on("preload-complete", (song) => {
      setIsPreloading(false);
      setPreloadedSong(song);
    });

    return () => {
      engine.off("play", updateState);
      engine.off("pause", updateState);
      engine.off("resume", updateState);
      engine.off("stop", updateState);
      engine.off("queue-changed", updateState);
      engine.off("layer-changed", updateState);
      engine.off("state-change", updateState);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [engine]);

  const handlePlayLayer = (layer: string) => {
    if (activeLayer === layer) {
      if (isPlaying) {
        engine.pause();
      } else {
        engine.resume();
      }
    } else {
      engine.playLayer(layer);
    }
  };

  const handleCrossfadeTo = (layer: string) => {
    engine.setLayerFadeDuration(fadeDuration);
    engine.crossFadeLayer(layer);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      engine.pause();
    } else {
      engine.resume();
    }
  };

  const handleStop = () => {
    engine.stop();
    setCountdown(null);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    engine.setVolume(vol);
  };

  const handleFadeDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dur = parseFloat(e.target.value);
    setFadeDuration(dur);
    engine.setLayerFadeDuration(dur);
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newArtist.trim() || !activeLayer) return;

    const newSong: Song = {
      id: `custom_${activeLayer}_${Date.now()}`,
      title: newTitle.trim(),
      artist: newArtist.trim(),
      album: "Custom Synthesis",
      duration: "03:00",
      durationSeconds: 180,
      genre: activeLayer,
      mood: "ambient",
      lyrics: "",
      coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150"
    };

    engine.addSongToQueue(newSong);
    setNewTitle("");
    setNewArtist("");
  };

  const handleRemoveSong = (songId: string) => {
    engine.removeSongFromQueue(songId);
  };

  const genres = ["adventure", "calm", "battle", "mystery", "emotional"];

  // Colors mapping for layers
  const genreColors: Record<string, { primary: string; gradient: string; ripple: string }> = {
    adventure: { primary: "#FF5E36", gradient: "from-[#FF5E36] to-[#FFA036]", ripple: "bg-[#FF5E36]/30" },
    calm: { primary: "#00E5FF", gradient: "from-[#00E5FF] to-[#00A8FF]", ripple: "bg-[#00E5FF]/30" },
    battle: { primary: "#FF0055", gradient: "from-[#FF0055] to-[#7A002B]", ripple: "bg-[#FF0055]/30" },
    mystery: { primary: "#B800FF", gradient: "from-[#B800FF] to-[#45007A]", ripple: "bg-[#B800FF]/30" },
    emotional: { primary: "#00FF66", gradient: "from-[#00FF66] to-[#008F3A]", ripple: "bg-[#00FF66]/30" }
  };

  const currentColors = activeLayer ? genreColors[activeLayer] : { primary: "#FF007A", gradient: "from-[#FF007A] to-[#8F0044]", ripple: "bg-[#FF007A]/30" };

  return (
    <div className="space-y-6 select-none pb-24">
      {/* HUD Header card */}
      <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 p-6 backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 rounded-full bg-mulberry-primary/10 blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Engine Mode</span>
            <h2 className="text-2xl font-bold font-serif tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              Ambient Soundscapes
            </h2>
            <p className="text-xs text-white/50 mt-1 max-w-md">
              Continuous category-based music, procedural synthesized sound, gapless 2s transitions, and live Fisher-Yates shuffle tracking.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/5 p-2 rounded-2xl">
            <button
              onClick={handleTogglePlay}
              disabled={!activeLayer}
              className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                isPlaying 
                  ? "bg-[#FF007A] text-white shadow-lg shadow-[#FF007A]/25" 
                  : "bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>
            <button
              onClick={handleStop}
              disabled={!activeLayer}
              className="p-3.5 rounded-xl bg-white/5 text-white hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>

        {/* Master controls grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-white/5">
          {/* Volume control */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60 font-medium flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5" /> VOLUME LEVEL
              </span>
              <span className="font-mono text-[#FF007A] font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF007A]"
            />
          </div>

          {/* Fade transition time */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60 font-medium flex items-center gap-1">
                <Shuffle className="w-3.5 h-3.5" /> CROSSFADE DURATION
              </span>
              <span className="font-mono text-[#FF007A] font-bold">{fadeDuration.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.1"
              value={fadeDuration}
              onChange={handleFadeDurationChange}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF007A]"
            />
          </div>
        </div>
      </div>

      {/* Grid of Layers & Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Genre Layers selector (Left Col) */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/50">Layers</h3>
            {activeLayer && (
              <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-white/80 animate-pulse uppercase font-mono font-bold">
                ● {activeLayer}
              </span>
            )}
          </div>
          
          <div className="space-y-2.5">
            {genres.map(genre => {
              const isActive = activeLayer === genre;
              const col = genreColors[genre];
              return (
                <div 
                  key={genre}
                  className={`relative overflow-hidden rounded-2xl transition-all duration-300 border ${
                    isActive 
                      ? `bg-gradient-to-r ${col.gradient} border-white/20 text-white shadow-xl shadow-black/30 scale-[1.02]` 
                      : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wide capitalize">{genre}</h4>
                      <p className={`text-[10px] ${isActive ? "text-white/80" : "text-white/40"} mt-0.5`}>
                        {genre === "adventure" && "Uplifting pulse, arpeggiated synth"}
                        {genre === "calm" && "Deep relaxing drone, slow LFO filter"}
                        {genre === "battle" && "Fast techno drive, detuned saw oscillator"}
                        {genre === "mystery" && "Dark atmospheric tension, locrian chords"}
                        {genre === "emotional" && "Warm swelling pad, string vibrato"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePlayLayer(genre)}
                        className={`p-2.5 rounded-xl cursor-pointer ${
                          isActive 
                            ? "bg-white/25 hover:bg-white/35 text-white" 
                            : "bg-white/5 hover:bg-white/10 text-white/80"
                        }`}
                        title="Toggle Play"
                      >
                        {isActive && isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                      </button>
                      
                      <button
                        onClick={() => handleCrossfadeTo(genre)}
                        disabled={activeLayer === genre || !activeLayer}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isActive 
                            ? "hidden"
                            : "bg-white/5 hover:bg-[#FF007A]/20 hover:text-[#FF007A] disabled:opacity-30 disabled:cursor-not-allowed text-white/80"
                        }`}
                        title={`Crossfade to ${genre}`}
                      >
                        <Radio className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isActive && isPlaying && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30 overflow-hidden">
                      <div className="h-full bg-white w-1/3 rounded-full animate-[progress_1.5s_infinite_linear]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Visualizer & Preload Tracker (Center/Right Col) */}
        <div className="md:col-span-2 space-y-6">
          {/* Active status & sound visualizer */}
          <div className="relative overflow-hidden rounded-3xl bg-white/[0.02] border border-white/5 p-6 flex flex-col justify-between min-h-[220px]">
            {/* Live Ripple/Wave Background */}
            {isPlaying && activeLayer && (
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <div className={`w-64 h-64 rounded-full ${currentColors.ripple} animate-ping`}></div>
                <div className={`w-96 h-96 rounded-full ${currentColors.ripple} animate-[ping_3s_infinite] absolute`}></div>
              </div>
            )}

            <div className="flex justify-between items-start z-10">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#FF007A]">Active Soundscape</span>
                {activeSong ? (
                  <div className="mt-1">
                    <h3 className="text-xl font-bold text-white">{activeSong.title}</h3>
                    <p className="text-xs text-white/50">{activeSong.artist} ({activeSong.genre})</p>
                  </div>
                ) : (
                  <h3 className="text-sm font-semibold text-white/40 mt-1">No active soundscape</h3>
                )}
              </div>

              {countdown !== null && (
                <div className="bg-[#FF007A]/20 border border-[#FF007A]/30 px-3 py-1.5 rounded-full text-center">
                  <p className="text-[8px] uppercase tracking-wider font-bold text-[#FF007A]">Layer Gap</p>
                  <p className="font-mono text-xs font-bold text-[#FF007A] mt-0.5">{countdown}s delay...</p>
                </div>
              )}
            </div>

            {/* Reactive Soundwave visualizer */}
            <div className="h-24 flex items-end justify-center gap-1 px-4 my-4 z-10">
              {Array.from({ length: 24 }).map((_, idx) => {
                // Generate varied heights based on genre and isPlaying
                const minHeight = isPlaying ? "h-2" : "h-1";
                const animDuration = activeLayer === "battle" ? "0.3s" : activeLayer === "calm" ? "1.5s" : "0.7s";
                const delay = `${idx * 0.05}s`;
                
                return (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-300 ${minHeight} bg-gradient-to-t ${currentColors.gradient}`}
                    style={{
                      animation: isPlaying ? `equalizerBars ${animDuration} ease-in-out infinite alternate` : "none",
                      animationDelay: delay,
                    }}
                  />
                );
              })}
            </div>

            {/* Preloading indicators */}
            <div className="flex justify-between items-center text-[10px] text-white/40 border-t border-white/5 pt-4 z-10">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-[#FF007A]" /> Procedural fallback active
              </span>

              {preloadedSong ? (
                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md text-white/70">
                  <span className={`w-1.5 h-1.5 rounded-full ${isPreloading ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}></span>
                  {isPreloading ? "PRELOADING: " : "PRELOADED: "}
                  <span className="font-semibold truncate max-w-[120px]">{preloadedSong.title}</span>
                </span>
              ) : (
                <span>No preloaded cache</span>
              )}
            </div>
          </div>

          {/* Fisher-Yates Tracker Console */}
          <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-[#FF007A]" /> Fisher-Yates Shuffle Tracker
              </h3>
              <p className="text-[10px] text-white/40 mt-0.5">
                Demonstrating O(n) cycle fairness. Once all songs finish, a fresh shuffle order is calculated.
              </p>
            </div>

            <div className="space-y-3">
              {/* Shuffled list horizontal queue */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-white/50 tracking-wider">Current Cycle Shuffled Queue</p>
                {queue.length > 0 ? (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {queue.map((song, index) => {
                      const isCurrent = activeSong?.id === song.id;
                      const hasPlayed = history.some(h => h.id === song.id);
                      return (
                        <div
                          key={song.id}
                          className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] ${
                            isCurrent
                              ? `bg-gradient-to-r ${currentColors.gradient} border-white/20 text-white font-bold`
                              : hasPlayed
                              ? "bg-white/[0.01] border-white/5 text-white/30"
                              : "bg-white/5 border-white/10 text-white/80"
                          }`}
                        >
                          <span className="font-mono text-[9px] opacity-60">#{index + 1}</span>
                          <span className="truncate max-w-[90px]">{song.title}</span>
                          {isCurrent && <span className="text-[9px] animate-pulse">●</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 italic">Select an active layer to view queue order</p>
                )}
              </div>

              {/* History list track */}
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase font-bold text-white/50 tracking-wider">Cycle Play History Stack</p>
                {history.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {history.map((song, index) => (
                      <div
                        key={`${song.id}_hist_${index}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-white/60"
                      >
                        <RotateCcw className="w-2.5 h-2.5 text-[#FF007A]" />
                        <span>{song.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 italic">No songs played in current cycle yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Queue Manager */}
          {activeLayer && (
            <div className="rounded-3xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#FF007A]" /> Manage Layer Queue
                </h3>
                <p className="text-[10px] text-white/40 mt-0.5">
                  Add custom tracks or remove elements dynamically from the active "{activeLayer}" layer.
                </p>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddSong} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Song Title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF007A] transition-colors"
                  required
                />
                <input
                  type="text"
                  placeholder="Artist..."
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#FF007A] transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#FF007A] text-white hover:bg-[#FF007A]/90 transition-all font-semibold rounded-xl px-4 py-2 text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> ADD TRACK
                </button>
              </form>

              {/* Queue table list */}
              <div className="max-h-[200px] overflow-y-auto border border-white/5 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider text-white/40 bg-white/[0.01]">
                      <th className="py-2.5 px-4 font-semibold">Track</th>
                      <th className="py-2.5 px-4 font-semibold">Artist</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map(song => {
                      const isCurrent = activeSong?.id === song.id;
                      return (
                        <tr
                          key={song.id}
                          className={`border-b border-white/[0.03] text-xs hover:bg-white/[0.01] transition-colors ${
                            isCurrent ? "text-[#FF007A]" : "text-white/80"
                          }`}
                        >
                          <td className="py-2.5 px-4 font-medium max-w-[120px] truncate">{song.title}</td>
                          <td className="py-2.5 px-4 text-white/50 truncate max-w-[100px]">{song.artist}</td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              onClick={() => handleRemoveSong(song.id)}
                              className="p-1.5 hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete from layer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {queue.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-xs text-white/30 italic">
                          Queue is empty. Add a song above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

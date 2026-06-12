import React, { useState } from "react";
import { Play, Sparkles, Plus, Trash2, ArrowRight, Heart, ListMusic, RefreshCw, Shuffle, FolderPlus } from "lucide-react";
import { Song, Playlist } from "../types";

interface LibraryManagerProps {
  likedSongs: Song[];
  playlists: Playlist[];
  onCreatePlaylist: (name: string, description: string) => void;
  onPlaySong: (song: Song) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onTrackQueueChange: (queue: Song[], startIdx: number, shuffle: boolean) => void;
  onRemoveFromPlaylist: (songId: string, playlistId: string) => void;
  recentHistory: { songTitle: string; artist: string; count: number }[];
  onAddPlaylist: (playlist: Playlist) => void;
}

export function LibraryManager({
  likedSongs,
  playlists,
  onCreatePlaylist,
  onPlaySong,
  favorites,
  onToggleFavorite,
  onTrackQueueChange,
  onRemoveFromPlaylist,
  recentHistory,
  onAddPlaylist
}: LibraryManagerProps) {
  const [activeChip, setActiveChip] = useState<"playlists" | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [generatingDaily, setGeneratingDaily] = useState(false);

  // Selected custom playlist detailed view
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim() || "Dynamic high-fidelity music collection.");
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setShowCreateModal(false);
  };

  const handlePlayLikedAll = (shuffle: boolean = false) => {
    if (likedSongs.length > 0) {
      onTrackQueueChange(likedSongs, 0, shuffle);
    }
  };

  const handlePlayPlaylistAll = (playlist: Playlist, shuffle: boolean = false) => {
    if (playlist.songs.length > 0) {
      onTrackQueueChange(playlist.songs, 0, shuffle);
    }
  };

  // Personalized daily playlist generation
  const handleGenerateDaily = async () => {
    setGeneratingDaily(true);
    try {
      const historyPayload = recentHistory.map(h => ({
        songTitle: h.songTitle,
        artist: h.artist,
        count: h.count,
        songId: h.songTitle.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        timestamp: new Date().toISOString()
      }));

      const res = await fetch("/api/generate-daily-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: historyPayload })
      });
      const data = await res.json();
      
      if (data && data.name) {
        const newAIPlaylist: Playlist = {
          id: "ai_daily_" + Date.now(),
          name: data.name,
          description: data.description || "Synthesised by Melo AI based on your listening habits.",
          isCustom: true,
          songs: data.songs || [],
          coverUrl: "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"
        };
        onAddPlaylist(newAIPlaylist);
        setSelectedPlaylistId(newAIPlaylist.id);
        setActiveChip("playlists");
      }
    } catch (err) {
      console.error("Personalized AI playlist generation failed:", err);
    } finally {
      setGeneratingDaily(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* If looking at custom playlist details, show back view */}
      {selectedPlaylist ? (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => setSelectedPlaylistId(null)}
              className="text-[10px] font-sans font-bold text-[#FF007A] uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
            >
              ← Back
            </button>
            <span className="bg-[#FF007A]/10 border border-[#FF007A]/20 px-2 py-0.5 rounded-full text-[8px] font-bold text-[#FF007A] uppercase tracking-wider">
              Playlist Manager
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Playlist Details Card */}
            <div className="lg:col-span-1 glass-panel rounded-2xl p-5 border border-white/5 space-y-4 text-left">
              <img 
                src={selectedPlaylist.coverUrl || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"} 
                alt={selectedPlaylist.name}
                className="w-full aspect-square rounded-xl object-cover border border-white/5"
              />
              <div className="space-y-1.5">
                <span className="text-[8px] uppercase text-white/30 tracking-widest font-semibold block">Playlist</span>
                <h2 className="font-serif text-lg font-bold text-white leading-none">{selectedPlaylist.name}</h2>
                <p className="font-sans text-[10px] text-white/50">{selectedPlaylist.description}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handlePlayPlaylistAll(selectedPlaylist, false)}
                    className="w-full bg-[#FF007A] text-white py-2 rounded-xl font-sans text-[8px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FF007A]/90 active:scale-95 transition-all"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" /> Play
                  </button>
                  <button
                    onClick={() => handlePlayPlaylistAll(selectedPlaylist, true)}
                    className="w-full bg-white/5 border border-white/5 text-white py-2 rounded-xl font-sans text-[8px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <Shuffle className="w-2.5 h-2.5" /> Shuffle
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Playlist Tracks List */}
            <div className="lg:col-span-2 space-y-2.5">
              <h3 className="font-serif text-sm font-bold text-white/80 px-1">Songs ({selectedPlaylist.songs.length})</h3>
              {selectedPlaylist.songs.length === 0 ? (
                <div className="glass-panel p-8 rounded-xl text-center text-white/40 font-sans text-xs">
                  Empty. Find songs in search and add them to this playlist!
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedPlaylist.songs.map((song, index) => (
                    <div
                      key={song.id}
                      onClick={() => onPlaySong(song)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[10px] text-white/20 w-4 group-hover:text-[#FF007A]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <img className="w-8 h-8 rounded-lg object-cover" alt={song.title} src={song.coverUrl} />
                        <div className="min-w-0">
                          <div className="font-sans text-xs font-bold text-white truncate group-hover:text-[#FF007A] transition-colors">
                            {song.title}
                          </div>
                          <p className="font-sans text-[9px] text-white/40 truncate">{song.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-[9px] text-white/30">{song.duration}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveFromPlaylist(song.id, selectedPlaylist.id)}
                          className="p-1 hover:bg-white/5 rounded-full text-white/30 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Library Collection Left Column */}
            <div className="lg:col-span-2 space-y-6 w-full">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-white/90">Your Library</h2>
                  <p className="text-[10px] text-white/40 tracking-wider">Playlists, collections, and AI mixes.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="lg:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-white flex items-center justify-center font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Liked Songs Header Block */}
              <section className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl h-36 flex items-end p-4 border border-white/5 group">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080507] via-transparent to-transparent z-10"></div>
                  <img
                    alt="Liked Songs Art"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 transition-transform duration-750 group-hover:scale-105"
                    src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600"
                  />
                  <div className="relative z-20 w-full flex justify-between items-end">
                    <div className="text-left">
                      <span className="font-sans text-[8px] text-[#FF007A] mb-0.5 block tracking-widest uppercase font-bold">
                        YOUR COLLECTION
                      </span>
                      <h2 className="font-serif text-lg font-bold text-white leading-tight">
                        Liked Songs
                      </h2>
                      <span className="font-sans text-[9px] text-white/40 block mt-0.5">
                        {likedSongs.length} tracks
                      </span>
                    </div>
                    <button 
                      onClick={() => handlePlayLikedAll(false)}
                      className="bg-[#FF007A] hover:bg-[#FF007A]/90 text-white px-4 py-1.5 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                      PLAY ALL
                    </button>
                  </div>
                </div>

                {/* AI Generator Box */}
                <div 
                  onClick={handleGenerateDaily}
                  className="glass-panel border-dashed border-[#FF007A]/25 rounded-2xl p-4 flex justify-between items-center hover:border-[#FF007A]/50 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 text-left">
                    <div className="w-10 h-10 bg-[#FF007A]/10 rounded-xl flex items-center justify-center text-[#FF007A] flex-shrink-0">
                      {generatingDaily ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-serif text-xs font-bold text-white">AI Daily Mix</h3>
                      <p className="font-sans text-[9px] text-white/40 truncate">
                        {generatingDaily ? "Analyzing..." : "Generate today's mix from your profile"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform" />
                </div>
              </section>

              {/* Filter Chips */}
              <div className="flex gap-2 border-b border-white/5 pb-2">
                <button 
                  onClick={() => setActiveChip("all")}
                  className={`px-4 py-1 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeChip === "all" ? "bg-[#FF007A] text-white" : "bg-white/5 text-white/40 hover:text-white"
                  }`}
                >
                  Liked Tracks ({likedSongs.length})
                </button>
                <button 
                  onClick={() => setActiveChip("playlists")}
                  className={`px-4 py-1 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeChip === "playlists" ? "bg-[#FF007A] text-white" : "bg-white/5 text-white/40 hover:text-white"
                  }`}
                >
                  Playlists ({playlists.length})
                </button>
              </div>

              {/* Content Lists */}
              <div className="space-y-1">
                {activeChip === "playlists" ? (
                  playlists.length === 0 ? (
                    <div className="glass-panel p-8 rounded-xl text-center text-white/40 font-sans text-xs">
                      Create a custom playlist to start sorting soundscapes.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {playlists.map(pl => (
                        <div
                          key={pl.id}
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className="glass-panel p-2.5 rounded-xl flex items-center justify-between hover:bg-white/5 cursor-pointer group border border-transparent hover:border-white/5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={pl.coverUrl || "https://images.unsplash.com/photo-1614149162883-504ce4d13909?w=300"} 
                              alt={pl.name}
                              className="w-10 h-10 rounded-lg object-cover border border-white/5 flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-serif text-xs font-semibold text-white truncate group-hover:text-[#FF007A] transition-colors">
                                {pl.name}
                              </div>
                              <p className="font-sans text-[8px] text-white/40 truncate">
                                {pl.songs.length} Tracks • {pl.description}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="text-white/30 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  likedSongs.length === 0 ? (
                    <div className="glass-panel p-8 rounded-xl text-center text-white/40 font-sans text-xs">
                      Your Liked Songs list is empty. Add songs to get started.
                    </div>
                  ) : (
                    <div className="space-y-1 font-sans">
                      {likedSongs.map((song) => (
                        <div
                          key={song.id}
                          onClick={() => onPlaySong(song)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={song.coverUrl} alt={song.title} className="w-8 h-8 rounded-lg object-cover" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate group-hover:text-[#FF007A] transition-colors">
                                {song.title}
                              </div>
                              <p className="text-[9px] text-white/40 truncate">{song.artist} • {song.album}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] text-white/30 font-mono">{song.duration}</span>
                            <button
                              type="button"
                              onClick={() => onToggleFavorite(song.id)}
                              className="p-1 hover:bg-white/5 rounded-full text-white/30 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

            {/* Sidebar Right Column: Playlist Creation Form (hidden on mobile, shown on desktop) */}
            <div className="hidden lg:block w-full">
              <form onSubmit={handleCreate} className="glass-panel rounded-2xl p-5 border border-white/5 space-y-4 text-left">
                <h3 className="font-serif text-sm font-bold text-white flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4 text-[#FF007A]" />
                  Create Playlist
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] font-sans font-bold uppercase text-white/40 mb-1">Playlist Name</label>
                    <input
                      required
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="e.g. Late-night Rose"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF007A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-sans font-bold uppercase text-white/40 mb-1">Description</label>
                    <textarea
                      value={newPlaylistDesc}
                      onChange={(e) => setNewPlaylistDesc(e.target.value)}
                      placeholder="A moody ambient mix..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF007A] h-16 resize-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 text-[10px] font-sans font-bold bg-[#FF007A] text-white rounded-xl cursor-pointer hover:bg-[#FF007A]/95 transition-all"
                >
                  Create Playlist
                </button>
              </form>
            </div>
          </div>

          {/* Modal Creator for Mobile/Tablet */}
          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <form onSubmit={handleCreate} className="glass-panel rounded-2xl p-5 max-w-xs w-full space-y-4 border border-white/10 shadow-2xl relative text-left">
                <h3 className="font-serif text-sm font-bold text-white">Create Playlist</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] font-sans font-bold uppercase text-white/40 mb-1">Playlist Name</label>
                    <input
                      required
                      type="text"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="e.g. Late-night Rose"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF007A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-sans font-bold uppercase text-white/40 mb-1">Description</label>
                    <textarea
                      value={newPlaylistDesc}
                      onChange={(e) => setNewPlaylistDesc(e.target.value)}
                      placeholder="A moody ambient mix..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF007A] h-12 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 text-[10px] font-sans font-bold border border-white/5 text-white rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-[10px] font-sans font-bold bg-[#FF007A] text-white rounded-lg cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

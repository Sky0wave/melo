import React, { useState, useEffect } from "react";
import { Search, X, Play, FolderPlus, History, Zap, Radio } from "lucide-react";
import { Song } from "../types";

interface SearchEngineProps {
  onPlaySong: (song: Song) => void;
  onAddSongToLibrary: (song: Song) => void;
  playlists: { id: string; name: string }[];
  onAddSongToPlaylist: (song: Song, playlistId: string) => void;
  songs?: Song[];
  userId: number | null;
}

type SearchSource = "database" | "youtube" | "fallback" | "none";

const SOURCE_BADGE: Record<SearchSource, { label: string; color: string; icon: React.ReactNode }> = {
  database: {
    label: "Cached",
    color: "bg-emerald-950/60 border-emerald-500/30 text-emerald-400",
    icon: <Zap className="w-2.5 h-2.5" />
  },
  youtube: {
    label: "Live",
    color: "bg-rose-950/60 border-rose-500/30 text-rose-400",
    icon: <Radio className="w-2.5 h-2.5" />
  },
  fallback: {
    label: "Offline",
    color: "bg-zinc-900/60 border-zinc-500/30 text-zinc-400",
    icon: <Radio className="w-2.5 h-2.5" />
  },
  none: {
    label: "",
    color: "",
    icon: null
  }
};

const QUICK_SEARCHES = [
  "Arijit Singh", "Taylor Swift", "The Weeknd", "Diljit Dosanjh",
  "Coldplay", "Shreya Ghoshal", "Ed Sheeran", "AP Dhillon"
];

const MOODS = ["Melancholic", "Energetic", "Late-night", "Romantic", "Focus"];

interface HistoryItem {
  id: number;
  query: string;
}

export function SearchEngine({
  onPlaySong,
  onAddSongToLibrary,
  playlists,
  onAddSongToPlaylist,
  songs = [],
  userId
}: SearchEngineProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Song[]>([]);
  const [searched, setSearched] = useState(false);
  const [source, setSource] = useState<SearchSource>("none");
  const [limit, setLimit] = useState(10);
  const [recentSearches, setRecentSearches] = useState<HistoryItem[]>([]);
  const [showPlaylistMenuId, setShowPlaylistMenuId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");

  const fetchSearchHistory = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/user/search-history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentSearches(data);
      }
    } catch (err) {
      console.warn("Failed to fetch search history:", err);
    }
  };

  useEffect(() => {
    fetchSearchHistory();
  }, [userId]);

  const runSearch = async (q: string, lim?: number) => {
    const activeQuery = q.trim();
    if (!activeQuery) return;

    setLoading(true);
    setSearched(true);
    setSource("none");
    setStatusMsg("Checking library cache…");
    setResults([]);

    // Save search query to database
    if (userId) {
      fetch("/api/user/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, query: activeQuery })
      })
        .then(() => fetchSearchHistory())
        .catch(err => console.warn("Failed to save search history:", err));
    }

    try {
      const res = await fetch("/api/smart/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: activeQuery, limit: lim ?? limit })
      });

      const data = await res.json();
      const src: SearchSource = data.source || "none";
      setSource(src);
      setResults(data.results || []);

      if (src === "database") {
        setStatusMsg(`Found in cache — instant result`);
      } else if (src === "youtube") {
        setStatusMsg(`Fetched live from YouTube & saved to library`);
      } else {
        setStatusMsg(`Showing offline results`);
      }
    } catch (err) {
      console.error("Smart search error:", err);
      setResults([]);
      setStatusMsg("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runSearch(query);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setSource("none");
    setStatusMsg("");
  };

  const handleDeleteHistoryItem = async (id: number) => {
    if (!userId) return;
    try {
      await fetch(`/api/user/search-history?userId=${userId}&id=${id}`, {
        method: "DELETE"
      });
      fetchSearchHistory();
    } catch (err) {
      console.warn("Failed to delete search history item:", err);
    }
  };

  const badge = SOURCE_BADGE[source];

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* ── Left Column: Search ── */}
        <div className="lg:col-span-2 space-y-5 w-full">

          {/* Header */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-white/90">Discover</h2>
            <p className="text-[10px] text-white/40 tracking-wider mt-0.5">
              Smart search — checks your library first, streams from YouTube if not cached.
            </p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
              <input
                id="smart-search-input"
                type="text"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-9 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF007A]/40 focus:bg-white/8 transition-all font-sans"
                placeholder="Search any song, artist or album…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-0.5 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Limit selector */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-xl px-2.5 shrink-0">
              <span className="text-[8px] uppercase font-sans font-bold text-white/30 tracking-wider">Max:</span>
              <input
                type="number"
                min="1"
                max="50"
                className="w-7 bg-transparent text-xs text-white text-center font-sans focus:outline-none border-none p-0"
                value={limit}
                onChange={e => setLimit(Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
              />
            </div>

            <button
              type="submit"
              id="smart-search-btn"
              disabled={loading}
              className="bg-[#FF007A]/90 hover:bg-[#FF007A] disabled:opacity-50 text-white px-5 rounded-xl text-xs font-sans font-bold active:scale-95 transition-all cursor-pointer"
            >
              {loading ? "…" : "Search"}
            </button>
          </form>

          {/* Status bar */}
          {searched && !loading && statusMsg && (
            <div className="flex items-center gap-2 -mt-2 px-1">
              {source !== "none" && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider font-sans ${badge.color}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              )}
              <span className="text-[10px] text-white/40 font-sans">{statusMsg}</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border border-[#FF007A]/20 border-t-[#FF007A] rounded-full animate-spin" />
              </div>
              <p className="font-sans text-[10px] text-white/30">Checking library cache…</p>
            </div>
          )}

          {/* Results */}
          {searched && !loading && (
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-serif text-sm font-bold text-white/90">Search Results</h3>
                <span className="font-sans text-[9px] text-white/40 font-semibold uppercase">
                  {results.length} tracks
                </span>
              </div>

              {results.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-xl border border-white/5">
                  <span className="block text-2xl mb-2">🔍</span>
                  <p className="font-sans text-[10px] text-white/40">No results found.</p>
                  <p className="font-sans text-[9px] text-white/25 mt-1">Try a different spelling or artist name.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {results.map((song, i) => (
                    <div
                      key={song.id}
                      id={`search-result-${i}`}
                      onClick={() => onPlaySong(song)}
                      className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5 group cursor-pointer relative"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/5 flex-shrink-0 bg-white/5">
                          <img
                            className="w-full h-full object-cover"
                            alt={song.title}
                            src={song.coverUrl}
                            onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${song.videoId}/hqdefault.jpg`; }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-4 h-4 text-[#FF007A] fill-current" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans text-xs font-bold text-white truncate leading-snug group-hover:text-[#FF007A] transition-colors">
                            {song.title}
                          </div>
                          <p className="font-sans text-[9px] text-white/40 truncate">
                            {song.artist}
                            {song.duration && song.duration !== "—" && (
                              <span className="text-white/20 ml-1">· {song.duration}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {/* Playlist add */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowPlaylistMenuId(showPlaylistMenuId === song.id ? null : song.id)}
                            className="p-1.5 text-white/30 hover:text-[#FF007A] transition-colors rounded-full hover:bg-white/5"
                            title="Add to playlist"
                          >
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                          {showPlaylistMenuId === song.id && (
                            <div className="absolute right-0 top-7 bg-[#0f0b0d] border border-white/10 p-2 rounded-lg shadow-2xl z-50 w-36 space-y-1">
                              <p className="text-[8px] font-sans font-bold text-white/30 uppercase tracking-widest p-1 border-b border-white/5">Add to:</p>
                              {playlists.length === 0 ? (
                                <p className="text-[8px] italic text-white/30 p-1">No playlists.</p>
                              ) : playlists.map(pl => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={() => { onAddSongToPlaylist(song, pl.id); setShowPlaylistMenuId(null); }}
                                  className="w-full text-left p-1 hover:bg-white/5 text-[9px] text-white/60 hover:text-white rounded transition-colors truncate cursor-pointer"
                                >
                                  {pl.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add to library */}
                        <button
                          type="button"
                          onClick={() => onAddSongToLibrary(song)}
                          className="px-2.5 py-1 bg-[#FF007A]/10 border border-[#FF007A]/20 text-[#FF007A] hover:bg-[#FF007A] hover:text-white transition-colors rounded-lg text-[8px] font-sans font-bold uppercase tracking-wider cursor-pointer"
                        >
                          + Library
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Before search: quick searches & moods */}
          {!searched && !loading && (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[9px] font-sans font-bold uppercase tracking-widest text-white/30">Quick Search</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SEARCHES.map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setQuery(name); runSearch(name); }}
                      className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-sans text-white/50 hover:text-white hover:bg-white/10 hover:border-[#FF007A]/20 transition-all cursor-pointer"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[9px] font-sans font-bold uppercase tracking-widest text-white/30">Browse by Mood</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => { setQuery(mood); runSearch(mood); }}
                      className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-sans text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: How it works + recent ── */}
        <div className="space-y-6 w-full">

          {/* How smart search works */}
          <section className="glass-panel rounded-2xl border border-white/5 p-4 space-y-3">
            <h3 className="font-serif text-sm font-bold text-white/80">How Search Works</h3>
            <div className="space-y-2.5">
              {[
                { step: "1", icon: "⚡", color: "text-emerald-400", label: "Check Cache", desc: "Instantly returns from your Neon DB library." },
                { step: "2", icon: "🔴", color: "text-rose-400", label: "Stream Live", desc: "If not cached, fetches real results from YouTube." },
                { step: "3", icon: "💾", color: "text-sky-400", label: "Auto-save", desc: "Results are saved — next search is instant." }
              ].map(({ step, icon, color, label, desc }) => (
                <div key={step} className="flex items-start gap-2.5">
                  <span className={`text-base leading-none mt-0.5 ${color}`}>{icon}</span>
                  <div>
                    <p className={`font-sans text-[10px] font-bold ${color}`}>{label}</p>
                    <p className="font-sans text-[9px] text-white/30 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <section className="space-y-2">
              <h3 className="font-sans text-[8px] text-white/30 uppercase tracking-widest font-semibold">Recent</h3>
              <div className="space-y-0.5">
                {recentSearches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setQuery(item.query); runSearch(item.query); }}
                    className="flex items-center justify-between text-[10px] text-white/50 hover:text-[#FF007A] transition-colors cursor-pointer py-1.5 border-b border-white/5 group"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-3 h-3 opacity-30" />
                      <span>{item.query}</span>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDeleteHistoryItem(item.id); }}
                      className="text-white/20 hover:text-white/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Search, X, Play, Music, FolderPlus, Radio, Youtube, History } from "lucide-react";
import { Song } from "../types";

const REAL_CURATED_SONGS: Song[] = [
  {
    id: "yt_7KIHvuMl4Kk",
    title: "Golden Brown",
    artist: "The Stranglers",
    album: "La Folie",
    duration: "03:27",
    durationSeconds: 207,
    genre: "Rock",
    mood: "Classic",
    lyrics: "",
    coverUrl: "https://img.youtube.com/vi/7KIHvuMl4Kk/hqdefault.jpg",
    videoId: "7KIHvuMl4Kk",
    source: "youtube"
  },
  {
    id: "yt_o_1aF54DO60",
    title: "Young and Beautiful",
    artist: "Lana Del Rey",
    album: "The Great Gatsby",
    duration: "03:56",
    durationSeconds: 236,
    genre: "Pop",
    mood: "Melancholic",
    lyrics: "",
    coverUrl: "https://img.youtube.com/vi/o_1aF54DO60/hqdefault.jpg",
    videoId: "o_1aF54DO60",
    source: "youtube"
  },
  {
    id: "yt_8xg3vE8Ie_E",
    title: "Love Story",
    artist: "Taylor Swift",
    album: "Fearless",
    duration: "03:55",
    durationSeconds: 235,
    genre: "Country Pop",
    mood: "Romantic",
    lyrics: "",
    coverUrl: "https://img.youtube.com/vi/8xg3vE8Ie_E/hqdefault.jpg",
    videoId: "8xg3vE8Ie_E",
    source: "youtube"
  }
];

interface SearchEngineProps {
  onPlaySong: (song: Song) => void;
  onAddSongToLibrary: (song: Song) => void;
  playlists: { id: string; name: string }[];
  onAddSongToPlaylist: (song: Song, playlistId: string) => void;
  songs?: Song[];
}

export function SearchEngine({
  onPlaySong,
  onAddSongToLibrary,
  playlists,
  onAddSongToPlaylist,
  songs = []
}: SearchEngineProps) {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"database" | "youtube">("database");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Song[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchLimit, setSearchLimit] = useState<number>(20);
  const [didYouMean, setDidYouMean] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "Midnight Bloom",
    "Experimental Ambient"
  ]);
  const [showPlaylistMenuId, setShowPlaylistMenuId] = useState<string | null>(null);

  const categories = [
    { name: "Jazz", colorClass: "from-amber-950/20" },
    { name: "Classical", colorClass: "from-emerald-950/20" },
    { name: "Electronic", colorClass: "from-blue-950/20" },
    { name: "Ambient", colorClass: "from-cyan-950/20" },
    { name: "Hip Hop", colorClass: "from-violet-950/20" },
    { name: "Podcasts", colorClass: "from-rose-950/20" }
  ];

  const handleSearchSubmit = async (e?: React.FormEvent, customQuery?: string, filterGenre?: string, filterMood?: string) => {
    if (e) e.preventDefault();
    
    const activeQuery = customQuery !== undefined ? customQuery : query;
    const activeGenre = filterGenre !== undefined ? filterGenre : selectedGenre;
    const activeMood = filterMood !== undefined ? filterMood : selectedMood;

    if (!activeQuery.trim() && !activeGenre && !activeMood) return;

    setLoading(true);
    setSearched(true);
    setDidYouMean(""); 
    if (activeQuery.trim() && !recentSearches.includes(activeQuery.trim())) {
      setRecentSearches(prev => [activeQuery.trim(), ...prev.slice(0, 4)]);
    }

    try {
      let endpoint = "/api/db/search";
      if (searchMode === "youtube") {
        endpoint = "/api/youtube/search";
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: activeQuery,
          genre: activeGenre,
          mood: activeMood,
          limit: searchLimit,
          maxResults: searchLimit
        })
      });

      const data = await response.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setResults(data.results || []);
        setDidYouMean(data.didYouMean || "");
      } else if (Array.isArray(data)) {
        setResults(data);
        setDidYouMean("");
      } else {
        setResults([]);
        setDidYouMean("");
      }
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      setDidYouMean("");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedGenre(null);
    setSelectedMood(null);
    setResults([]);
    setSearched(false);
    setDidYouMean("");
  };

  const selectCategory = (categoryName: string) => {
    setSelectedGenre(categoryName);
    setQuery(categoryName);
    handleSearchSubmit(undefined, categoryName, categoryName, undefined);
  };

  const selectMood = (moodName: string) => {
    setSelectedMood(moodName);
    handleSearchSubmit(undefined, query, undefined, moodName);
  };

  const handlePlaylistAdd = (song: Song, playlistId: string) => {
    onAddSongToPlaylist(song, playlistId);
    setShowPlaylistMenuId(null);
  };

  const trendingSong1 = songs.length > 0 ? songs[0] : REAL_CURATED_SONGS[0];
  const trendingSong2 = songs.length > 1 ? songs[1] : REAL_CURATED_SONGS[1];
  const trendingSong3 = songs.length > 2 ? songs[2] : REAL_CURATED_SONGS[2];

  return (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Search Left Column */}
        <div className="lg:col-span-2 space-y-6 w-full">
          {/* Screen Header */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-white/90">Discover</h2>
            <p className="text-[10px] text-white/40 tracking-wider">Search the library or stream live audio.</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#0f0b0d] p-1 rounded-full border border-white/5">
            <button
              onClick={() => setSearchMode("database")}
              className={`flex-1 py-1.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                searchMode === "database"
                  ? "bg-[#FF007A] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Music className="w-3 h-3" />
              Library DB
            </button>
            <button
              onClick={() => setSearchMode("youtube")}
              className={`flex-1 py-1.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                searchMode === "youtube"
                  ? "bg-[#FF007A] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <Youtube className="w-3 h-3" />
              YouTube Stream
            </button>
          </div>

          {/* Primary Query Input Deck */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/30 w-4 h-4" />
              <input
                type="text"
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-9 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF007A]/30 transition-all font-sans"
                placeholder={
                  searchMode === "database"
                    ? "Search from local database..."
                    : "Search directly from YouTube..."
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search query"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/30 hover:text-white p-0.5 hover:bg-white/5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 rounded-xl px-2.5 shrink-0">
              <span className="text-[8px] uppercase font-sans font-bold text-white/30 tracking-wider">Limit:</span>
              <input
                type="number"
                min="1"
                max="100"
                className="w-7 bg-transparent text-xs text-white text-center font-sans focus:outline-none border-none p-0 focus:ring-0"
                value={searchLimit}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1));
                  setSearchLimit(val);
                }}
              />
            </div>
            <button
              type="submit"
              className="bg-white/5 hover:bg-white/10 border border-white/5 text-white px-4 rounded-xl text-xs font-sans font-bold active:scale-95 transition-transform cursor-pointer"
            >
              Go
            </button>
          </form>

          {/* Did You Mean Spelling Suggestion */}
          {didYouMean && (
            <div className="-mt-4 px-1 text-[10px] font-sans text-white/50 flex items-center gap-1">
              <span className="italic">Did you mean:</span>
              <button
                type="button"
                onClick={() => {
                  setQuery(didYouMean);
                  handleSearchSubmit(undefined, didYouMean);
                }}
                className="text-[#FF007A] hover:text-[#FF007A]/80 font-bold hover:underline transition-colors focus:outline-none cursor-pointer"
              >
                {didYouMean}
              </button>
            </div>
          )}

          {/* Browse Mood selectors */}
          {!searched && (
            <div className="space-y-2">
              <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-white/40">Browse by Mood</div>
              <div className="flex flex-wrap gap-1.5">
                {["Melancholic", "Ethereal", "Late-night", "Warm Cosmic", "Deep Focus"].map(mood => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => selectMood(mood)}
                    className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-sans text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading state bar */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="w-6 h-6 border border-[#FF007A]/30 border-t-[#FF007A] rounded-full animate-spin"></div>
              <p className="font-sans text-[10px] text-white/30">Querying metadata engine...</p>
            </div>
          )}

          {/* Query Results Desk */}
          {searched && !loading && (
            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-serif text-sm font-bold text-white/90">Search Results</h3>
                <span className="font-sans text-[9px] text-white/40 font-semibold uppercase">{results.length} tracks</span>
              </div>

              {results.length === 0 ? (
                <div className="glass-panel p-8 text-center rounded-xl border border-white/5 font-sans">
                  <span className="block text-xl mb-1">🔍</span>
                  <p className="text-[10px] text-white/40">No matched tracks. Switch search modes above to search online.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {results.map((song) => (
                    <div
                      key={song.id}
                      onClick={() => onPlaySong(song)}
                      className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5 group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/5 flex-shrink-0 bg-white/5">
                          <img className="w-full h-full object-cover" alt={song.title} src={song.coverUrl} />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-4 h-4 text-[#FF007A] fill-current" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans text-xs font-bold text-white truncate leading-snug group-hover:text-[#FF007A] transition-colors">
                            {song.title}
                          </div>
                          <p className="font-sans text-[9px] text-white/40 truncate">
                            {song.artist} • <span className="italic text-[8px]">{song.album}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setShowPlaylistMenuId(showPlaylistMenuId === song.id ? null : song.id)}
                          className="p-1.5 text-white/30 hover:text-[#FF007A] transition-colors rounded-full hover:bg-white/5"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>

                        {showPlaylistMenuId === song.id && (
                          <div className="absolute right-12 mt-8 bg-[#0f0b0d] border border-white/10 p-2 rounded-lg shadow-2xl z-50 w-36 space-y-1">
                            <p className="text-[8px] font-sans font-bold text-white/30 uppercase tracking-widest p-1 border-b border-white/5">Add to:</p>
                            {playlists.length === 0 ? (
                              <p className="text-[8px] italic text-white/30 p-1">No playlists.</p>
                            ) : (
                              playlists.map((pl) => (
                                <button
                                  key={pl.id}
                                  type="button"
                                  onClick={() => handlePlaylistAdd(song, pl.id)}
                                  className="w-full text-left p-1 hover:bg-white/5 text-[9px] text-white/60 hover:text-white rounded transition-colors truncate cursor-pointer"
                                >
                                  {pl.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}

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
        </div>

        {/* Trending & Categories Right Column */}
        <div className="space-y-6 w-full">
          {/* Trending Now Section */}
          {!searched && !loading && (
            <section className="space-y-3">
              <div className="flex justify-between items-baseline">
                <h2 className="font-serif text-sm font-bold text-white/90">Trending Now</h2>
                <button 
                  onClick={() => selectCategory("Electronic")}
                  className="font-sans text-[8px] text-[#FF007A] uppercase font-bold tracking-wider hover:underline cursor-pointer"
                >
                  See All
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Big Vinyl Card */}
                <div 
                  onClick={() => onPlaySong(trendingSong1)}
                  className="h-32 relative rounded-2xl overflow-hidden group border border-white/5 cursor-pointer hover:border-white/10 transition-all text-left"
                >
                  <img
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={trendingSong1.title}
                    src={trendingSong1.coverUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080507] via-transparent to-transparent opacity-90"></div>
                  <div className="absolute bottom-0 p-3 text-left w-full">
                    <span className="inline-block px-1.5 py-0.5 bg-[#FF007A] text-white font-sans text-[7px] font-bold rounded-full mb-1 tracking-widest uppercase">
                      FEATURED
                    </span>
                    <h3 className="font-serif text-xs font-bold text-white mb-0.5 truncate max-w-xs">
                      {trendingSong1.title}
                    </h3>
                    <p className="text-white/60 font-sans text-[9px] truncate">
                      By {trendingSong1.artist}
                    </p>
                  </div>
                </div>

                {/* Small Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => onPlaySong(trendingSong2)}
                    className="glass-panel rounded-xl flex items-center p-2.5 gap-2.5 hover:bg-white/5 transition-colors cursor-pointer group text-left"
                  >
                    <img
                      className="w-10 h-10 rounded-lg overflow-hidden border border-white/5 flex-shrink-0 object-cover"
                      alt={trendingSong2.title}
                      src={trendingSong2.coverUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-[10px] font-bold text-white truncate leading-snug">{trendingSong2.title}</div>
                      <p className="font-sans text-[8px] text-white/40 truncate">{trendingSong2.artist}</p>
                    </div>
                  </div>

                  <div 
                    onClick={() => onPlaySong(trendingSong3)}
                    className="glass-panel rounded-xl flex items-center p-2.5 gap-2.5 hover:bg-white/5 transition-colors cursor-pointer group text-left"
                  >
                    <img
                      className="w-10 h-10 rounded-lg overflow-hidden border border-white/5 flex-shrink-0 object-cover"
                      alt={trendingSong3.title}
                      src={trendingSong3.coverUrl}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-[10px] font-bold text-white truncate leading-snug">{trendingSong3.title}</div>
                      <p className="font-sans text-[8px] text-white/40 truncate">{trendingSong3.artist}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Genre Grid */}
          {!searched && !loading && (
            <section className="space-y-3">
              <h2 className="font-serif text-sm font-bold text-white/90">Browse Categories</h2>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <div
                    key={cat.name}
                    onClick={() => selectCategory(cat.name)}
                    className={`h-16 glass-panel rounded-xl relative overflow-hidden group cursor-pointer border border-white/5 hover:border-[#FF007A]/30 transition-all bg-gradient-to-br ${cat.colorClass} to-transparent flex items-center justify-center`}
                  >
                    <span className="font-sans text-[10px] font-bold text-white/80">
                      {cat.name}
                    </span>
                    <Radio className="absolute -bottom-1 -right-1 text-white/5 w-10 h-10 group-hover:rotate-12 transition-transform duration-500" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recent Searches */}
          {!searched && !loading && recentSearches.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-sans text-[8px] text-white/30 uppercase tracking-widest font-semibold">
                Recent Searches
              </h2>
              <div className="space-y-1">
                {recentSearches.map((term, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      setQuery(term);
                      handleSearchSubmit(undefined, term);
                    }}
                    className="flex items-center justify-between text-[10px] text-white/50 hover:text-[#FF007A] transition-colors cursor-pointer py-1 border-b border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-3 h-3 opacity-30" />
                      <span>{term}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="text-white/30 hover:text-white p-0.5 cursor-pointer"
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

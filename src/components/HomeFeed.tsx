import { useState, useEffect } from "react";
import { Play, Pause, Heart, Sparkles, Volume2, History, TrendingUp, Clock } from "lucide-react";
import { Song, ListeningHabit } from "../types";

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

interface HomeFeedProps {
  songs: Song[];
  onPlaySong: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  setTab: (tab: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  listeningHabits: ListeningHabit[];
}

export function HomeFeed({
  songs,
  onPlaySong,
  currentSong,
  isPlaying,
  onTogglePlay,
  setTab,
  favorites,
  onToggleFavorite,
  listeningHabits
}: HomeFeedProps) {
  
  const [recommendedSongs, setRecommendedSongs] = useState<Song[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>("All");

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  };

  // Build "Recently Played" from listening habits — sorted by play count (most played first)
  const recentlyPlayed: Song[] = listeningHabits
    .sort((a, b) => b.count - a.count)
    .map(habit => songs.find(s => s.id === habit.songId))
    .filter(Boolean) as Song[];

  // Build taste-based recommendations: songs NOT in recently played, matching genres/moods of top played
  useEffect(() => {
    const topSongs = recentlyPlayed.slice(0, 5);
    const userGenres = new Set<string>();
    const userMoods = new Set<string>();

    topSongs.forEach(song => {
      if (song.genre) song.genre.split(/[\/,]/).forEach(g => userGenres.add(g.trim().toLowerCase()));
      if (song.mood) song.mood.split(",").forEach(m => userMoods.add(m.trim().toLowerCase()));
    });

    const recentIds = new Set(recentlyPlayed.map(s => s.id));

    // Score all songs not in recently played
    const scored = songs
      .filter(s => !recentIds.has(s.id))
      .map(song => {
        let score = 0;
        if (song.genre) {
          song.genre.split(/[\/,]/).forEach(g => {
            if (userGenres.has(g.trim().toLowerCase())) score += 3;
          });
        }
        if (song.mood) {
          song.mood.split(",").forEach(m => {
            if (userMoods.has(m.trim().toLowerCase())) score += 2;
          });
        }
        if (favorites.includes(song.id)) score += 2;
        return { song, score };
      })
      .sort((a, b) => b.score - a.score);

    const recs = scored.length > 0 ? scored.map(s => s.song) : songs.filter(s => !recentIds.has(s.id));
    setRecommendedSongs(recs.slice(0, 8));
  }, [songs, listeningHabits, favorites]);

  // Bento curation cards (real audio tracks)
  const bentoSong1 = songs.length > 0 ? songs[0] : REAL_CURATED_SONGS[0];
  const bentoSong2 = songs.length > 1 ? songs[1] : REAL_CURATED_SONGS[1];
  const bentoSong3 = songs.length > 2 ? songs[2] : REAL_CURATED_SONGS[2];

  const handleFeaturedPlay = () => {
    if (bentoSong1) {
      onPlaySong(bentoSong1);
    }
  };

  const filteredRecommendations = selectedMood === "All" 
    ? recommendedSongs 
    : recommendedSongs.filter(s => s.mood?.toLowerCase().includes(selectedMood.toLowerCase()) || s.genre?.toLowerCase().includes(selectedMood.toLowerCase()));

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Feed Left Column */}
        <div className="lg:col-span-2 space-y-8 w-full">
          {/* Home Greeting Header */}
          <div className="home-header">
            <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#FF007A]/90 mb-1">
              {getGreeting()}
            </div>
            <h1 className="font-serif text-3xl font-bold leading-tight mb-2 text-white/90">
              What moves<br />you <em className="italic font-normal">tonight</em>?
            </h1>
            <p className="text-[10px] text-white/40 tracking-wider">Your sound. Your silence. Your cathedral.</p>
          </div>

          {/* Hero Section: Featured Curator */}
          <section className="relative rounded-2xl overflow-hidden glass-panel silver-edge group select-none">
            <div className="absolute inset-0 z-0">
              <img
                className="w-full h-full object-cover opacity-30 scale-105 group-hover:scale-100 transition-transform duration-1000"
                alt="The Melo Midnight Sessions Theme"
                src="https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=600&auto=format&fit=crop"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080507] via-[#0f0b0d]/50 to-transparent"></div>
            </div>
            
            <div className="relative z-10 p-6 max-w-xl text-left">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF007A] animate-pulse"></span>
                <p className="font-sans text-[8px] font-bold uppercase tracking-[0.2em] text-[#FF007A]">
                  LATEST COLLECTIVE
                </p>
              </div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-2 leading-tight tracking-wide">
                THE MIDNIGHT VAULT
              </h2>
              <p className="font-sans text-[11px] text-white/60 mb-5 leading-relaxed">
                Curated high-fidelity acoustics for the discerning listener. Experience sound as it was meant to be—raw, unfiltered, and deeply exclusive.
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleFeaturedPlay}
                  className="bg-[#FF007A] hover:bg-[#FF007A]/90 text-white px-5 py-2 rounded-full font-sans text-[9px] font-bold uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-[#FF007A]/10 cursor-pointer"
                >
                  PLAY NOW
                </button>
                <span className="text-[10px] font-sans text-white/40 truncate max-w-[180px]">
                  {bentoSong1.title} — {bentoSong1.artist}
                </span>
              </div>
            </div>
          </section>

          {/* Mood Select Row */}
          <div>
            <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-white/40 mb-3">
              Select Mood
            </div>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1.5 snap-x">
              {["All", "Melancholic", "Late-night", "Ethereal", "Deep focus", "Euphoric"].map((mood) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`snap-start px-4 py-1.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wider transition-all cursor-pointer border ${
                    selectedMood === mood
                      ? "bg-[#FF007A] border-[#FF007A] text-white"
                      : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* Recently Played Section */}
          {recentlyPlayed.length > 0 && (
            <section className="overflow-visible">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FF007A]" />
                  <h3 className="font-serif text-md font-bold text-white/90">
                    Recently Played
                  </h3>
                </div>
                <span className="font-sans text-[9px] text-white/30 uppercase tracking-widest">
                  {recentlyPlayed.length} tracks
                </span>
              </div>

              {/* Horizontal Slider */}
              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 snap-x">
                {recentlyPlayed.map((song) => {
                  const habit = listeningHabits.find(h => h.songId === song.id);
                  return (
                    <div 
                      key={song.id}
                      onClick={() => onPlaySong(song)}
                      className="snap-start flex-none w-32 group cursor-pointer"
                    >
                      <div className="aspect-square rounded-xl mb-2 overflow-hidden relative border border-white/5 bg-white/5">
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          alt={song.title}
                          src={song.coverUrl}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-[#FF007A] fill-current" />
                        </div>
                        {/* Play count badge */}
                        {habit && (
                          <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/10">
                            <span className="font-mono text-[8px] text-[#FF007A] font-bold">{habit.count}×</span>
                          </div>
                        )}
                      </div>
                      <div className="font-serif text-xs font-bold text-white mb-0.5 truncate group-hover:text-[#FF007A] transition-colors">
                        {song.title}
                      </div>
                      <p className="font-sans text-[9px] text-white/40 truncate">
                        {song.artist}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* For You — Taste-based Recommendations */}
          {filteredRecommendations.length > 0 && (
            <section className="overflow-visible">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FF007A]" />
                  <h3 className="font-serif text-md font-bold text-white/90">
                    Made For You
                  </h3>
                </div>
                <span className="font-sans text-[9px] text-white/30 uppercase tracking-widest">
                  Tailored for you
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-3 snap-x">
                {filteredRecommendations.map((song) => (
                  <div 
                    key={song.id}
                    onClick={() => onPlaySong(song)}
                    className="snap-start flex-none w-32 group cursor-pointer"
                  >
                    <div className="aspect-square rounded-xl mb-2 overflow-hidden relative border border-white/5 bg-white/5">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        alt={song.title}
                        src={song.coverUrl}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 text-[#FF007A] fill-current" />
                      </div>
                      {/* Genre tag */}
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/5">
                        <span className="font-sans text-[7px] text-white/70 uppercase tracking-wider font-bold">{song.genre}</span>
                      </div>
                    </div>
                    <div className="font-serif text-xs font-bold text-white mb-0.5 truncate group-hover:text-[#FF007A] transition-colors">
                      {song.title}
                    </div>
                    <p className="font-sans text-[9px] text-white/40 truncate">
                      {song.artist}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar/Right Column */}
        <div className="space-y-8 w-full">
          {/* Bento Grid: Curation Alpha */}
          <section className="space-y-4">
            <div>
              <h3 className="font-serif text-md font-bold text-white/90">
                Curation Alpha
              </h3>
              <p className="font-sans text-[8px] uppercase tracking-widest text-white/40 mt-0.5">
                Selected for your profile
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Main Curation Card */}
              <div className="glass-panel rounded-2xl p-4 border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF007A]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center">
                    <Sparkles className="text-[#FF007A] w-5 h-5 animate-pulse" />
                    <span className="bg-white/5 px-2.5 py-0.5 rounded-full text-[8px] font-bold text-white/60 tracking-wider">
                      PREMIUM
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <img
                      className="w-16 h-16 rounded-xl object-cover border border-white/5 flex-shrink-0"
                      alt={bentoSong1.title}
                      src={bentoSong1.coverUrl}
                    />
                    <div className="min-w-0 flex-grow text-left">
                      <span className="text-[#FF007A] font-sans text-[8px] font-bold uppercase tracking-wider block mb-0.5">Featured Track</span>
                      <h4 className="font-serif text-sm font-bold text-white truncate mb-0.5">
                        {bentoSong1.title}
                      </h4>
                      <p className="font-sans text-[10px] text-white/60 line-clamp-2 leading-relaxed">
                        By {bentoSong1.artist}. Experience lossless high-fidelity playback streaming.
                      </p>
                    </div>
                  </div>

                  {/* Micro Player Panel */}
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2 border border-white/5">
                    <button 
                      onClick={() => onPlaySong(bentoSong1)}
                      aria-label={currentSong?.id === bentoSong1.id && isPlaying ? "Pause featured track" : "Play featured track"}
                      className="p-1.5 rounded-full hover:bg-white/10 text-[#FF007A] active:scale-90 transition-transform cursor-pointer"
                    >
                      {currentSong?.id === bentoSong1.id && isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>
                    <div className="flex-1 h-[2px] bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#FF007A] transition-all duration-500"
                        style={{ width: currentSong?.id === bentoSong1.id ? "42%" : "8%" }}
                      ></div>
                    </div>
                    <span className="font-mono text-[8px] text-white/40">
                      {bentoSong1.duration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => onPlaySong(bentoSong2)}
                  className="glass-panel rounded-2xl p-4 border border-white/5 group cursor-pointer hover:border-white/10 transition-all text-left"
                >
                  <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center mb-3 text-[#FF007A] group-hover:bg-[#FF007A]/10 transition-all duration-300">
                    {currentSong?.id === bentoSong2.id && isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-white/30 font-sans text-[7px] font-bold uppercase tracking-wider block mb-0.5">Curation II</span>
                  <div className="font-serif text-xs font-bold text-white mb-1 truncate">{bentoSong2.title}</div>
                  <p className="font-sans text-[9px] text-white/50 leading-normal line-clamp-2">
                    By {bentoSong2.artist}. Selected for high-fidelity profile.
                  </p>
                </div>

                <div 
                  onClick={() => onPlaySong(bentoSong3)}
                  className="glass-panel rounded-2xl p-4 border border-white/5 group cursor-pointer hover:border-white/10 transition-all text-left"
                >
                  <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center mb-3 text-[#FF007A] group-hover:bg-[#FF007A]/10 transition-all duration-300">
                    {currentSong?.id === bentoSong3.id && isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-white/30 font-sans text-[7px] font-bold uppercase tracking-wider block mb-0.5">Curation III</span>
                  <div className="font-serif text-xs font-bold text-white mb-1 truncate">{bentoSong3.title}</div>
                  <p className="font-sans text-[9px] text-white/50 leading-normal line-clamp-2">
                    By {bentoSong3.artist}. Exclusive studio remastered audio.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Favorites Quick List */}
          {songs.filter(s => favorites.includes(s.id)).length > 0 && (
            <section className="pb-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-[#FF007A] fill-current" />
                <h3 className="font-serif text-md font-bold text-white/90">
                  Your Favorites
                </h3>
              </div>
              <div className="divide-y divide-white/5 space-y-1">
                {songs.filter(s => favorites.includes(s.id)).slice(0, 5).map((song, idx) => (
                  <div
                    key={song.id}
                    onClick={() => onPlaySong(song)}
                    className="flex items-center gap-3 py-2 px-2.5 rounded-xl hover:bg-white/5 transition-all group cursor-pointer text-left"
                  >
                    <span className="font-mono text-[10px] text-white/20 w-4 group-hover:text-[#FF007A] transition-colors">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <img
                      className="w-9 h-9 rounded-lg border border-white/5 object-cover"
                      alt={song.title}
                      src={song.coverUrl}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-xs font-bold text-white truncate group-hover:text-[#FF007A] transition-colors">
                        {song.title}
                      </div>
                      <p className="font-sans text-[9px] text-white/40 truncate">
                        {song.artist}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(song.id);
                        }}
                        aria-label={favorites.includes(song.id) ? "Remove from favorites" : "Add to favorites"}
                        className="p-1 text-[#FF007A]"
                      >
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <span className="font-mono text-[9px] text-white/30">
                        {song.duration}
                      </span>
                    </div>
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

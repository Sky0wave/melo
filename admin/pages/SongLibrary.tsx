import React, { useState, useEffect } from "react";
import { Search, Trash2, Music, ExternalLink, RefreshCw } from "lucide-react";

interface Song {
  id: number;
  video_id: string;
  title: string;
  artist: string;
  duration: string;
  duration_seconds: number;
  cover_url: string;
  language: string;
}

interface SongLibraryProps {
  adminPassword: string;
}

export function SongLibrary({ adminPassword }: SongLibraryProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchSongs = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        query: searchTerm,
        limit: String(limit),
        offset: String(page * limit)
      });
      const res = await fetch(`/api/admin/songs?${queryParams.toString()}`, {
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchSongs();
  };

  const handleDeleteSong = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this cached song? Users will still be able to search for it, which might re-cache it, but this removes it from the local cache database.")) return;
    
    try {
      const res = await fetch(`/api/admin/songs/${videoId}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        fetchSongs();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete song.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting song.");
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            Local Metadata Cache
          </h2>
          <p className="font-sans text-xs text-white/40">
            View cached songs fetched from YouTube and verify clean metadata details.
          </p>
        </div>
        
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-xs w-full flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search cache library..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#c5a880] transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#c5a880] text-white rounded-xl font-sans text-xs font-bold uppercase tracking-wider transition-all hover:bg-[#c5a880]/90 cursor-pointer"
          >
            Find
          </button>
        </form>
      </div>

      {/* Songs table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                <th className="p-4">Cover</th>
                <th className="p-4">Title</th>
                <th className="p-4">Artist</th>
                <th className="p-4">Video ID</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Language</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] font-sans">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={7} className="p-4">
                      <div className="h-10 w-full skeleton" />
                    </td>
                  </tr>
                ))
              ) : songs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/30 italic">
                    No songs stored in local cache database.
                  </td>
                </tr>
              ) : (
                songs.map((song) => (
                  <tr key={song.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Cover */}
                    <td className="p-4">
                      {song.cover_url ? (
                        <img
                          src={song.cover_url}
                          alt=""
                          className="w-10 h-10 rounded object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-white/20">
                          <Music className="w-4 h-4" />
                        </div>
                      )}
                    </td>

                    {/* Title */}
                    <td className="p-4 font-bold text-white max-w-[200px] truncate">
                      {song.title}
                    </td>

                    {/* Artist */}
                    <td className="p-4 text-white/70 max-w-[150px] truncate">
                      {song.artist}
                    </td>

                    {/* Video ID */}
                    <td className="p-4 font-mono text-[9px] text-white/40">
                      <span className="flex items-center gap-1.5">
                        {song.video_id}
                        <a
                          href={`https://youtube.com/watch?v=${song.video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#c5a880]/60 hover:text-[#c5a880] transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="p-4 font-mono text-white/70">{song.duration}</td>

                    {/* Language */}
                    <td className="p-4">
                      <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold uppercase tracking-wider text-white/60">
                        {song.language}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteSong(song.video_id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              Page {page + 1} of {totalPages} ({totalCount} items)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

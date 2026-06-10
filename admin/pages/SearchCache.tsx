import React, { useState, useEffect } from "react";
import { Search, Trash2, Database, AlertCircle } from "lucide-react";

interface CacheItem {
  id: number;
  query: string;
  video_ids: string[];
  created_at: string;
}

interface SearchCacheProps {
  adminPassword: string;
}

export function SearchCache({ adminPassword }: SearchCacheProps) {
  const [cache, setCache] = useState<CacheItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchCache = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/search-cache", {
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCache(data.cache || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCache();
  }, []);

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this cached query?")) return;
    try {
      const res = await fetch(`/api/admin/search-cache/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        fetchCache();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete item.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to purge the entire query search cache? This will cause the next searches to hit YouTube API instead of serving cached video listings instantly.")) return;
    try {
      const res = await fetch("/api/admin/search-cache", {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        fetchCache();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to clear search cache.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCache = cache.filter((item) =>
    item.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            Smart Search Query Cache
          </h2>
          <p className="font-sans text-xs text-white/40">
            Audit mappings of typed user search terms to Youtube Video ID results.
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            disabled={cache.length === 0}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-sans text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            Purge Search Cache
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="p-4 bg-[#7B2FFF]/10 border border-[#7B2FFF]/20 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-purple-300">
        <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block">Query Mapping Cache Info</span>
          This cache maps queries directly to arrays of YouTube video IDs. Searching a query inside this list loads songs instantly from the Neon DB without fetching the YouTube v3 API, resolving quota constraints.
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-xs w-full">
        <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Filter query cache..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#FF007A] transition-all font-sans"
        />
      </div>

      {/* Cache table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                <th className="p-4">Search Query Keyword</th>
                <th className="p-4">Cached Video IDs</th>
                <th className="p-4">Mapped Count</th>
                <th className="p-4">Cached Time</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] font-sans">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={5} className="p-4">
                      <div className="h-8 w-full skeleton" />
                    </td>
                  </tr>
                ))
              ) : filteredCache.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/30 italic">
                    No query caches recorded yet.
                  </td>
                </tr>
              ) : (
                filteredCache.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Query */}
                    <td className="p-4 font-bold text-white font-mono text-xs">
                      "{item.query}"
                    </td>

                    {/* Mappings */}
                    <td className="p-4 font-mono text-[9px] text-white/50 max-w-[300px] truncate" title={item.video_ids.join(", ")}>
                      {item.video_ids.join(", ")}
                    </td>

                    {/* Count */}
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-[#FF007A]/10 text-[#FF007A] border border-[#FF007A]/20 text-[9px] font-bold">
                        {item.video_ids.length} videos
                      </span>
                    </td>

                    {/* Cached Time */}
                    <td className="p-4 text-white/40">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteItem(item.id)}
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
      </div>
    </div>
  );
}

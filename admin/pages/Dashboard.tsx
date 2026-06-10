import React from "react";
import { Users, Music, Database, Radio, Play, Pause, AlertTriangle } from "lucide-react";

interface RegisteredUser {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  created_at: string;
  last_login: string;
}

interface ActiveUser {
  username: string;
  currentSongId: string | null;
  isPlaying: boolean;
  progress: number;
  songTitle?: string;
  songArtist?: string;
  songCoverUrl?: string;
  lastUpdated: number;
}

interface DashboardProps {
  totalRegisteredUsers: number;
  totalSongs: number;
  activeUsersCount: number;
  activeUsers: ActiveUser[];
  registeredUsers: RegisteredUser[];
  isLoading: boolean;
}

export function Dashboard({
  totalRegisteredUsers,
  totalSongs,
  activeUsersCount,
  activeUsers,
  registeredUsers,
  isLoading
}: DashboardProps) {
  
  // Format active listening progress
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${String(s).padStart(2, "0")}`;
  };

  const recentUsers = [...registeredUsers].slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      {/* Page Title Header & Launch App Button */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 border-b border-white/5 pb-6">
        <div>
          <h2 className="font-serif text-4xl font-light text-[#c5a880] tracking-wide">
            Dashboard Overview
          </h2>
          <p className="font-sans text-[9px] uppercase tracking-[0.25em] text-white/30 mt-1.5">
            REAL-TIME METRICS, USER ACTIVITY & CACHE HEALTH
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 px-5 py-3 border border-[#c5a880]/30 hover:border-[#c5a880] bg-white/2 hover:bg-[#c5a880]/5 rounded-xl font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-[#c5a880] transition-all duration-200"
          >
            LAUNCH MELO APP
          </a>
          <button className="p-3 border border-white/5 bg-white/2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all cursor-pointer">
            <span className="text-xs">•••</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-card p-6 flex flex-col justify-between items-start min-h-[130px] border-white/5 bg-[#0a090e]/30">
          <span className="font-sans text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold">Registered Users</span>
          <span className="font-serif text-5xl font-light text-[#c5a880] mt-3">
            {isLoading ? <div className="h-10 w-12 skeleton" /> : totalRegisteredUsers}
          </span>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 flex flex-col justify-between items-start min-h-[130px] border-white/5 bg-[#0a090e]/30">
          <span className="font-sans text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold">Sync Nodes Online</span>
          <span className="font-serif text-5xl font-light text-[#c5a880] mt-3 flex items-baseline gap-1.5">
            {isLoading ? <div className="h-10 w-12 skeleton" /> : activeUsersCount}
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880] animate-ping inline-block"></span>
          </span>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-6 flex flex-col justify-between items-start min-h-[130px] border-white/5 bg-[#0a090e]/30">
          <span className="font-sans text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold">Cached Songs</span>
          <span className="font-serif text-5xl font-light text-[#c5a880] mt-3">
            {isLoading ? <div className="h-10 w-20 skeleton" /> : totalSongs}
          </span>
        </div>

        {/* Card 4 */}
        <div className="glass-card p-6 flex flex-col justify-between items-start min-h-[130px] border-white/5 bg-[#0a090e]/30">
          <span className="font-sans text-[8px] text-white/30 uppercase tracking-[0.2em] font-bold">Neon Postgresql</span>
          <span className="font-serif text-[18px] font-light text-[#c5a880] tracking-[0.1em] uppercase mt-5">
            CONNECTED
          </span>
        </div>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Listeners Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-[9px] font-bold text-white uppercase tracking-[0.2em]">
              LIVE PLAYBACKS
            </h3>
            <span className="flex items-center gap-1.5 text-[#c5a880] text-[8px] font-bold bg-[#c5a880]/5 px-2 py-0.5 border border-[#c5a880]/15 rounded-full uppercase tracking-wider">
              REAL-TIME SSE
            </span>
          </div>

          {activeUsers.length === 0 ? (
            <div className="glass-card p-8 text-center text-white/30 italic text-xs bg-[#050406]/40 border-white/5">
              No active playbacks currently broadcasting to the server.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeUsers.map((active) => (
                <div key={active.username} className="glass-card p-4 flex gap-4 items-center justify-between border-white/[0.04] bg-[#050406]/40 hover:bg-[#050406]/60 transition-colors">
                  <div className="flex gap-3 items-center min-w-0 flex-1">
                    {/* Play Button Indicator (Square border with play triangle) */}
                    <div className="w-8 h-8 rounded-lg border border-white/10 hover:border-[#c5a880] flex items-center justify-center shrink-0 text-white/40 hover:text-white transition-colors">
                      {active.isPlaying ? (
                        <span className="text-[10px] text-[#c5a880]">❚❚</span>
                      ) : (
                        <span className="text-[10px] text-white/40">▶</span>
                      )}
                    </div>

                    <div className="min-w-0 text-left">
                      <p className="font-bold text-white text-[11px] truncate">
                        {active.username}
                      </p>
                      {active.currentSongId ? (
                        <>
                          <p className="font-serif text-[10px] text-[#c5a880] truncate mt-0.5 italic">
                            {active.songTitle}
                          </p>
                          <p className="font-sans text-[8px] text-white/40 truncate tracking-wide">
                            BY {active.songArtist?.toUpperCase()}
                          </p>
                        </>
                      ) : (
                        <p className="font-sans text-[9px] text-white/30 italic mt-0.5">
                          IDLE
                        </p>
                      )}
                    </div>
                  </div>

                  {active.currentSongId && (
                    <div className="text-right shrink-0">
                      <span className="font-mono text-[9px] text-white/40 block">
                        {formatTime(active.progress)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar panels */}
        <div className="space-y-6">
          {/* New Signups */}
          <div className="space-y-4">
            <h3 className="font-sans text-[9px] font-bold text-white uppercase tracking-[0.2em]">
              RECENT USER LOGINS
            </h3>
            <div className="glass-card divide-y divide-white/5 overflow-hidden bg-[#050406]/40 border-white/5">
              {recentUsers.length === 0 ? (
                <div className="p-6 text-center text-white/30 italic text-xs">
                  No log records found.
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-[#c5a880]/30 flex items-center justify-center text-[10px] font-bold text-[#c5a880] shrink-0 font-sans uppercase">
                        {user.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-white truncate text-[11px]">{user.name}</p>
                        <p className="text-[9px] text-white/40 truncate font-mono">{user.email}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

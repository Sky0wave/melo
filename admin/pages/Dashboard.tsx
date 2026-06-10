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
    <div className="space-y-6 animate-fade-in text-left">
      {/* Page Title Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
          Dashboard Overview
        </h2>
        <p className="font-sans text-xs text-white/40">
          Real-time metrics, user activities and cache health.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Users */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block">Registered Users</span>
            <span className="font-serif text-2xl font-bold text-white block mt-0.5">
              {isLoading ? (
                <div className="h-7 w-16 skeleton" />
              ) : (
                totalRegisteredUsers
              )}
            </span>
          </div>
        </div>

        {/* Live Audio Sync Nodes */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 relative">
            <div className="relative">
              <Radio className="w-5 h-5 text-emerald-400" />
              <div className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
            </div>
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block">Sync Nodes Online</span>
            <span className="font-serif text-2xl font-bold text-emerald-400 block mt-0.5">
              {isLoading ? (
                <div className="h-7 w-12 skeleton" />
              ) : (
                activeUsersCount
              )}
            </span>
          </div>
        </div>

        {/* Cached Songs */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <Music className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block">Cached Songs</span>
            <span className="font-serif text-2xl font-bold text-purple-400 block mt-0.5">
              {isLoading ? (
                <div className="h-7 w-16 skeleton" />
              ) : (
                totalSongs
              )}
            </span>
          </div>
        </div>

        {/* Database Health Status */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block">Neon PostgreSQL</span>
            <span className="font-serif text-2xl font-bold text-indigo-400 block mt-0.5">
              CONNECTED
            </span>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Listeners Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
              Live Playbacks Broadcast
            </h3>
            <span className="flex items-center gap-1.5 text-emerald-400 text-[9px] font-bold bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              REAL-TIME SSE
            </span>
          </div>

          {activeUsers.length === 0 ? (
            <div className="glass-card p-8 text-center text-white/30 italic text-xs">
              No active playbacks currently broadcasting to the server.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeUsers.map((active) => (
                <div key={active.username} className="glass-card p-4 flex gap-4 items-center justify-between border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <div className="flex gap-3 items-center min-w-0 flex-1">
                    {active.songCoverUrl ? (
                      <div className="relative shrink-0">
                        <img
                          src={active.songCoverUrl}
                          alt=""
                          className="w-11 h-11 rounded-lg object-cover border border-white/10"
                        />
                        <div className="absolute -bottom-1 -right-1">
                          {active.isPlaying ? (
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-[#0f0b0d] flex items-center justify-center">
                              <Play className="w-2 h-2 text-white fill-current" />
                            </span>
                          ) : (
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border border-[#0f0b0d] flex items-center justify-center">
                              <Pause className="w-2 h-2 text-white fill-current" />
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0 text-left">
                      <p className="font-bold text-white text-xs truncate">
                        {active.username}
                      </p>
                      {active.currentSongId ? (
                        <>
                          <p className="font-serif text-[10px] text-[#FF007A] truncate mt-0.5">
                            {active.songTitle}
                          </p>
                          <p className="font-sans text-[9px] text-white/40 truncate">
                            by {active.songArtist}
                          </p>
                        </>
                      ) : (
                        <p className="font-sans text-[9px] text-white/30 italic mt-0.5">
                          Idle - Not listening
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
            <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
              Recent User Logins
            </h3>
            <div className="glass-card divide-y divide-white/5 overflow-hidden">
              {recentUsers.length === 0 ? (
                <div className="p-6 text-center text-white/30 italic text-xs">
                  No Google users signed up yet.
                </div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-7 h-7 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{user.name}</p>
                        <p className="text-[9px] text-white/40 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide shrink-0 ${
                      user.role === "admin"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-white/5 text-white/60 border border-white/10"
                    }`}>
                      {user.role}
                    </span>
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

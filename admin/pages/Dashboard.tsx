import React from "react";
import { Users, Music, Database, Radio, Play, Pause, AlertTriangle, Shield, User, Disc, Activity } from "lucide-react";

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

interface UserListenRecent {
  username: string;
  song_title: string;
  artist: string;
  timestamp: string;
}

interface DashboardProps {
  totalRegisteredUsers: number;
  totalSongs: number;
  activeUsersCount: number;
  activeUsers: ActiveUser[];
  registeredUsers: RegisteredUser[];
  userListensRecent: UserListenRecent[];
  isLoading: boolean;
}

export function Dashboard({
  totalRegisteredUsers,
  totalSongs,
  activeUsersCount,
  activeUsers,
  registeredUsers,
  userListensRecent,
  isLoading
}: DashboardProps) {
  
  // Format active listening progress
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${String(s).padStart(2, "0")}`;
  };

  const recentUsers = [...registeredUsers].slice(0, 4);

  return (
    <div className="flex flex-col gap-16 animate-fade-in text-left py-4">
      {/* Page Title Header & Launch App Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b border-white/5 pb-10">
        <div>
          <h2 className="font-serif text-[56px] font-light text-[#c5a880] tracking-wide leading-tight">
            Dashboard Overview
          </h2>
          <p className="font-sans text-[11px] uppercase tracking-[0.25em] text-white/30 mt-3">
            Real-Time Metrics, User Activity & Cache Health
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <a
            href="/"
            className="btn-gold flex items-center justify-center gap-3 px-8 py-4 rounded-[18px] font-sans text-[11px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer"
          >
            Launch Melo App
          </a>
          <button className="btn-secondary p-4 rounded-[18px] text-white/40 hover:text-white transition-all cursor-pointer flex items-center justify-center">
            <span className="text-sm font-bold tracking-widest px-1">•••</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="space-y-4">
        <h3 className="font-sans text-[14px] font-bold text-[#8e785b] uppercase tracking-[0.25em]">
          Core Platform Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Card 1: Registered Users */}
          <div className="premium-card flex flex-col justify-between items-start min-h-[210px] w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-sans text-[11px] text-white/40 uppercase tracking-[0.2em] font-semibold">Registered Users</span>
              <Users className="w-4 h-4 text-[#c5a880]/40" />
            </div>
            <span className="font-serif text-[72px] font-light text-[#c5a880] leading-none mt-auto">
              {isLoading ? <div className="h-16 w-24 skeleton" /> : totalRegisteredUsers}
            </span>
          </div>

          {/* Card 2: Active Sync Nodes */}
          <div className="premium-card flex flex-col justify-between items-start min-h-[210px] w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-sans text-[11px] text-white/40 uppercase tracking-[0.2em] font-semibold">Sync Nodes Online</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c5a880] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c5a880]"></span>
              </span>
            </div>
            <span className="font-serif text-[72px] font-light text-[#c5a880] leading-none mt-auto">
              {isLoading ? <div className="h-16 w-20 skeleton" /> : activeUsersCount}
            </span>
          </div>

          {/* Card 3: Cached Songs */}
          <div className="premium-card flex flex-col justify-between items-start min-h-[210px] w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-sans text-[11px] text-white/40 uppercase tracking-[0.2em] font-semibold">Cached Songs</span>
              <Music className="w-4 h-4 text-[#c5a880]/40" />
            </div>
            <span className="font-serif text-[72px] font-light text-[#c5a880] leading-none mt-auto">
              {isLoading ? <div className="h-16 w-32 skeleton" /> : totalSongs}
            </span>
          </div>

          {/* Card 4: Neon Postgresql */}
          <div className="premium-card flex flex-col justify-between items-start min-h-[210px] w-full">
            <div className="flex items-center justify-between w-full">
              <span className="font-sans text-[11px] text-white/40 uppercase tracking-[0.2em] font-semibold">PostgreSQL Database</span>
              <Database className="w-4 h-4 text-[#c5a880]/40" />
            </div>
            <div className="mt-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full font-mono text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </div>
              <p className="font-serif text-2xl font-light text-[#c5a880] tracking-[0.1em] uppercase mt-4">
                Neon Cloud DB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Playbacks */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="font-sans text-[14px] font-bold text-[#8e785b] uppercase tracking-[0.25em]">
            Live Playbacks
          </h3>
          <span className="flex items-center gap-2 text-[#c5a880] text-[10px] font-bold bg-[#c5a880]/5 px-3.5 py-1.5 border border-[#c5a880]/15 rounded-full uppercase tracking-wider select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880] animate-pulse"></span>
            Real-Time SSE
          </span>
        </div>

        {activeUsers.length === 0 ? (
          <div className="premium-card p-16 text-center text-white/30 italic text-[14px]">
            No active playbacks currently broadcasting to the server.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {activeUsers.map((active) => {
              const isPlaying = active.isPlaying;
              return (
                <div key={active.username} className="premium-card flex flex-col justify-between min-h-[260px] w-full">
                  <div className="flex gap-4 items-start justify-between min-w-0">
                    <div className="min-w-0 text-left">
                      <p className="font-sans font-bold text-white text-[15px] truncate">
                        {active.username}
                      </p>
                      {active.currentSongId ? (
                        <>
                          <p className="font-serif text-[13px] text-[#c5a880] truncate mt-2 italic leading-snug">
                            {active.songTitle}
                          </p>
                          <p className="font-sans text-[10px] text-white/40 truncate tracking-widest uppercase mt-1">
                            {active.songArtist || "Unknown Artist"}
                          </p>
                        </>
                      ) : (
                        <p className="font-sans text-[11px] text-white/30 italic mt-2">
                          Idle / Standing By
                        </p>
                      )}
                    </div>

                    {/* Rotating Vinyl Disk Indicator */}
                    <div className="relative shrink-0">
                      {active.songCoverUrl ? (
                        <img
                          src={active.songCoverUrl}
                          alt=""
                          className={`w-16 h-16 rounded-full object-cover border border-[#c5a880]/30 shadow-md shadow-[#c5a880]/5 shrink-0 ${isPlaying ? "animate-spin-slow" : ""}`}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#1c1a22] to-[#07060a] border border-[#c5a880]/20 flex items-center justify-center shrink-0 shadow-lg relative overflow-hidden ${isPlaying ? "animate-spin-slow" : ""}`}>
                          {/* Vinyl grooves */}
                          <div className="absolute inset-2 rounded-full border border-white/5" />
                          <div className="absolute inset-4 rounded-full border border-white/5" />
                          {/* Center label */}
                          <div className="w-4 h-4 rounded-full bg-[#c5a880] flex items-center justify-center z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#050406]" />
                          </div>
                        </div>
                      )}
                      {/* Play/Pause Overlay Status */}
                      <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#07060a] border border-white/10 flex items-center justify-center shadow-md">
                        {isPlaying ? (
                          <span className="text-[7px] text-[#c5a880] font-bold">❚❚</span>
                        ) : (
                          <span className="text-[7px] text-white/40 font-bold ml-0.5">▶</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {active.currentSongId && (
                    <div className="mt-auto pt-6">
                      {/* Mini Live Progress Bar */}
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-[#c5a880] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, active.progress)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="font-mono text-[9px] text-[#c5a880]/80 uppercase tracking-widest">Live Progress</span>
                        <span className="font-mono text-[10px] text-white/40">
                          {formatTime(active.progress)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Users */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="font-sans text-[14px] font-bold text-[#8e785b] uppercase tracking-[0.25em]">
            Recent Users
          </h3>
        </div>

        {recentUsers.length === 0 ? (
          <div className="premium-card p-16 text-center text-white/30 italic text-[14px]">
            No users registered recently.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {recentUsers.map((user) => (
              <div key={user.id} className="premium-card flex flex-col justify-between min-h-[200px] w-full">
                <div className="flex items-start gap-4">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-14 h-14 rounded-full object-cover border border-[#c5a880]/20 shadow-md shadow-[#c5a880]/5 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#c5a880]/5 border border-[#c5a880]/20 flex items-center justify-center text-md font-bold text-[#c5a880] font-serif shrink-0">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <p className="font-sans font-bold text-white text-[15px] truncate">{user.name}</p>
                    <p className="text-[11px] text-white/40 truncate font-mono mt-1">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    user.role === "admin"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-[#c5a880]/10 text-[#c5a880] border border-[#c5a880]/20"
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-[10px] font-mono text-white/30">
                    Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <h3 className="font-sans text-[14px] font-bold text-[#8e785b] uppercase tracking-[0.25em]">
            Recent Activity
          </h3>
        </div>

        <div className="premium-card w-full overflow-hidden p-6 md:p-8">
          {userListensRecent.length === 0 ? (
            <div className="py-12 text-center text-white/30 italic text-[14px]">
              No recent activity log records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-[#8e785b]">
                    <th className="pb-4 pt-2 px-4">User</th>
                    <th className="pb-4 pt-2 px-4">Song Title</th>
                    <th className="pb-4 pt-2 px-4">Artist</th>
                    <th className="pb-4 pt-2 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[13px] font-sans">
                  {userListensRecent.slice(0, 5).map((log, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 px-4 font-bold text-white">{log.username}</td>
                      <td className="py-4 px-4 text-[#c5a880] font-serif italic text-[14px]">{log.song_title}</td>
                      <td className="py-4 px-4 text-white/50 text-[10px] uppercase tracking-wider">BY {log.artist}</td>
                      <td className="py-4 px-4 text-white/40 text-[11px] font-mono text-right">
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

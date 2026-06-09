import React, { useState, useEffect } from "react";
import { Shield, Users, Music, HardDrive, RefreshCw, Key, Trash2, UserCheck, Play, Pause, Circle } from "lucide-react";

interface AdminPanelProps {
  adminPassword: string;
  setAdminPassword: (password: string) => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (unlocked: boolean) => void;
  currentUsername: string;
}

interface RegisteredUser {
  id: number;
  google_id: string;
  email: string;
  name: string;
  picture: string;
  role: string;
  created_at: string;
  last_login: string;
  listens_today?: number;
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

interface UserListenDaily {
  username: string;
  date: string;
  count: number;
}

interface UserListenRecent {
  username: string;
  song_title: string;
  artist: string;
  timestamp: string;
}

interface Metrics {
  totalRegisteredUsers: number;
  registeredUsers: RegisteredUser[];
  totalSongs: number;
  activeUsersCount: number;
  activeUsers: ActiveUser[];
  userListensDaily?: UserListenDaily[];
  userListensRecent?: UserListenRecent[];
}

export function AdminPanel({
  adminPassword,
  setAdminPassword,
  isAdminUnlocked,
  setIsAdminUnlocked,
  currentUsername
}: AdminPanelProps) {
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();
  const totalListensToday = metrics?.userListensDaily
    ? metrics.userListensDaily
        .filter((item) => item.date === todayStr)
        .reduce((sum, item) => sum + item.count, 0)
    : 0;

  const [passwordInput, setPasswordInput] = useState(adminPassword);
  const [errorMsg, setErrorMsg] = useState("");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "active" | "history">("users");

  const fetchMetrics = async (pwd: string) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/admin/metrics", {
        headers: {
          "x-admin-password": pwd
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to retrieve metrics.");
      }

      const data = await response.json();
      setMetrics(data);
      setIsAdminUnlocked(true);
      setAdminPassword(pwd);
      localStorage.setItem("melo_admin_password", pwd);
      localStorage.setItem("melo_admin_unlocked", "true");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Incorrect admin password.");
      setIsAdminUnlocked(false);
      localStorage.removeItem("melo_admin_unlocked");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    fetchMetrics(passwordInput.trim());
  };

  const handleLock = () => {
    setIsAdminUnlocked(false);
    setAdminPassword("");
    setMetrics(null);
    localStorage.removeItem("melo_admin_password");
    localStorage.removeItem("melo_admin_unlocked");
  };

  const handleToggleRole = async (userId: number, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (response.ok) {
        // Refresh metrics
        fetchMetrics(adminPassword);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to update role.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating user role.");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user from the database?")) return;
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        // Refresh metrics
        fetchMetrics(adminPassword);
      } else {
        const err = await response.json();
        alert(err.error || "Failed to delete user.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting user.");
    }
  };

  // Auto-refresh metrics every 30 seconds when unlocked
  useEffect(() => {
    if (isAdminUnlocked && adminPassword) {
      fetchMetrics(adminPassword);
      const interval = setInterval(() => fetchMetrics(adminPassword), 30000);
      return () => clearInterval(interval);
    }
  }, [isAdminUnlocked, adminPassword]);

  if (!isAdminUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 animate-fade-in">
        <div className="glass-panel p-8 rounded-2xl border border-white/5 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-mulberry-primary/10 flex items-center justify-center border border-mulberry-primary/20">
            <Shield className="w-8 h-8 text-[#FF007A] animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-white">Unlock Admin Vault</h2>
            <p className="font-sans text-xs text-white/50">
              Enter the project password to access user listings, statistics, and system controls.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
              <input
                type="password"
                placeholder="Enter Project Password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FF007A] transition-all font-sans"
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FF007A] hover:bg-[#FF007A]/90 text-white font-sans text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-[#FF007A]/25 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "De-authorize Vault Lock"}
            </button>
          </form>

          <p className="text-[9px] text-white/30 font-sans tracking-wide">
            Tip: The project password was configured during server instantiation (mulbeery).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#FF007A]" /> Admin Console
          </h2>
          <p className="font-sans text-xs text-white/40">
            Real-time analytics and user manager dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchMetrics(adminPassword)}
            disabled={isLoading}
            className="glass-panel text-white border-white/5 hover:bg-white/5 px-4 py-2 rounded-xl font-sans text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleLock}
            className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-xl font-sans text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Lock Vault
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Users */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block">Registered Users</span>
            <span className="font-serif text-2xl font-bold text-white block mt-0.5">
              {metrics ? metrics.totalRegisteredUsers : "—"}
            </span>
          </div>
        </div>

        {/* Active Listeners */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div className="relative">
              <Circle className="w-6 h-6 text-emerald-400 fill-current opacity-20" />
              <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
              <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-emerald-400"></div>
            </div>
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest block">Online Sync Node</span>
            <span className="font-serif text-2xl font-bold text-emerald-400 block mt-0.5">
              {metrics ? metrics.activeUsersCount : "—"}
            </span>
          </div>
        </div>

        {/* Cached Tracks */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <Music className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="font-sans text-[10px] text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              Cached Songs
              <span className="flex items-center gap-1 text-emerald-400 text-[8px] font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                </span>
                LIVE
              </span>
            </span>
            <span className="font-serif text-2xl font-bold text-purple-400 block mt-0.5">
              {metrics ? metrics.totalSongs : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5 flex gap-4">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 font-sans text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === "users" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
          }`}
        >
          Registered Users ({metrics?.registeredUsers.length || 0})
          {activeTab === "users" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF007A]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-3 font-sans text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === "active" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
          }`}
        >
          Live Playbacks ({metrics?.activeUsers.length || 0})
          {activeTab === "active" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF007A]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-3 font-sans text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer ${
            activeTab === "history" ? "text-[#FF007A]" : "text-white/40 hover:text-white/60"
          }`}
        >
          User Listens (7d)
          {activeTab === "history" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#FF007A]"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "history" ? (
          <div className="space-y-6 animate-fade-in">
            {/* Daily stats table */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="font-serif text-sm font-bold text-white">Daily Listening Counts (Last 7 Days)</h3>
                <span className="text-[8px] font-sans font-bold bg-[#FF007A]/10 border border-[#FF007A]/20 text-[#FF007A] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Aggregate Counts
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                      <th className="p-4">User</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Songs Listened</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px] font-sans">
                    {!metrics?.userListensDaily || metrics.userListensDaily.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-white/30 italic">
                          No listening data recorded in the last 7 days.
                        </td>
                      </tr>
                    ) : (
                      metrics.userListensDaily.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 font-bold text-white">{item.username}</td>
                          <td className="p-4 text-white/70">{item.date}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                              {item.count} tracks
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent list */}
            <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <h3 className="font-serif text-sm font-bold text-white">Recent Songs Listened (Last 7 Days)</h3>
                <span className="text-[8px] font-sans font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Stream Log
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                      <th className="p-4">User</th>
                      <th className="p-4">Track Title</th>
                      <th className="p-4">Artist</th>
                      <th className="p-4">Played At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px] font-sans">
                    {!metrics?.userListensRecent || metrics.userListensRecent.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-white/30 italic">
                          No play history logs found in the last 7 days.
                        </td>
                      </tr>
                    ) : (
                      metrics.userListensRecent.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                          <td className="p-4 font-bold text-white">{item.username}</td>
                          <td className="p-4 text-[#FF007A] font-serif">{item.song_title}</td>
                          <td className="p-4 text-white/70">{item.artist}</td>
                          <td className="p-4 text-white/40 font-mono text-[10px]">{item.timestamp}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "users" ? (
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Google ID</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4">Listens Today</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] font-sans">
                  {metrics?.registeredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-white/30 italic">
                        No Google authenticated users found in the database.
                      </td>
                    </tr>
                  ) : (
                    metrics?.registeredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 flex items-center gap-2.5">
                          {user.picture ? (
                            <img
                              src={user.picture}
                              alt={user.name}
                              className="w-7 h-7 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-white border border-white/10">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white flex items-center gap-1.5">
                              {user.name}
                              {user.name === currentUsername && (
                                <span className="text-[7px] bg-white/5 text-[#FF007A] border border-[#FF007A]/30 rounded px-1 py-0.5">YOU</span>
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-white/70">{user.email}</td>
                        <td className="p-4 font-mono text-[9px] text-white/40">{user.google_id}</td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              user.role === "admin"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-white/5 text-white/60 border border-white/10"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-white/40">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-white/70">
                          {new Date(user.last_login).toLocaleString()}
                        </td>
                        <td className="p-4 text-white/70 font-mono text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                            {user.listens_today || 0} tracks
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleToggleRole(user.id, user.role)}
                            title="Toggle Admin Privilege"
                            className="p-1.5 bg-white/5 hover:bg-[#FF007A]/10 text-white hover:text-[#FF007A] border border-white/5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User Credentials"
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
        ) : (
          <div className="space-y-4">
            {metrics?.activeUsers.length === 0 ? (
              <div className="glass-panel p-8 text-center text-white/30 italic rounded-2xl border border-white/5">
                No active playbacks currently broadcasting to the server.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metrics?.activeUsers.map((active) => (
                  <div
                    key={active.username}
                    className="glass-panel p-4 rounded-xl border border-white/5 flex gap-4 items-center justify-between"
                  >
                    <div className="flex gap-3 items-center min-w-0 flex-1">
                      {active.songCoverUrl ? (
                        <div className="relative shrink-0">
                          <img
                            src={active.songCoverUrl}
                            alt={active.songTitle}
                            className="w-12 h-12 rounded-lg object-cover silver-edge"
                          />
                          <div className="absolute -bottom-1 -right-1">
                            {active.isPlaying ? (
                              <span className="flex h-3.5 w-3.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#0f0b0d] flex items-center justify-center">
                                  <Play className="w-1.5 h-1.5 text-white fill-current" />
                                </span>
                              </span>
                            ) : (
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-[#0f0b0d] flex items-center justify-center">
                                <Pause className="w-1.5 h-1.5 text-white fill-current" />
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 shrink-0">
                          <Music className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 text-left">
                        <p className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                          {active.username}
                          {active.username === currentUsername && (
                            <span className="text-[7px] bg-white/5 text-[#FF007A] border border-[#FF007A]/30 rounded px-1 py-0.5">YOU</span>
                          )}
                        </p>
                        {active.currentSongId ? (
                          <>
                            <p className="font-serif text-[11px] text-[#FF007A] truncate mt-0.5">
                              {active.songTitle}
                            </p>
                            <p className="font-sans text-[9px] text-white/40 truncate">
                              by {active.songArtist}
                            </p>
                          </>
                        ) : (
                          <p className="font-sans text-[10px] text-white/30 italic mt-0.5">
                            Idle - Not listening
                          </p>
                        )}
                      </div>
                    </div>

                    {active.currentSongId && (
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[9px] text-white/50">
                          Progress: {Math.floor(active.progress / 60)}:
                          {String(active.progress % 60).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

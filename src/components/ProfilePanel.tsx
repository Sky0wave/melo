import React, { useState } from "react";
import { Bell, Shield, Smartphone, Edit3, Sparkles } from "lucide-react";
import { ListeningHabit } from "../types";

interface ProfilePanelProps {
  username: string;
  onChangeUsername: (newUsername: string) => void;
  favoritesCount: number;
  playlistsCount: number;
  listeningHabits: ListeningHabit[];
  googleUser: any;
  onSignOut: () => void;
}

export function ProfilePanel({
  username,
  onChangeUsername,
  favoritesCount,
  playlistsCount,
  listeningHabits,
  googleUser,
  onSignOut
}: ProfilePanelProps) {
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(username);


  const handleUsernameSub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    onChangeUsername(usernameInput.trim());
    setEditingUsername(false);
  };

  const compiledPlays = listeningHabits.reduce((acc, current) => acc + current.count, 0);
  const calculatedHours = (1.2 + (compiledPlays * 4.2) / 60).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Avatar, Username and Stats */}
        <div className="lg:col-span-1 space-y-6 w-full">
          {/* Profile Header */}
          <section className="flex flex-col items-center text-center glass-panel p-5 rounded-2xl border border-white/5">
            <div className="relative group mb-3">
              <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-[#FF007A] via-[#c0305a] to-[#f0a0c0] shadow-xl">
                <img
                  alt="Profile Avatar"
                  className="w-full h-full rounded-full object-cover border-2 border-[#0f0b0d]"
                  src={googleUser && googleUser.picture ? googleUser.picture : "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300"}
                />
              </div>
              <button 
                onClick={() => setEditingUsername(!editingUsername)}
                aria-label="Edit username"
                className="absolute bottom-0 right-0 glass-panel p-1 rounded-full border border-[#FF007A]/30 text-[#FF007A] hover:bg-[#FF007A] hover:text-white transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {editingUsername ? (
              <form onSubmit={handleUsernameSub} className="flex gap-1.5 items-center max-w-xs mt-1">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="bg-white/5 border border-[#FF007A]/50 rounded-lg px-2.5 py-1 text-xs text-white text-center font-sans font-bold"
                  placeholder="Username"
                  maxLength={20}
                />
                <button 
                  type="submit" 
                  className="bg-[#FF007A] text-white font-bold text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider cursor-pointer"
                >
                  Save
                </button>
              </form>
            ) : (
              <div>
                <h2 className="font-serif text-lg font-bold text-white mb-0.5 flex items-center gap-1.5 justify-center">
                  {username} 
                  <span className="text-[7px] bg-white/5 text-[#FF007A] border border-[#FF007A]/10 rounded px-1 py-0.5 font-sans tracking-widest font-bold">PRO</span>
                  {googleUser && googleUser.role === "admin" && (
                    <span className="text-[7px] bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1 py-0.5 font-sans tracking-widest font-bold">ADMIN</span>
                  )}
                </h2>
                {googleUser && (
                  <p className="text-[10px] font-sans text-white/40 mb-1">{googleUser.email}</p>
                )}
              </div>
            )}

            <p className="font-sans text-[8px] text-white/40 uppercase tracking-[0.2em] mb-4">
              Platinum Tier Member
            </p>

            <div className="flex gap-2 justify-center w-full">
              <button 
                onClick={() => setEditingUsername(true)}
                className="bg-[#FF007A] hover:bg-[#FF007A]/90 text-white px-4 py-1.5 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Edit Name
              </button>
              {googleUser && (
                <button 
                  onClick={onSignOut}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-4 py-1.5 rounded-full font-sans text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>
          </section>

          {/* Stats Cards */}
          <section className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-3.5 rounded-xl border border-white/5 text-left relative overflow-hidden">
              <span className="font-serif text-xl font-bold text-[#FF007A] block leading-none">{calculatedHours}k</span>
              <span className="font-sans text-[8px] text-white/30 uppercase tracking-widest mt-1 block">Hours Streamed</span>
            </div>
            <div className="glass-panel p-3.5 rounded-xl border border-white/5 text-left relative overflow-hidden">
              <span className="font-serif text-xl font-bold text-[#FF007A] block leading-none">{playlistsCount + 1}</span>
              <span className="font-sans text-[8px] text-white/30 uppercase tracking-widest mt-1 block">Playlists</span>
            </div>
          </section>
        </div>

        {/* Right Column: Audio Parameters, Listening Habits, and Session settings */}
        <div className="lg:col-span-2 space-y-6 w-full">
          {/* Google Auth Integration Section */}
          <section className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xs font-bold text-white/80">Google Authentication</h3>
                <p className="font-sans text-[10px] text-white/40 mt-0.5">
                  {googleUser 
                    ? "Authenticated and connected to Skywave Server cloud database." 
                    : "Connect your Google account to sync, save custom playlists, and audit logs."}
                </p>
              </div>
              <span className={`text-[7px] border rounded px-1.5 py-0.5 font-sans tracking-widest font-bold uppercase ${
                googleUser 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-white/5 text-white/40 border-white/10"
              }`}>
                {googleUser ? "Connected" : "Guest Mode"}
              </span>
            </div>
            {!googleUser && (
              <div className="flex flex-col items-center py-2">
                <div id="google-signin-btn"></div>
              </div>
            )}
          </section>

          {/* Mobile Application Download */}
          <section className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xs font-bold text-white/80 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#FF007A]" />
                  Melo Mobile Application
                </h3>
                <p className="font-sans text-[10px] text-white/40 mt-0.5">
                  Download and install the Melo Android APK to listen with robust native background services and lock-screen support.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="/Melo.apk"
                download
                className="flex items-center gap-2 bg-[#FF007A]/10 hover:bg-[#FF007A]/20 border border-[#FF007A]/30 text-[#FF007A] px-4 py-2 rounded-xl font-sans text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Download Android APK
              </a>
              <span className="text-white/45 font-sans text-[9px] uppercase tracking-wider">
                v1.0.0 (Expo SDK 54)
              </span>
            </div>
          </section>

          {/* Audio Preferences */}
          <section className="glass-panel rounded-xl overflow-hidden border border-white/5 divide-y divide-white/5">

            <div className="p-3 bg-white/[0.02] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF007A] animate-pulse" />
              <h3 className="font-serif text-xs font-bold text-white/80">Premium Audio Parameters</h3>
            </div>
            <div className="flex items-center justify-between p-3 text-[10px] text-white/70">
              <div className="flex items-center gap-2">
                <Bell className="text-white/30 w-3.5 h-3.5" />
                <span>Push Notifications</span>
              </div>
              <span className="text-[8px] uppercase text-[#FF007A]/80 font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-3 text-[10px] text-white/70">
              <div className="flex items-center gap-2">
                <Shield className="text-white/30 w-3.5 h-3.5" />
                <span>Lossless Streaming</span>
              </div>
              <span className="text-[8px] uppercase text-[#FF007A]/80 font-bold">24-bit MQA</span>
            </div>
            <div className="flex items-center justify-between p-3 text-[10px] text-white/70">
              <div className="flex items-center gap-2">
                <Smartphone className="text-white/30 w-3.5 h-3.5" />
                <span>Connected Devices</span>
              </div>
              <span className="text-[8px] uppercase text-white/40">1 Active</span>
            </div>
          </section>

          {/* Listening Habits */}
          <section className="glass-panel p-4 rounded-xl border border-white/5 space-y-3">
            <h3 className="font-serif text-xs font-bold text-white/80">Listening Habits</h3>
            {listeningHabits.length === 0 ? (
              <p className="text-[9px] font-sans text-white/40 italic">
                No tracked habits yet. Play songs to populate metrics.
              </p>
            ) : (
              <div className="space-y-2">
                {listeningHabits.slice(0, 3).map(item => (
                  <div key={item.songId} className="flex justify-between items-center p-2 bg-white/5 rounded-lg border border-white/5">
                    <div className="min-w-0">
                      <p className="font-sans text-[10px] font-bold text-white truncate">{item.songTitle}</p>
                      <p className="font-sans text-[8px] text-white/40 truncate">{item.artist}</p>
                    </div>
                    <span className="text-[#FF007A] text-[9px] font-bold">
                      {item.count} Play{item.count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Session logout */}
          <section className="flex justify-center py-2">
            <button className="text-red-400 font-sans text-[9px] font-bold uppercase tracking-wider hover:opacity-75 transition-opacity cursor-pointer">
              Deauthorize Session Logs
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

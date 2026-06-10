import React from "react";
import { History, Activity } from "lucide-react";

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

interface HistoryLogProps {
  userListensDaily: UserListenDaily[];
  userListensRecent: UserListenRecent[];
  isLoading: boolean;
}

export function HistoryLog({ userListensDaily, userListensRecent, isLoading }: HistoryLogProps) {
  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
          History Streams Auditing
        </h2>
        <p className="font-sans text-xs text-white/40">
          Monitor recent songs streamed by users and aggregate active listening trends.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Daily play table */}
        <div className="xl:col-span-1 space-y-4">
          <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#FF007A]" /> Daily Streams
          </h3>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                    <th className="p-4">User</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Plays</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] font-sans">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={3} className="p-3"><div className="h-5 skeleton w-full" /></td>
                      </tr>
                    ))
                  ) : userListensDaily.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-white/30 italic">
                        No aggregate data.
                      </td>
                    </tr>
                  ) : (
                    userListensDaily.map((item, idx) => (
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
        </div>

        {/* Recent stream log */}
        <div className="xl:col-span-2 space-y-4">
          <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-purple-400" /> Recent Listen Stream Logs
          </h3>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                    <th className="p-4">User</th>
                    <th className="p-4">Song Title</th>
                    <th className="p-4">Artist</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] font-sans">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={4} className="p-3"><div className="h-5 skeleton w-full" /></td>
                      </tr>
                    ))
                  ) : userListensRecent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-white/30 italic">
                        No song play logs.
                      </td>
                    </tr>
                  ) : (
                    userListensRecent.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold text-white">{item.username}</td>
                        <td className="p-4 text-[#FF007A] font-serif">{item.song_title}</td>
                        <td className="p-4 text-white/70">{item.artist}</td>
                        <td className="p-4 text-white/40 font-mono text-[9px]">{item.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

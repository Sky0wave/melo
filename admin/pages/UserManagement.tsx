import React, { useState } from "react";
import { UserCheck, Trash2, Shield, Search } from "lucide-react";

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
  listens_total?: number;
}

interface UserManagementProps {
  registeredUsers: RegisteredUser[];
  currentAdminEmail?: string;
  onToggleRole: (userId: number, currentRole: string) => void;
  onDeleteUser: (userId: number) => void;
  isLoading: boolean;
}

export function UserManagement({
  registeredUsers,
  currentAdminEmail,
  onToggleRole,
  onDeleteUser,
  isLoading
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = registeredUsers.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-white flex items-center gap-2">
            User Credentials Vault
          </h2>
          <p className="font-sans text-xs text-white/40">
            Modify user privileges, monitor listening statistics, and audit security accounts.
          </p>
        </div>
        
        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#c5a880] transition-all font-sans"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-sans font-bold uppercase tracking-widest text-white/40">
                <th className="p-4">User Details</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Today's Plays</th>
                <th className="p-4">Total Plays</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[11px] font-sans">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td colSpan={8} className="p-4">
                      <div className="h-6 w-full skeleton" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-white/30 italic">
                    No users matching search filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelf = user.email === currentAdminEmail;
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                      {/* Name/Avatar */}
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
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate flex items-center gap-1.5">
                            {user.name}
                            {isSelf && (
                              <span className="text-[7px] bg-white/5 text-[#c5a880] border border-[#c5a880]/30 rounded px-1.5 py-0.5 tracking-widest font-semibold uppercase">YOU</span>
                            )}
                          </p>
                          <p className="text-[9px] text-white/30 font-mono">ID: {user.google_id || "Offline"}</p>
                        </div>
                      </td>
                      
                      {/* Email */}
                      <td className="p-4 text-white/70">{user.email}</td>
                      
                      {/* Role */}
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
                      
                      {/* Created At */}
                      <td className="p-4 text-white/40">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      
                      {/* Last Login */}
                      <td className="p-4 text-white/70">
                        {new Date(user.last_login).toLocaleString()}
                      </td>
                      
                      {/* Plays Today */}
                      <td className="p-4 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                          {user.listens_today || 0}
                        </span>
                      </td>

                      {/* Total Plays */}
                      <td className="p-4 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold">
                          {user.listens_total || 0}
                        </span>
                      </td>
                      
                      {/* Actions */}
                      <td className="p-4 text-right space-x-1.5">
                        <button
                          onClick={() => onToggleRole(user.id, user.role)}
                          disabled={isSelf}
                          title="Toggle Admin Privilege"
                          className="p-1.5 bg-white/5 hover:bg-[#c5a880]/10 text-white hover:text-[#c5a880] border border-white/5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteUser(user.id)}
                          disabled={isSelf}
                          title="Delete User Credentials"
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

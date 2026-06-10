import { LayoutDashboard, Users, Music, Database, History, Shield, LogOut } from "lucide-react";

export type AdminTab = "dashboard" | "users" | "songs" | "cache" | "history";

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  adminUser: any;
  onLogout: () => void;
}

export function AdminSidebar({ activeTab, setActiveTab, adminUser, onLogout }: AdminSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users & Roles", icon: Users },
    { id: "songs", label: "Song Library", icon: Music },
    { id: "cache", label: "Search Cache", icon: Database },
    { id: "history", label: "History Log", icon: History },
  ] as const;

  return (
    <aside className="w-72 bg-[#050406] border-r border-white/5 flex flex-col justify-between shrink-0 select-none">
      <div className="flex flex-col">
        {/* Top Header Logo */}
        <div className="flex flex-col gap-4 px-8 py-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div>
              <span className="font-serif text-2xl font-light tracking-[0.3em] text-[#c5a880] block">MELO</span>
              <span className="text-[9px] font-sans text-white/40 block tracking-[0.25em] uppercase leading-none mt-1.5">ADMIN CONSOLE</span>
            </div>
          </div>
          <div className="self-start mt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c5a880]/10 border border-[#c5a880]/20 rounded-full font-mono text-[8px] text-[#c5a880] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a880] animate-pulse"></span>
              SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* Navigation Section Label */}
        <div className="px-8 pt-8 pb-3">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-white/30 block">
            Navigation
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="px-6 py-1 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            // Map labels to match user screenshot
            let labelText: string = item.label;
            if (item.id === "users") labelText = "USERS & ROLES";
            else if (item.id === "songs") labelText = "SONG LIBRARY";
            else if (item.id === "cache") labelText = "SEARCH CACHE";
            else if (item.id === "history") labelText = "HISTORY LOG";
            else if (item.id === "dashboard") labelText = "DASHBOARD";

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-sans text-[11px] font-bold tracking-[0.18em] uppercase transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#c5a880]/10 text-[#c5a880] border border-[#c5a880]/20 shadow-md shadow-[#c5a880]/5"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#c5a880]" : "text-white/40"}`} />
                {labelText}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile footer with Logout */}
      <div className="p-6 border-t border-white/5 bg-white/[0.01] flex flex-col gap-5">
        <div className="flex items-center gap-3">
          {adminUser?.picture ? (
            <img
              src={adminUser.picture}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-[#c5a880]/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-[#c5a880] border border-[#c5a880]/30">
              <Shield className="w-4 h-4 text-[#c5a880]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h5 className="font-sans text-[12px] font-bold text-white truncate leading-snug">
              {adminUser?.name || "System Admin"}
            </h5>
            <p className="font-sans text-[10px] text-white/40 truncate">
              {adminUser?.email || "admin@melo.audio"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:border-[#c5a880]/20 bg-white/5 hover:bg-[#c5a880]/5 text-white/60 hover:text-[#c5a880] font-sans text-[10px] font-bold uppercase tracking-[0.15em] transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Lock Dashboard
        </button>
      </div>
    </aside>
  );
}

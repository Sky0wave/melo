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
    <aside className="w-64 bg-[#0a090e] border-r border-white/5 flex flex-col justify-between shrink-0 select-none">
      <div className="flex flex-col">
        {/* Top Header Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF007A]/20 to-[#7B2FFF]/20 border border-[#FF007A]/30 flex items-center justify-center">
            <img src="/favicon.svg" alt="Logo" className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-serif text-base font-bold tracking-widest text-[#FF007A]">MELO</span>
            <span className="text-[8px] font-sans text-white/40 block tracking-[0.2em] uppercase leading-none mt-0.5">ADMIN</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#FF007A]/10 text-[#FF007A] border border-[#FF007A]/20 shadow-md shadow-[#FF007A]/5"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#FF007A]" : "text-white/40"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User profile footer with Logout */}
      <div className="p-4 border-t border-white/5 bg-white/[0.01] flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {adminUser?.picture ? (
            <img
              src={adminUser.picture}
              alt=""
              className="w-9 h-9 rounded-full object-cover border border-white/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white border border-white/10">
              <Shield className="w-4.5 h-4.5 text-[#FF007A]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h5 className="font-sans text-xs font-bold text-white truncate leading-snug">
              {adminUser?.name || "System Admin"}
            </h5>
            <p className="font-sans text-[9px] text-white/40 truncate">
              {adminUser?.email || "admin@melo.audio"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/10 hover:border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-sans text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Lock Dashboard
        </button>
      </div>
    </aside>
  );
}

import React, { useState, useEffect } from "react";
import { AdminLoginGate } from "./components/AdminLoginGate";
import { AdminSidebar, AdminTab } from "./components/AdminSidebar";
import { Dashboard } from "./pages/Dashboard";
import { UserManagement } from "./pages/UserManagement";
import { SongLibrary } from "./pages/SongLibrary";
import { SearchCache } from "./pages/SearchCache";
import { HistoryLog } from "./pages/HistoryLog";
import { RefreshCw, ExternalLink } from "lucide-react";

export function AdminApp() {
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem("melo_admin_password") || "");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => localStorage.getItem("melo_admin_unlocked") === "true");
  const [adminUser, setAdminUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("melo_admin_user") || "null");
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [metrics, setMetrics] = useState<any>(null);

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
      localStorage.removeItem("melo_admin_password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (pwd: string, user: any) => {
    if (user) {
      setAdminUser(user);
      localStorage.setItem("melo_admin_user", JSON.stringify(user));
    }
    fetchMetrics(pwd);
  };

  const handleLogout = () => {
    setIsAdminUnlocked(false);
    setAdminPassword("");
    setAdminUser(null);
    setMetrics(null);
    localStorage.removeItem("melo_admin_password");
    localStorage.removeItem("melo_admin_unlocked");
    localStorage.removeItem("melo_admin_user");
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
    if (!confirm("Are you sure you want to delete this user? All their listen records and configuration data will be cleared.")) return;
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

  // Poll metrics every 30 seconds when unlocked
  useEffect(() => {
    if (isAdminUnlocked && adminPassword) {
      fetchMetrics(adminPassword);
      const interval = setInterval(() => fetchMetrics(adminPassword), 30000);
      return () => clearInterval(interval);
    }
  }, [isAdminUnlocked, adminPassword]);

  if (!isAdminUnlocked) {
    return (
      <AdminLoginGate
        onSuccess={handleLoginSuccess}
        isLoading={isLoading}
        errorMsg={errorMsg}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            totalRegisteredUsers={metrics?.totalRegisteredUsers || 0}
            totalSongs={metrics?.totalSongs || 0}
            activeUsersCount={metrics?.activeUsersCount || 0}
            activeUsers={metrics?.activeUsers || []}
            registeredUsers={metrics?.registeredUsers || []}
            isLoading={isLoading}
          />
        );
      case "users":
        return (
          <UserManagement
            registeredUsers={metrics?.registeredUsers || []}
            currentAdminEmail={adminUser?.email}
            onToggleRole={handleToggleRole}
            onDeleteUser={handleDeleteUser}
            isLoading={isLoading}
          />
        );
      case "songs":
        return <SongLibrary adminPassword={adminPassword} />;
      case "cache":
        return <SearchCache adminPassword={adminPassword} />;
      case "history":
        return (
          <HistoryLog
            userListensDaily={metrics?.userListensDaily || []}
            userListensRecent={metrics?.userListensRecent || []}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#07060a] text-[#f0edf7] overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminUser={adminUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 shrink-0 select-none bg-[#0a090e]/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">System Node:</span>
            <span className="font-mono text-[9px] text-[#FF007A] font-bold">ONLINE</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 hover:underline transition-all font-sans font-semibold uppercase tracking-wider"
            >
              Launch Melo App <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => fetchMetrics(adminPassword)}
              disabled={isLoading}
              className="glass-card hover:bg-white/5 text-white/80 p-2 rounded-xl transition-all cursor-pointer disabled:opacity-30"
              title="Sync Metrics Now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

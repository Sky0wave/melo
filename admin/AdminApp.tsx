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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
            userListensRecent={metrics?.userListensRecent || []}
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
    <div className="flex h-screen bg-[#07060a] text-[#f0edf7] overflow-hidden relative">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false); // Close sidebar on mobile navigation
          }}
          adminUser={adminUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar for Mobile */}
        <header className="flex items-center justify-between px-8 py-5 bg-[#050406] border-b border-white/5 lg:hidden shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-light tracking-[0.3em] text-[#c5a880]">MELO</span>
            <span className="text-[8px] font-sans text-white/40 tracking-[0.2em] uppercase mt-0.5">ADMIN</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 border border-white/10 hover:border-[#c5a880]/30 bg-white/3 hover:bg-[#c5a880]/5 rounded-xl text-white/60 hover:text-white transition-all duration-300 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 md:p-12 relative">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

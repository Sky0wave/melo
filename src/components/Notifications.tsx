import { X, Bell, Info, CheckCircle, AlertTriangle } from "lucide-react";

export interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning";
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export function Notifications({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll
}: NotificationsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-[#07060a]/80 backdrop-blur-sm animate-fade-in">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-out Drawer */}
      <div className="relative z-10 w-full max-w-[360px] h-full bg-mulberry-dark border-l border-white/10 flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="h-16 px-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-mulberry-primary" />
            <h3 className="font-serif text-sm font-bold text-white tracking-wide">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Action bar */}
        {notifications.length > 0 && (
          <div className="px-5 py-2.5 bg-white/2 border-b border-white/5 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider shrink-0">
            <button
              onClick={onMarkAllAsRead}
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Mark read
            </button>
            <button
              onClick={onClearAll}
              className="text-mulberry-primary hover:text-mulberry-primary/80 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Content list */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-50">
              <Bell className="w-8 h-8 text-white/20" />
              <p className="font-serif text-xs text-white/70">No notifications</p>
              <p className="text-[9px] text-white/40 max-w-[180px]">
                You're all caught up! New alerts and sync changes will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border flex gap-3 text-left transition-all ${
                  item.read
                    ? "bg-white/2 border-white/2 opacity-70"
                    : "bg-mulberry-primary/5 border-mulberry-primary/20 shadow-md shadow-[#FF007A]/2"
                }`}
              >
                {/* Icon wrapper */}
                <div className="shrink-0 pt-0.5">
                  {item.type === "success" ? (
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                  ) : item.type === "warning" ? (
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                  ) : (
                    <Info className="w-4.5 h-4.5 text-sky-400" />
                  )}
                </div>

                {/* Message & date */}
                <div className="min-w-0 space-y-1">
                  <p className="text-xs text-white/85 leading-relaxed font-sans">{item.message}</p>
                  <span className="text-[8px] font-mono text-white/30 block">
                    {item.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

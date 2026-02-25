import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";
import {
  Bell, Users, Heart, MessageCircle, Zap, ArrowUpRight, Gift,
  CheckCheck, Trash2, X, RefreshCw, Info
} from "lucide-react";
import type { ApiNotification } from "../lib/api";

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  FOLLOW:          { icon: <Users size={14} />,          color: "#6366f1" },
  LIKE:            { icon: <Heart size={14} />,           color: "#ef4444" },
  COMMENT:         { icon: <MessageCircle size={14} />,   color: "#22d3ee" },
  REWARD_EARNED:   { icon: <Zap size={14} />,             color: "#10b981" },
  WITHDRAWAL_DONE: { icon: <ArrowUpRight size={14} />,    color: "#f59e0b" },
  AIRDROP:         { icon: <Gift size={14} />,            color: "#a855f7" },
  SYSTEM:          { icon: <Info size={14} />,            color: "#64748b" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifItem({ notif, onRead, onDelete }: { notif: ApiNotification; onRead: (id: string) => void; onDelete: (id: string) => void }) {
  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.SYSTEM;

  return (
    <div
      onClick={() => !notif.isRead && onRead(notif.id)}
      className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer border-b border-slate-700/10 last:border-0 ${!notif.isRead ? "bg-slate-800/20" : ""}`}>
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}28`, color: cfg.color }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white truncate">{notif.title}</span>
          {!notif.isRead && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
        <p className="text-xs text-slate-600 mt-1">{timeAgo(notif.createdAt)}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
        className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 p-1">
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, loading, markRead, markAllRead, deleteNotif } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-700/50 border border-slate-700/30"
        style={{ background: open ? "rgba(34,211,238,0.1)" : undefined }}>
        <Bell size={16} className={open ? "text-cyan-400" : "text-slate-400"} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5"
            style={{ boxShadow: "0 0 0 2px #0f172a" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-2xl border border-slate-700/30 shadow-2xl z-50 overflow-hidden"
          style={{ background: "rgba(15,23,42,0.97)", backdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/20">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-cyan-400" />
              <span className="text-sm font-bold text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/25">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800">
                  <CheckCheck size={11} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <RefreshCw size={16} className="text-slate-500 animate-spin" />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="py-10 text-center">
                <Bell size={28} className="text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No notifications yet</p>
              </div>
            )}
            {!loading && notifications.map(n => (
              <div key={n.id} className="group">
                <NotifItem notif={n} onRead={markRead} onDelete={deleteNotif} />
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700/20 text-center">
              <p className="text-xs text-slate-600">{notifications.length} notifications loaded</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

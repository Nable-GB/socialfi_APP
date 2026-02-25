import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Settings, Bell, Shield, Eye, Palette, Globe, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({ likes: true, comments: true, follows: true, rewards: true, ads: false });
  const [privacy, setPrivacy] = useState({ publicProfile: true, showBalance: false, showEmail: false });
  const [theme, setTheme] = useState("dark");

  const handleSave = () => {
    toast.success("Settings saved! ✅");
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/30">
            <Settings size={20} className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Settings</h1>
            <p className="text-xs text-slate-400">Manage your account preferences</p>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Shield size={15} className="text-cyan-400" /> Account
        </h3>
        <div className="space-y-3">
          {[
            { label: "Email", value: user.email ?? "Not set" },
            { label: "Username", value: `@${user.username}` },
            { label: "Display Name", value: user.displayName ?? user.username },
            { label: "Role", value: user.role },
            { label: "Referral Code", value: user.referralCode },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-slate-700/10 last:border-0">
              <span className="text-sm text-slate-400">{item.label}</span>
              <span className="text-sm font-mono text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Bell size={15} className="text-indigo-400" /> Notifications
        </h3>
        <div className="space-y-3">
          {([
            { key: "likes", label: "Likes on your posts" },
            { key: "comments", label: "Comments & replies" },
            { key: "follows", label: "New followers" },
            { key: "rewards", label: "Reward earnings" },
            { key: "ads", label: "Sponsored content updates" },
          ] as const).map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">{item.label}</span>
              <button
                onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`w-10 h-5.5 rounded-full transition-all relative ${notifications[item.key] ? "bg-cyan-500" : "bg-slate-700"}`}
                style={{ width: 40, height: 22 }}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all ${notifications[item.key] ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Eye size={15} className="text-amber-400" /> Privacy
        </h3>
        <div className="space-y-3">
          {([
            { key: "publicProfile", label: "Public profile" },
            { key: "showBalance", label: "Show token balance" },
            { key: "showEmail", label: "Show email on profile" },
          ] as const).map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">{item.label}</span>
              <button
                onClick={() => setPrivacy(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                className={`rounded-full transition-all relative ${privacy[item.key] ? "bg-cyan-500" : "bg-slate-700"}`}
                style={{ width: 40, height: 22 }}>
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all ${privacy[item.key] ? "left-5" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Palette size={15} className="text-purple-400" /> Appearance
        </h3>
        <div className="flex gap-3">
          {[
            { id: "dark", label: "Dark", bg: "#0f172a" },
            { id: "midnight", label: "Midnight", bg: "#1e1b4b" },
            { id: "light", label: "Light (soon)", bg: "#f1f5f9" },
          ].map(t => (
            <button key={t.id} onClick={() => { if (t.id !== "light") setTheme(t.id); else toast.info("Light theme coming soon!"); }}
              className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${theme === t.id ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-slate-700/20 hover:border-slate-600/40"}`}>
              <div className="w-full h-8 rounded-lg mb-2" style={{ background: t.bg, border: "1px solid rgba(255,255,255,0.1)" }} />
              <span className="text-xs font-medium text-slate-300">{t.label}</span>
              {theme === t.id && <CheckCircle size={12} className="text-cyan-400 mx-auto mt-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Globe size={15} className="text-emerald-400" /> Language
        </h3>
        <select className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50">
          <option value="en">English</option>
          <option value="th">ไทย</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </div>

      {/* Save */}
      <button onClick={handleSave}
        className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)", boxShadow: "0 4px 15px rgba(34,211,238,0.25)" }}>
        <Save size={16} /> Save Settings
      </button>
    </div>
  );
}

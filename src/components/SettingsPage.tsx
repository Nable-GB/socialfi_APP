import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { usersApi } from "../lib/api";
import { Settings, Bell, Shield, Eye, Palette, Globe, Save, CheckCircle, Lock, Wallet, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`rounded-full transition-all relative flex-shrink-0`}
      style={{ width: 40, height: 22, background: checked ? "#22d3ee" : "#334155" }}>
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-all ${checked ? "left-5" : "left-1"}`} />
    </button>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const wallet = useWallet();

  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // UI state
  const [notifications, setNotifications] = useState({ likes: true, comments: true, follows: true, rewards: true, ads: false });
  const [privacy, setPrivacy] = useState({ publicProfile: true, showBalance: false, showEmail: false });
  const [theme, setTheme] = useState("dark");
  const [linkingWallet, setLinkingWallet] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error("Display name cannot be empty"); return; }
    setSavingProfile(true);
    try {
      await usersApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      await refreshUser();
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error("Please fill in all password fields"); return; }
    if (newPw !== confirmPw) { toast.error("New passwords do not match"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      await usersApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      toast.success("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  const handleLinkWallet = async () => {
    if (!wallet.hasMetaMask) { toast.error("Please install MetaMask"); return; }
    setLinkingWallet(true);
    try {
      const address = wallet.address || await wallet.connect();
      await usersApi.linkWallet(address);
      await refreshUser();
      toast.success("Wallet linked successfully!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to link wallet");
    } finally {
      setLinkingWallet(false);
    }
  };

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

      {/* Account Info (read-only) */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Shield size={15} className="text-cyan-400" /> Account Info
        </h3>
        <div className="space-y-2">
          {[
            { label: "Email", value: user.email ?? "Not set (wallet account)" },
            { label: "Username", value: `@${user.username}` },
            { label: "Role", value: user.role },
            { label: "Referral Code", value: user.referralCode },
            { label: "Wallet", value: user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : "Not linked" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-slate-700/10 last:border-0">
              <span className="text-sm text-slate-400">{item.label}</span>
              <span className="text-sm font-mono text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <User size={15} className="text-indigo-400" /> Edit Profile
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
              placeholder="Your display name" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Bio <span className="text-slate-600">{bio.length}/300</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
              placeholder="Tell us about yourself..." />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Avatar URL</label>
            <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
              placeholder="https://..." />
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
            {savingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Change Password — only for email accounts */}
      {user.email && (
        <div className="glass rounded-2xl p-5 border border-slate-700/10">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Lock size={15} className="text-amber-400" /> Change Password
          </h3>
          <div className="space-y-3">
            {[
              { label: "Current Password", value: currentPw, set: setCurrentPw },
              { label: "New Password", value: newPw, set: setNewPw },
              { label: "Confirm New Password", value: confirmPw, set: setConfirmPw },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                <input type="password" value={value} onChange={e => set(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
                  placeholder="••••••••" />
              </div>
            ))}
            <button onClick={handleChangePassword} disabled={savingPw}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              {savingPw ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
              {savingPw ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* Link Wallet — only if no wallet linked */}
      {!user.walletAddress && (
        <div className="glass rounded-2xl p-5 border border-slate-700/10">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Wallet size={15} className="text-emerald-400" /> Link MetaMask Wallet
          </h3>
          <p className="text-xs text-slate-400 mb-4">Link your wallet to enable crypto features and Web3 login.</p>
          <button onClick={handleLinkWallet} disabled={linkingWallet}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.8), rgba(234,88,12,0.8))" }}>
            {linkingWallet ? <RefreshCw size={14} className="animate-spin" /> : <Wallet size={14} />}
            {linkingWallet ? "Linking..." : "Link Wallet"}
          </button>
        </div>
      )}

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
              <ToggleSwitch checked={notifications[item.key]} onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))} />
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
              <ToggleSwitch checked={privacy[item.key]} onChange={() => setPrivacy(prev => ({ ...prev, [item.key]: !prev[item.key] }))} />
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
    </div>
  );
}

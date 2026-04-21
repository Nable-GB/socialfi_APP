import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useWallet } from "../hooks/useWallet";
import { usersApi, uploadApi, targetingApi } from "../lib/api";
import { Settings, Bell, Shield, Eye, Palette, Globe, Save, CheckCircle, Lock, Wallet, User, RefreshCw, Camera, Target } from "lucide-react";
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
  const { lang, setLang, t } = useLang();
  const wallet = useWallet();

  // Profile edit state
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  // Demographics state
  const [demoInterests, setDemoInterests] = useState<string[]>([]);
  const [demoLocation, setDemoLocation] = useState("");
  const [demoBirthYear, setDemoBirthYear] = useState("");
  const [demoGender, setDemoGender] = useState("");
  const [demoInterestInput, setDemoInterestInput] = useState("");
  const [savingDemo, setSavingDemo] = useState(false);

  // UI state
  const [notifications, setNotifications] = useState({ likes: true, comments: true, follows: true, rewards: true, ads: false });
  const [privacy, setPrivacy] = useState({ publicProfile: true, showBalance: false, showEmail: false });
  const [theme, setTheme] = useState("dark");
  const [linkingWallet, setLinkingWallet] = useState(false);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { toast.error(t.settings.displayNameEmpty); return; }
    setSavingProfile(true);
    try {
      const result = await usersApi.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      await refreshUser();
      toast.success(t.settings.profileUpdated);
      if (result.welcomeReward?.awarded && result.welcomeReward.amount) {
        toast.success(`${t.transactions.typeSignupBonus}: +${result.welcomeReward.amount} ${t.transactions.ledgerUnit}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? t.settings.updateFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { toast.error(t.settings.fillAllFields); return; }
    if (newPw !== confirmPw) { toast.error(t.settings.passwordsNoMatch); return; }
    if (newPw.length < 8) { toast.error(t.settings.passwordMin); return; }
    setSavingPw(true);
    try {
      await usersApi.changePassword({ currentPassword: currentPw, newPassword: newPw });
      toast.success(t.settings.passwordChanged);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err?.message ?? t.settings.passwordChangeFailed);
    } finally {
      setSavingPw(false);
    }
  };

  const handleLinkWallet = async () => {
    if (!wallet.hasMetaMask) { toast.error(t.settings.installMetaMask); return; }
    setLinkingWallet(true);
    try {
      const address = wallet.address || await wallet.connect();
      const result = await usersApi.linkWallet(address);
      await refreshUser();
      toast.success(t.settings.walletLinked);
      if (result.welcomeReward?.awarded && result.welcomeReward.amount) {
        toast.success(`${t.transactions.typeSignupBonus}: +${result.welcomeReward.amount} ${t.transactions.ledgerUnit}`);
      }
    } catch (err: any) {
      toast.error(err?.message ?? t.settings.linkFailed);
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleSaveDemographics = async () => {
    setSavingDemo(true);
    try {
      await targetingApi.updateDemographics({
        interests: demoInterests.length > 0 ? demoInterests : undefined,
        location: demoLocation || undefined,
        birthYear: demoBirthYear ? parseInt(demoBirthYear) : undefined,
        gender: demoGender || undefined,
      });
      toast.success(t.settings.demographicsUpdated);
    } catch (err: any) {
      toast.error(err?.message ?? t.settings.demographicsFailed);
    } finally {
      setSavingDemo(false);
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
            <h1 className="text-xl font-bold text-white">{t.settings.title}</h1>
            <p className="text-xs text-slate-400">{t.settings.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Account Info (read-only) */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Shield size={15} className="text-cyan-400" /> {t.settings.accountInfo}
        </h3>
        <div className="space-y-2">
          {[
            { label: t.settings.email, value: user.email ?? t.settings.notSet },
            { label: t.settings.username, value: `@${user.username}` },
            { label: t.settings.role, value: user.role },
            { label: t.settings.referralCode, value: user.referralCode },
            { label: t.settings.wallet, value: user.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : t.settings.notLinked },
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
          <User size={15} className="text-indigo-400" /> {t.settings.editProfile}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.settings.displayName}</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600"
              placeholder={t.settings.displayNamePlaceholder} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.settings.bio} <span className="text-slate-600">{bio.length}/300</span></label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 resize-none"
              placeholder={t.settings.bioPlaceholder} />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">{t.settings.avatar}</label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/30 flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={24} /></div>
                )}
              </div>
              {/* File picker */}
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-600/50 cursor-pointer hover:border-cyan-500/40 transition-all">
                  {uploadingAvatar ? <RefreshCw size={13} className="animate-spin text-cyan-400" /> : <Camera size={13} className="text-cyan-400" />}
                  <span className="text-xs text-slate-300">{uploadingAvatar ? t.settings.uploading : t.settings.uploadImage}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error(t.settings.maxSize); return; }
                      setUploadingAvatar(true);
                      try {
                        const res = await uploadApi.avatar(file);
                        setAvatarUrl(res.url);
                        toast.success(t.settings.avatarUploaded);
                      } catch (err: any) { toast.error(err?.message ?? t.settings.uploadFailed); }
                      finally { setUploadingAvatar(false); e.target.value = ""; }
                    }} />
                </label>
                <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/20 text-xs text-slate-400 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 font-mono"
                  placeholder={t.settings.pasteUrl} />
              </div>
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
            {savingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {savingProfile ? t.settings.saving : t.settings.saveProfile}
          </button>
        </div>
      </div>

      {/* Change Password — only for email accounts */}
      {user.email && (
        <div className="glass rounded-2xl p-5 border border-slate-700/10">
          <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
            <Lock size={15} className="text-amber-400" /> {t.settings.changePassword}
          </h3>
          <div className="space-y-3">
            {[
              { label: t.settings.currentPassword, value: currentPw, set: setCurrentPw },
              { label: t.settings.newPassword, value: newPw, set: setNewPw },
              { label: t.settings.confirmPassword, value: confirmPw, set: setConfirmPw },
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
              {savingPw ? t.settings.changing : t.settings.changePassword}
            </button>
          </div>
        </div>
      )}

      {/* Link Wallet — only if no wallet linked */}
      {!user.walletAddress && (
        <div className="glass rounded-2xl p-5 border border-slate-700/10">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Wallet size={15} className="text-emerald-400" /> {t.settings.linkWallet}
          </h3>
          <p className="text-xs text-slate-400 mb-4">{t.settings.linkWalletDesc}</p>
          <button onClick={handleLinkWallet} disabled={linkingWallet}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.8), rgba(234,88,12,0.8))" }}>
            {linkingWallet ? <RefreshCw size={14} className="animate-spin" /> : <Wallet size={14} />}
            {linkingWallet ? t.settings.linking : t.settings.linkWalletBtn}
          </button>
        </div>
      )}

      {/* Demographics / Ad Targeting */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-2">
          <Target size={15} className="text-cyan-400" /> {t.settings.adPreferences}
        </h3>
        <p className="text-xs text-slate-500 mb-4">{t.settings.adPreferencesDesc}</p>
        <div className="space-y-3">
          {/* Interests */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{t.settings.interests}</label>
            <div className="flex gap-2">
              <input
                value={demoInterestInput}
                onChange={e => setDemoInterestInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && demoInterestInput.trim()) {
                    e.preventDefault();
                    const val = demoInterestInput.trim().toLowerCase();
                    if (!demoInterests.includes(val)) setDemoInterests([...demoInterests, val]);
                    setDemoInterestInput("");
                  }
                }}
                placeholder={t.settings.interestsPlaceholder}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            {demoInterests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {demoInterests.map(i => (
                  <span key={i} className="px-2.5 py-1 rounded-lg text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 flex items-center gap-1">
                    {i}
                    <button onClick={() => setDemoInterests(demoInterests.filter(x => x !== i))} className="hover:text-white">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.settings.location}</label>
              <input value={demoLocation} onChange={e => setDemoLocation(e.target.value)}
                placeholder={t.settings.locationPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.settings.birthYear}</label>
              <input type="number" value={demoBirthYear} onChange={e => setDemoBirthYear(e.target.value)}
                placeholder={t.settings.birthYearPlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.settings.gender}</label>
              <select value={demoGender} onChange={e => setDemoGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50">
                <option value="">{t.settings.genderPreferNotSay}</option>
                <option value="male">{t.settings.genderMale}</option>
                <option value="female">{t.settings.genderFemale}</option>
                <option value="other">{t.settings.genderOther}</option>
              </select>
            </div>
          </div>

          <button onClick={handleSaveDemographics} disabled={savingDemo}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)" }}>
            {savingDemo ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {savingDemo ? t.settings.saving : t.settings.savePreferences}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Bell size={15} className="text-indigo-400" /> {t.settings.notifications}
        </h3>
        <div className="space-y-3">
          {([
            { key: "likes", label: t.settings.notifyLikes },
            { key: "comments", label: t.settings.notifyComments },
            { key: "follows", label: t.settings.notifyFollows },
            { key: "rewards", label: t.settings.notifyRewards },
            { key: "ads", label: t.settings.notifyAds },
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
          <Eye size={15} className="text-amber-400" /> {t.settings.privacy}
        </h3>
        <div className="space-y-3">
          {([
            { key: "publicProfile", label: t.settings.publicProfile },
            { key: "showBalance", label: t.settings.showBalance },
            { key: "showEmail", label: t.settings.showEmail },
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
          <Palette size={15} className="text-purple-400" /> {t.settings.appearance}
        </h3>
        <div className="flex gap-3">
          {[
            { id: "dark", label: t.settings.themeDark, bg: "#0f172a" },
            { id: "midnight", label: t.settings.themeMidnight, bg: "#1e1b4b" },
            { id: "light", label: t.settings.themeLight, bg: "#f1f5f9" },
          ].map(th => (
            <button key={th.id} onClick={() => { if (th.id !== "light") setTheme(th.id); else toast.info(t.settings.lightThemeComing); }}
              className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${theme === th.id ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-slate-700/20 hover:border-slate-600/40"}`}>
              <div className="w-full h-8 rounded-lg mb-2" style={{ background: th.bg, border: "1px solid rgba(255,255,255,0.1)" }} />
              <span className="text-xs font-medium text-slate-300">{th.label}</span>
              {theme === th.id && <CheckCircle size={12} className="text-cyan-400 mx-auto mt-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
          <Globe size={15} className="text-emerald-400" /> {t.settings.language}
        </h3>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50"
        >
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
      </div>
    </div>
  );
}

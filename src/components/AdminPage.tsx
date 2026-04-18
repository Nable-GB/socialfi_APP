import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../lib/api";
import {
  Users, BarChart2, Zap, ShoppingBag, RefreshCw,
  Shield, CheckCircle, XCircle, ArrowUpRight, Gift, Play, Pause, Ban,
  AlertTriangle, Crown, Ticket, Copy
} from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../contexts/LangContext";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AdminStats {
  users: { total: number; verified: number; unverified: number };
  campaigns: { total: number; active: number };
  rewards: { totalPaid: string; pendingWithdrawals: { count: number; amount: string } };
  revenue: { totalFiat: string };
  posts: { total: number };
  onChainEnabled: boolean;
}

interface AdminUser {
  id: string; email?: string; username: string; displayName?: string;
  role: string; isVerified: boolean; emailVerified: boolean;
  walletAddress?: string; offChainBalance: string; totalEarned: string;
  createdAt: string; lastLoginAt?: string;
  _count: { posts: number; rewards: number };
}

interface AdminCampaign {
  id: string; title: string; status: string; paymentStatus: string;
  budget: string; rewardPoolTotal: string; rewardPoolDistributed: string;
  impressionsTotal: number; impressionsDelivered: number;
  createdAt: string; merchant: { id: string; username: string; email?: string };
}

interface AdminCreatorCodeRedemption {
  id: string;
  redeemedAt: string;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revokeReason?: string | null;
  subscriptionId?: string | null;
  user: { id: string; username: string; displayName?: string | null; email?: string | null };
}

interface AdminCreatorCode {
  id: string;
  code: string;
  tier: string;
  isActive: boolean;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  redemptionCount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  createdBy?: { id: string; username: string; displayName?: string | null };
  redemptions: AdminCreatorCodeRedemption[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass rounded-2xl p-5 border border-slate-700/10">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold font-mono text-white">{value}</p>
      <p className="text-xs font-semibold text-white mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  USER: "text-slate-400 bg-slate-800 border-slate-700",
  MERCHANT: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
  ADMIN: "text-amber-400 bg-amber-500/10 border-amber-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  PAUSED: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  CANCELLED: "text-red-400 bg-red-500/10 border-red-500/25",
  COMPLETED: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  DRAFT: "text-slate-400 bg-slate-700/30 border-slate-700",
  PENDING_PAYMENT: "text-orange-400 bg-orange-500/10 border-orange-500/25",
};

const CREATOR_CODES_PAGE_SIZE = 10;

function toDateTimeLocalValue(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "campaigns" | "creatorCodes" | "rewards";
type CreatorCodeFilter = "all" | "active" | "inactive";

export function AdminPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [campaignPage, setCampaignPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [airdropAmount, setAirdropAmount] = useState("10");
  const [grantAmounts, setGrantAmounts] = useState<Record<string, string>>({});
  const [grantNotes, setGrantNotes] = useState<Record<string, string>>({});
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [creatorCodes, setCreatorCodes] = useState<AdminCreatorCode[]>([]);
  const [creatorCodeTotal, setCreatorCodeTotal] = useState(0);
  const [creatorCodePage, setCreatorCodePage] = useState(1);
  const [creatorCodeSearch, setCreatorCodeSearch] = useState("");
  const [creatorCodeFilter, setCreatorCodeFilter] = useState<CreatorCodeFilter>("all");
  const [creatorCodesLoading, setCreatorCodesLoading] = useState(false);
  const [creatorCodeSubmitting, setCreatorCodeSubmitting] = useState(false);
  const [creatorCodeActionId, setCreatorCodeActionId] = useState<string | null>(null);
  const [editingCreatorCodeId, setEditingCreatorCodeId] = useState<string | null>(null);
  const [creatorCodeValue, setCreatorCodeValue] = useState("");
  const [creatorCodeExpiresAt, setCreatorCodeExpiresAt] = useState("");
  const [creatorCodeMaxRedemptions, setCreatorCodeMaxRedemptions] = useState("");
  const [creatorCodeNotes, setCreatorCodeNotes] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const fetchUsers = useCallback(async (page = 1, search = "") => {
    setLoading(true);
    try {
      const data = await adminApi.getUsers({ page, limit: 20, search: search || undefined });
      setUsers(data.users);
      setUserTotal(data.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchCampaigns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await adminApi.getCampaigns({ page, limit: 20 });
      setCampaigns(data.campaigns);
      setCampaignTotal(data.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchCreatorCodes = useCallback(async (page = 1, search = "", filter: CreatorCodeFilter = "all") => {
    setCreatorCodesLoading(true);
    try {
      const data = await adminApi.getCreatorCodes({
        page,
        limit: CREATOR_CODES_PAGE_SIZE,
        search: search || undefined,
        active: filter === "all" ? undefined : filter === "active",
      });
      setCreatorCodes(data.codes);
      setCreatorCodeTotal(data.total);
    } catch { /* ignore */ }
    finally { setCreatorCodesLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === "users") fetchUsers(userPage, userSearch); }, [tab, userPage, fetchUsers]);
  useEffect(() => { if (tab === "campaigns") fetchCampaigns(campaignPage); }, [tab, campaignPage, fetchCampaigns]);
  useEffect(() => {
    if (tab === "creatorCodes") fetchCreatorCodes(creatorCodePage, creatorCodeSearch, creatorCodeFilter);
  }, [tab, creatorCodePage, creatorCodeFilter, fetchCreatorCodes]);

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast.success(`${t.admin.roleUpdated} ${role}`);
      fetchUsers(userPage, userSearch);
    } catch (err: any) { toast.error(err?.message ?? t.admin.failed); }
  };

  const handleUpdateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await adminApi.updateCampaignStatus(campaignId, status);
      toast.success(`${t.admin.campaign} ${status.toLowerCase()}`);
      fetchCampaigns(campaignPage);
      fetchStats();
    } catch (err: any) { toast.error(err?.message ?? t.admin.failed); }
  };

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      const res = await adminApi.distributeRewards();
      toast.success(`${t.admin.distributed} ${res.distributed} / ${res.processed} ${t.admin.withdrawals}`);
      if (res.failed > 0) toast.error(`${res.failed} ${t.admin.failedCount}`);
      fetchStats();
    } catch (err: any) { toast.error(err?.message ?? t.admin.distributionFailed); }
    finally { setDistributing(false); }
  };

  const handleAirdrop = async () => {
    if (selectedUsers.size === 0) { toast.error(t.admin.selectUsersFirst); return; }
    const amount = parseFloat(airdropAmount);
    if (!amount || amount <= 0) { toast.error(t.admin.enterValidAmount); return; }
    try {
      const res = await adminApi.airdropTokens(Array.from(selectedUsers), amount);
      toast.success(`${t.admin.airdropped} ${amount} SMFI → ${res.airdropped} ${t.admin.toUsers} (${t.admin.totalDistributed}: ${res.totalDistributed} SMFI)`);
      setSelectedUsers(new Set());
      fetchStats();
    } catch (err: any) { toast.error(err?.message ?? t.admin.airdropFailed); }
  };

  const handleGrantToUser = async (userId: string) => {
    const amount = parseFloat(grantAmounts[userId] ?? "");
    if (!amount || amount <= 0) {
      toast.error(t.admin.enterValidAmount);
      return;
    }

    try {
      setGrantingUserId(userId);
      await adminApi.grantUserTokens(userId, amount, grantNotes[userId]?.trim() || undefined);
      toast.success(`${t.admin.grantSuccess}: ${amount} SMFI`);
      setGrantAmounts((prev) => ({ ...prev, [userId]: "" }));
      setGrantNotes((prev) => ({ ...prev, [userId]: "" }));
      fetchUsers(userPage, userSearch);
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message ?? t.admin.grantFailed);
    } finally {
      setGrantingUserId(null);
    }
  };

  const resetCreatorCodeForm = () => {
    setEditingCreatorCodeId(null);
    setCreatorCodeValue("");
    setCreatorCodeExpiresAt("");
    setCreatorCodeMaxRedemptions("");
    setCreatorCodeNotes("");
  };

  const handleCreatorCodeSearch = () => {
    setCreatorCodePage(1);
    fetchCreatorCodes(1, creatorCodeSearch, creatorCodeFilter);
  };

  const handleEditCreatorCode = (code: AdminCreatorCode) => {
    setEditingCreatorCodeId(code.id);
    setCreatorCodeValue(code.code);
    setCreatorCodeExpiresAt(toDateTimeLocalValue(code.expiresAt));
    setCreatorCodeMaxRedemptions(code.maxRedemptions != null ? String(code.maxRedemptions) : "");
    setCreatorCodeNotes(code.notes ?? "");
  };

  const handleSubmitCreatorCode = async () => {
    const maxRedemptions = creatorCodeMaxRedemptions.trim();
    const parsedMaxRedemptions = maxRedemptions ? Number(maxRedemptions) : null;

    if (parsedMaxRedemptions !== null && (!Number.isInteger(parsedMaxRedemptions) || parsedMaxRedemptions <= 0)) {
      toast.error(t.admin.enterValidAmount);
      return;
    }

    if (creatorCodeExpiresAt && Number.isNaN(new Date(creatorCodeExpiresAt).getTime())) {
      toast.error(t.admin.failed);
      return;
    }

    const expiresAt = creatorCodeExpiresAt ? new Date(creatorCodeExpiresAt).toISOString() : null;
    setCreatorCodeSubmitting(true);
    try {
      if (editingCreatorCodeId) {
        await adminApi.updateCreatorCode(editingCreatorCodeId, {
          expiresAt,
          maxRedemptions: parsedMaxRedemptions,
          notes: creatorCodeNotes.trim() || null,
        });
        toast.success(t.admin.creatorCodeUpdated);
      } else {
        const nextFilter = creatorCodeFilter === "inactive" ? "all" : creatorCodeFilter;
        await adminApi.createCreatorCode({
          code: creatorCodeValue.trim() || undefined,
          expiresAt,
          maxRedemptions: parsedMaxRedemptions,
          notes: creatorCodeNotes.trim() || undefined,
        });
        if (nextFilter !== creatorCodeFilter) {
          setCreatorCodeFilter(nextFilter);
        }
        toast.success(t.admin.creatorCodeCreated);
      }

      resetCreatorCodeForm();
      setCreatorCodePage(1);
      fetchCreatorCodes(1, creatorCodeSearch, creatorCodeFilter === "inactive" && !editingCreatorCodeId ? "all" : creatorCodeFilter);
    } catch (err: any) {
      toast.error(err?.message ?? t.admin.failed);
    } finally {
      setCreatorCodeSubmitting(false);
    }
  };

  const handleToggleCreatorCode = async (code: AdminCreatorCode) => {
    setCreatorCodeActionId(code.id);
    try {
      await adminApi.updateCreatorCode(code.id, { isActive: !code.isActive });
      toast.success(code.isActive ? t.admin.creatorCodeDeactivated : t.admin.creatorCodeActivated);
      fetchCreatorCodes(creatorCodePage, creatorCodeSearch, creatorCodeFilter);
    } catch (err: any) {
      toast.error(err?.message ?? t.admin.failed);
    } finally {
      setCreatorCodeActionId(null);
    }
  };

  const handleCopyCreatorCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t.admin.creatorCodeCopied);
    } catch {
      toast.error(t.admin.copyFailed);
    }
  };

  const handleRevokeCreatorCodeRedemption = async (redemptionId: string) => {
    const reason = window.prompt(t.admin.creatorCodeRevokePrompt);
    if (!reason?.trim()) return;

    setCreatorCodeActionId(redemptionId);
    try {
      await adminApi.revokeCreatorCodeRedemption(redemptionId, reason.trim());
      toast.success(t.admin.creatorCodeRevoked);
      fetchCreatorCodes(creatorCodePage, creatorCodeSearch, creatorCodeFilter);
      fetchUsers(userPage, userSearch);
    } catch (err: any) {
      toast.error(err?.message ?? t.admin.failed);
    } finally {
      setCreatorCodeActionId(null);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return t.admin.creatorCodeNever;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t.admin.creatorCodeNever;
    return parsed.toLocaleString();
  };

  const getCreatorCodeStatus = (code: AdminCreatorCode) => {
    const isExpired = !!code.expiresAt && new Date(code.expiresAt).getTime() < Date.now();
    const isExhausted = code.maxRedemptions != null && code.redemptionCount >= code.maxRedemptions;

    if (!code.isActive) {
      return { label: t.admin.creatorCodeStatusInactive, className: "text-slate-300 bg-slate-800 border-slate-700" };
    }
    if (isExpired) {
      return { label: t.admin.creatorCodeStatusExpired, className: "text-amber-300 bg-amber-500/10 border-amber-500/30" };
    }
    if (isExhausted) {
      return { label: t.admin.creatorCodeStatusExhausted, className: "text-red-300 bg-red-500/10 border-red-500/30" };
    }
    return { label: t.admin.creatorCodeStatusActive, className: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" };
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: t.admin.tabOverview, icon: <BarChart2 size={14} /> },
    { id: "users", label: t.admin.tabUsers, icon: <Users size={14} /> },
    { id: "campaigns", label: t.admin.tabCampaigns, icon: <ShoppingBag size={14} /> },
    { id: "creatorCodes", label: t.admin.tabCreatorCodes, icon: <Ticket size={14} /> },
    { id: "rewards", label: t.admin.tabRewards, icon: <Zap size={14} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.2),rgba(234,88,12,0.2))", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Crown size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t.admin.title}</h1>
            <p className="text-xs text-slate-400">{t.admin.subtitle}</p>
          </div>
          <button onClick={fetchStats} className="ml-auto text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${tab === t.id
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      {tab === "overview" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={t.admin.totalUsers} value={stats.users.total}
              sub={`${stats.users.verified} ${t.admin.verified}`}
              icon={<Users size={16} />} color="#22d3ee" />
            <StatCard label={t.admin.activeCampaigns} value={stats.campaigns.active}
              sub={`${stats.campaigns.total} ${t.admin.total}`}
              icon={<ShoppingBag size={16} />} color="#6366f1" />
            <StatCard label={t.admin.rewardsPaid} value={`${parseFloat(stats.rewards.totalPaid).toFixed(0)} SMFI`}
              sub={`${stats.rewards.pendingWithdrawals.count} ${t.admin.pendingWithdrawals}`}
              icon={<Zap size={16} />} color="#10b981" />
            <StatCard label={t.admin.revenue} value={`$${parseFloat(stats.revenue.totalFiat).toFixed(0)}`}
              sub={`${stats.posts.total} ${t.admin.activePosts}`}
              icon={<BarChart2 size={16} />} color="#f59e0b" />
          </div>

          {/* On-chain status */}
          <div className={`glass rounded-2xl p-4 border flex items-center gap-3 ${stats.onChainEnabled ? "border-emerald-500/20" : "border-amber-500/20"}`}>
            {stats.onChainEnabled
              ? <><CheckCircle size={16} className="text-emerald-400" /> <p className="text-sm text-slate-300">{t.admin.onChainEnabled} <strong className="text-emerald-400">{t.admin.enabled}</strong></p></>
              : <><AlertTriangle size={16} className="text-amber-400" /> <p className="text-sm text-slate-300">{t.admin.onChainEnabled} <strong className="text-amber-400">{t.admin.disabled}</strong> — {t.admin.onChainDisabledHint}</p></>}
          </div>

          {/* Pending withdrawals banner */}
          {stats.rewards.pendingWithdrawals.count > 0 && (
            <div className="glass rounded-2xl p-4 border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={15} className="text-amber-400" />
                <p className="text-sm text-slate-300">
                  <strong className="text-amber-400">{stats.rewards.pendingWithdrawals.count}</strong> {t.admin.queuedWithdrawals}
                  {t.admin.totalling} <strong className="text-white">{parseFloat(stats.rewards.pendingWithdrawals.amount).toFixed(2)} SMFI</strong>
                </p>
              </div>
              <button onClick={handleDistribute} disabled={distributing || !stats.onChainEnabled}
                className="text-xs font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 flex items-center gap-1.5 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
                {distributing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                {distributing ? t.admin.processing : t.admin.distributeNow}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── USERS ─────────────────────────────────────────────────────────── */}
      {tab === "users" && (
        <div className="space-y-3">
          {/* Search */}
          <div className="glass rounded-2xl p-3 border border-slate-700/10">
            <input value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
              onKeyDown={e => e.key === "Enter" && fetchUsers(1, userSearch)}
              placeholder={t.admin.searchPlaceholder}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
          </div>

          <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCw size={18} className="text-slate-500 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/20">
                      {["", t.admin.thUser, t.admin.thRole, t.admin.thBalance, t.admin.thPosts, t.admin.thVerified, t.admin.thJoined, t.admin.thActions].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-slate-700/10 hover:bg-slate-800/20 transition-colors">
                        <td className="px-3 py-3">
                          <input type="checkbox" checked={selectedUsers.has(u.id)}
                            onChange={e => { const s = new Set(selectedUsers); e.target.checked ? s.add(u.id) : s.delete(u.id); setSelectedUsers(s); }}
                            className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{u.displayName ?? u.username}</p>
                          <p className="text-slate-500 font-mono">@{u.username}</p>
                          {u.email && <p className="text-slate-600 truncate max-w-[140px]">{u.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${ROLE_COLORS[u.role] ?? ROLE_COLORS.USER}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-cyan-400">{parseFloat(u.offChainBalance).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-300">{u._count.posts}</td>
                        <td className="px-4 py-3">
                          {u.emailVerified
                            ? <CheckCircle size={13} className="text-emerald-400" />
                            : <XCircle size={13} className="text-slate-600" />}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-2 min-w-[220px]">
                            <select value={u.role}
                              onChange={e => handleUpdateRole(u.id, e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                              <option value="USER">USER</option>
                              <option value="MERCHANT">MERCHANT</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={grantAmounts[u.id] ?? ""}
                                onChange={e => setGrantAmounts(prev => ({ ...prev, [u.id]: e.target.value }))}
                                placeholder={t.admin.amount}
                                className="w-24 rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-white font-mono focus:outline-none"
                              />
                              <button
                                onClick={() => handleGrantToUser(u.id)}
                                disabled={grantingUserId === u.id}
                                className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#06b6d4,#6366f1)" }}
                              >
                                {grantingUserId === u.id ? t.admin.granting : t.admin.grantSmfi}
                              </button>
                            </div>
                            <input
                              value={grantNotes[u.id] ?? ""}
                              onChange={e => setGrantNotes(prev => ({ ...prev, [u.id]: e.target.value }))}
                              placeholder={t.admin.grantNotePlaceholder}
                              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/10">
              <span className="text-xs text-slate-500">{userTotal} {t.admin.totalUsersCount}</span>
              <div className="flex gap-2">
                <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">{t.admin.prev}</button>
                <span className="text-xs text-slate-400 self-center">{t.admin.pg} {userPage}</span>
                <button disabled={userPage * 20 >= userTotal} onClick={() => setUserPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">{t.admin.next}</button>
              </div>
            </div>
          </div>

          {/* Airdrop panel */}
          {selectedUsers.size > 0 && (
            <div className="glass rounded-2xl p-4 border border-indigo-500/20 flex items-center gap-3">
              <Gift size={16} className="text-indigo-400 flex-shrink-0" />
              <p className="text-sm text-slate-300 flex-1">
                <strong className="text-white">{selectedUsers.size}</strong> {t.admin.usersSelected}
              </p>
              <input type="number" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none"
                placeholder={t.admin.amount} />
              <span className="text-xs text-slate-400">{t.admin.smfiEach}</span>
              <button onClick={handleAirdrop}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                {t.admin.airdrop}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CAMPAIGNS ─────────────────────────────────────────────────────── */}
      {tab === "campaigns" && (
        <div className="space-y-3">
          <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-10"><RefreshCw size={18} className="text-slate-500 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/20">
                      {[t.admin.thCampaign, t.admin.thMerchant, t.admin.thStatus, t.admin.thBudget, t.admin.thRewardPool, t.admin.thImpressions, t.admin.thActions].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => {
                      const pct = c.impressionsTotal > 0 ? Math.round((c.impressionsDelivered / c.impressionsTotal) * 100) : 0;
                      return (
                        <tr key={c.id} className="border-b border-slate-700/10 hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3 max-w-[160px]">
                            <p className="font-semibold text-white truncate">{c.title}</p>
                            <p className="text-slate-600 font-mono">{c.id.slice(0, 8)}…</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-300">@{c.merchant.username}</p>
                            {c.merchant.email && <p className="text-slate-600 truncate max-w-[100px]">{c.merchant.email}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-md border text-xs font-semibold ${STATUS_COLORS[c.status] ?? STATUS_COLORS.DRAFT}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-white">${parseFloat(c.budget).toFixed(0)}</td>
                          <td className="px-4 py-3">
                            <p className="font-mono text-cyan-400">{parseFloat(c.rewardPoolDistributed).toFixed(0)}</p>
                            <p className="text-slate-600">/ {parseFloat(c.rewardPoolTotal).toFixed(0)} SMFI</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white">{c.impressionsDelivered.toLocaleString()} / {c.impressionsTotal.toLocaleString()}</p>
                            <div className="h-1 bg-slate-700 rounded-full mt-1 w-20">
                              <div className="h-1 bg-cyan-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {c.status === "ACTIVE" && (
                                <button onClick={() => handleUpdateCampaignStatus(c.id, "PAUSED")}
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all" title={t.admin.pause}>
                                  <Pause size={11} />
                                </button>
                              )}
                              {c.status === "PAUSED" && (
                                <button onClick={() => handleUpdateCampaignStatus(c.id, "ACTIVE")}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all" title={t.admin.activate}>
                                  <Play size={11} />
                                </button>
                              )}
                              {["ACTIVE", "PAUSED"].includes(c.status) && (
                                <button onClick={() => handleUpdateCampaignStatus(c.id, "CANCELLED")}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all" title={t.admin.cancel}>
                                  <Ban size={11} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/10">
              <span className="text-xs text-slate-500">{campaignTotal} {t.admin.totalCampaigns}</span>
              <div className="flex gap-2">
                <button disabled={campaignPage <= 1} onClick={() => setCampaignPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">{t.admin.prev}</button>
                <span className="text-xs text-slate-400 self-center">{t.admin.pg} {campaignPage}</span>
                <button disabled={campaignPage * 20 >= campaignTotal} onClick={() => setCampaignPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">{t.admin.next}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "creatorCodes" && (
        <div className="grid lg:grid-cols-[360px,1fr] gap-4">
          <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4 h-fit">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Ticket size={16} className="text-cyan-400" />
                  <h2 className="text-sm font-bold text-white">
                    {editingCreatorCodeId ? t.admin.creatorCodeEditTitle : t.admin.creatorCodeCreateTitle}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">{t.admin.creatorCodeCreateSubtitle}</p>
              </div>
              {editingCreatorCodeId && (
                <button
                  onClick={resetCreatorCodeForm}
                  className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  {t.admin.creatorCodeReset}
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">{t.admin.creatorCodeLabel}</label>
                <input
                  value={creatorCodeValue}
                  onChange={(e) => setCreatorCodeValue(e.target.value.toUpperCase())}
                  disabled={!!editingCreatorCodeId}
                  placeholder={t.admin.creatorCodePlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-60"
                />
                <p className="text-[11px] text-slate-500 mt-1">{editingCreatorCodeId ? t.admin.creatorCodeLockedHint : t.admin.creatorCodeHint}</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">{t.admin.creatorCodeExpiresLabel}</label>
                <input
                  type="datetime-local"
                  value={creatorCodeExpiresAt}
                  onChange={(e) => setCreatorCodeExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">{t.admin.creatorCodeMaxRedemptionsLabel}</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={creatorCodeMaxRedemptions}
                  onChange={(e) => setCreatorCodeMaxRedemptions(e.target.value)}
                  placeholder={t.admin.creatorCodeUnlimited}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">{t.admin.creatorCodeNotesLabel}</label>
                <textarea
                  value={creatorCodeNotes}
                  onChange={(e) => setCreatorCodeNotes(e.target.value)}
                  rows={4}
                  placeholder={t.admin.creatorCodeNotesPlaceholder}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <button
                onClick={handleSubmitCreatorCode}
                disabled={creatorCodeSubmitting}
                className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)" }}
              >
                {creatorCodeSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <Ticket size={15} />}
                {creatorCodeSubmitting
                  ? (editingCreatorCodeId ? t.admin.creatorCodeUpdating : t.admin.creatorCodeCreating)
                  : (editingCreatorCodeId ? t.admin.creatorCodeUpdateButton : t.admin.creatorCodeCreateButton)}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 border border-slate-700/10 space-y-3">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{t.admin.creatorCodesListTitle}</p>
                  <p className="text-xs text-slate-500">{creatorCodeTotal} {t.admin.creatorCodesCount}</p>
                </div>
                <button
                  onClick={() => fetchCreatorCodes(creatorCodePage, creatorCodeSearch, creatorCodeFilter)}
                  className="self-start md:self-auto text-slate-500 hover:text-white transition-colors"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <input
                  value={creatorCodeSearch}
                  onChange={(e) => setCreatorCodeSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreatorCodeSearch()}
                  placeholder={t.admin.creatorCodeSearchPlaceholder}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                />
                <select
                  value={creatorCodeFilter}
                  onChange={(e) => {
                    const next = e.target.value as CreatorCodeFilter;
                    setCreatorCodeFilter(next);
                    setCreatorCodePage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="all">{t.admin.creatorCodeFilterAll}</option>
                  <option value="active">{t.admin.creatorCodeFilterActive}</option>
                  <option value="inactive">{t.admin.creatorCodeFilterInactive}</option>
                </select>
                <button
                  onClick={handleCreatorCodeSearch}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#14b8a6)" }}
                >
                  {t.admin.creatorCodeSearchButton}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {creatorCodesLoading ? (
                <div className="glass rounded-2xl border border-slate-700/10 flex justify-center py-12">
                  <RefreshCw size={18} className="text-slate-500 animate-spin" />
                </div>
              ) : creatorCodes.length === 0 ? (
                <div className="glass rounded-2xl p-6 border border-slate-700/10 text-sm text-slate-400">
                  {t.admin.creatorCodeEmpty}
                </div>
              ) : creatorCodes.map((code) => {
                const status = getCreatorCodeStatus(code);
                return (
                  <div key={code.id} className="glass rounded-2xl p-4 border border-slate-700/10 space-y-4">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-white font-mono tracking-[0.08em]">{code.code}</p>
                          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span>{t.admin.creatorCodeUsageLabel}: <strong className="text-slate-200">{code.redemptionCount} / {code.maxRedemptions ?? t.admin.creatorCodeUnlimited}</strong></span>
                          <span>{t.admin.creatorCodeExpiresLabel}: <strong className="text-slate-200">{formatDateTime(code.expiresAt)}</strong></span>
                          <span>{t.admin.creatorCodeCreatedAtLabel}: <strong className="text-slate-200">{formatDateTime(code.createdAt)}</strong></span>
                          <span>{t.admin.creatorCodeUpdatedAtLabel}: <strong className="text-slate-200">{formatDateTime(code.updatedAt)}</strong></span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {t.admin.creatorCodeCreatedByLabel}: <strong className="text-slate-300">{code.createdBy?.displayName ?? code.createdBy?.username ?? "-"}</strong>
                        </p>
                        {code.notes && <p className="text-sm text-slate-300">{code.notes}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleCopyCreatorCode(code.code)}
                          className="px-3 py-1.5 rounded-lg text-xs border border-cyan-500/20 text-cyan-300 hover:text-white hover:border-cyan-400/40 transition-colors flex items-center gap-1.5"
                        >
                          <Copy size={12} />
                          {t.admin.creatorCodeCopyButton}
                        </button>
                        <button
                          onClick={() => handleEditCreatorCode(code)}
                          className="px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          {t.admin.creatorCodeEditButton}
                        </button>
                        <button
                          onClick={() => handleToggleCreatorCode(code)}
                          disabled={creatorCodeActionId === code.id}
                          className="px-3 py-1.5 rounded-lg text-xs border border-amber-500/20 text-amber-300 hover:text-white hover:border-amber-400/40 transition-colors disabled:opacity-50"
                        >
                          {creatorCodeActionId === code.id ? t.admin.processing : (code.isActive ? t.admin.creatorCodeDeactivateButton : t.admin.activate)}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-700/20 bg-slate-900/35 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-slate-300">{t.admin.creatorCodeRecentRedemptions}</p>
                        <p className="text-[11px] text-slate-500">{code.redemptions.length}</p>
                      </div>

                      {code.redemptions.length === 0 ? (
                        <p className="text-xs text-slate-500">{t.admin.creatorCodeNoRedemptions}</p>
                      ) : code.redemptions.map((redemption) => (
                        <div key={redemption.id} className="rounded-xl border border-slate-700/20 bg-slate-950/30 p-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{redemption.user.displayName ?? redemption.user.username}</p>
                            <p className="text-xs text-slate-500">@{redemption.user.username}{redemption.user.email ? ` • ${redemption.user.email}` : ""}</p>
                            <p className="text-xs text-slate-400 mt-1">{formatDateTime(redemption.redeemedAt)}</p>
                            {redemption.revokeReason && (
                              <p className="text-xs text-red-300 mt-1">{redemption.revokeReason}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${redemption.revokedAt
                              ? "text-red-300 bg-red-500/10 border-red-500/30"
                              : "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"}`}>
                              {redemption.revokedAt ? t.admin.creatorCodeRedemptionRevoked : t.admin.creatorCodeRedemptionActive}
                            </span>
                            {!redemption.revokedAt && (
                              <button
                                onClick={() => handleRevokeCreatorCodeRedemption(redemption.id)}
                                disabled={creatorCodeActionId === redemption.id}
                                className="px-3 py-1.5 rounded-lg text-xs border border-red-500/20 text-red-300 hover:text-white hover:border-red-400/40 transition-colors disabled:opacity-50"
                              >
                                {creatorCodeActionId === redemption.id ? t.admin.processing : t.admin.creatorCodeRevokeButton}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500">{creatorCodeTotal} {t.admin.creatorCodesCount}</span>
              <div className="flex gap-2">
                <button
                  disabled={creatorCodePage <= 1}
                  onClick={() => setCreatorCodePage((page) => page - 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
                >
                  {t.admin.prev}
                </button>
                <span className="text-xs text-slate-400 self-center">{t.admin.pg} {creatorCodePage}</span>
                <button
                  disabled={creatorCodePage * CREATOR_CODES_PAGE_SIZE >= creatorCodeTotal}
                  onClick={() => setCreatorCodePage((page) => page + 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
                >
                  {t.admin.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REWARDS ───────────────────────────────────────────────────────── */}
      {tab === "rewards" && stats && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label={t.admin.totalRewardsPaid} value={`${parseFloat(stats.rewards.totalPaid).toFixed(0)} SMFI`}
              icon={<Zap size={16} />} color="#10b981" />
            <StatCard label={t.admin.pendingWithdrawalsLabel}
              value={stats.rewards.pendingWithdrawals.count}
              sub={`${parseFloat(stats.rewards.pendingWithdrawals.amount).toFixed(2)} ${t.admin.smfiQueued}`}
              icon={<ArrowUpRight size={16} />} color="#f59e0b" />
          </div>

          {/* Distribute button */}
          <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">{t.admin.batchTitle}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {t.admin.batchDesc}
                </p>
              </div>
            </div>

            {!stats.onChainEnabled && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300">{t.admin.onChainNotConfigured}</p>
              </div>
            )}

            <button onClick={handleDistribute} disabled={distributing || !stats.onChainEnabled}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
              {distributing ? <><RefreshCw size={15} className="animate-spin" /> {t.admin.processingBatch}</> : <><Zap size={15} /> {t.admin.runBatch}</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

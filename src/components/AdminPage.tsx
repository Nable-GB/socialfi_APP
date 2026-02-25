import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../lib/api";
import {
  Users, BarChart2, Zap, ShoppingBag, RefreshCw,
  Shield, CheckCircle, XCircle, ArrowUpRight, Gift, Play, Pause, Ban,
  AlertTriangle, Crown
} from "lucide-react";
import { toast } from "sonner";

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

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "campaigns" | "rewards";

export function AdminPage() {
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
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

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

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === "users") fetchUsers(userPage, userSearch); }, [tab, userPage, fetchUsers]);
  useEffect(() => { if (tab === "campaigns") fetchCampaigns(campaignPage); }, [tab, campaignPage, fetchCampaigns]);

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast.success(`Role updated to ${role}`);
      fetchUsers(userPage, userSearch);
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
  };

  const handleUpdateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await adminApi.updateCampaignStatus(campaignId, status);
      toast.success(`Campaign ${status.toLowerCase()}`);
      fetchCampaigns(campaignPage);
      fetchStats();
    } catch (err: any) { toast.error(err?.message ?? "Failed"); }
  };

  const handleDistribute = async () => {
    setDistributing(true);
    try {
      const res = await adminApi.distributeRewards();
      toast.success(`Distributed ${res.distributed} / ${res.processed} withdrawals`);
      if (res.failed > 0) toast.error(`${res.failed} failed`);
      fetchStats();
    } catch (err: any) { toast.error(err?.message ?? "Distribution failed"); }
    finally { setDistributing(false); }
  };

  const handleAirdrop = async () => {
    if (selectedUsers.size === 0) { toast.error("Select users first"); return; }
    const amount = parseFloat(airdropAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      const res = await adminApi.airdropTokens(Array.from(selectedUsers), amount);
      toast.success(`Airdropped ${amount} SFT to ${res.airdropped} users (total: ${res.totalDistributed} SFT)`);
      setSelectedUsers(new Set());
      fetchStats();
    } catch (err: any) { toast.error(err?.message ?? "Airdrop failed"); }
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BarChart2 size={14} /> },
    { id: "users", label: "Users", icon: <Users size={14} /> },
    { id: "campaigns", label: "Campaigns", icon: <ShoppingBag size={14} /> },
    { id: "rewards", label: "Rewards", icon: <Zap size={14} /> },
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
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-slate-400">Platform management &amp; monitoring</p>
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
            <StatCard label="Total Users" value={stats.users.total}
              sub={`${stats.users.verified} verified`}
              icon={<Users size={16} />} color="#22d3ee" />
            <StatCard label="Active Campaigns" value={stats.campaigns.active}
              sub={`${stats.campaigns.total} total`}
              icon={<ShoppingBag size={16} />} color="#6366f1" />
            <StatCard label="Rewards Paid" value={`${parseFloat(stats.rewards.totalPaid).toFixed(0)} SFT`}
              sub={`${stats.rewards.pendingWithdrawals.count} pending withdrawals`}
              icon={<Zap size={16} />} color="#10b981" />
            <StatCard label="Revenue" value={`$${parseFloat(stats.revenue.totalFiat).toFixed(0)}`}
              sub={`${stats.posts.total} active posts`}
              icon={<BarChart2 size={16} />} color="#f59e0b" />
          </div>

          {/* On-chain status */}
          <div className={`glass rounded-2xl p-4 border flex items-center gap-3 ${stats.onChainEnabled ? "border-emerald-500/20" : "border-amber-500/20"}`}>
            {stats.onChainEnabled
              ? <><CheckCircle size={16} className="text-emerald-400" /> <p className="text-sm text-slate-300">On-chain transfers <strong className="text-emerald-400">enabled</strong></p></>
              : <><AlertTriangle size={16} className="text-amber-400" /> <p className="text-sm text-slate-300">On-chain transfers <strong className="text-amber-400">disabled</strong> — set <code className="text-xs bg-slate-800 px-1 rounded">RPC_URL</code>, <code className="text-xs bg-slate-800 px-1 rounded">TOKEN_CONTRACT_ADDRESS</code>, <code className="text-xs bg-slate-800 px-1 rounded">OPERATOR_PRIVATE_KEY</code> to enable</p></>}
          </div>

          {/* Pending withdrawals banner */}
          {stats.rewards.pendingWithdrawals.count > 0 && (
            <div className="glass rounded-2xl p-4 border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight size={15} className="text-amber-400" />
                <p className="text-sm text-slate-300">
                  <strong className="text-amber-400">{stats.rewards.pendingWithdrawals.count}</strong> queued withdrawals
                  totalling <strong className="text-white">{parseFloat(stats.rewards.pendingWithdrawals.amount).toFixed(2)} SFT</strong>
                </p>
              </div>
              <button onClick={handleDistribute} disabled={distributing || !stats.onChainEnabled}
                className="text-xs font-bold px-4 py-2 rounded-xl text-white disabled:opacity-40 flex items-center gap-1.5 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
                {distributing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                {distributing ? "Processing..." : "Distribute Now"}
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
              placeholder="Search username, email…"
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
                      {["", "User", "Role", "Balance", "Posts", "Verified", "Joined", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
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
                          <select value={u.role}
                            onChange={e => handleUpdateRole(u.id, e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                            <option value="USER">USER</option>
                            <option value="MERCHANT">MERCHANT</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/10">
              <span className="text-xs text-slate-500">{userTotal} total users</span>
              <div className="flex gap-2">
                <button disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">Prev</button>
                <span className="text-xs text-slate-400 self-center">pg {userPage}</span>
                <button disabled={userPage * 20 >= userTotal} onClick={() => setUserPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">Next</button>
              </div>
            </div>
          </div>

          {/* Airdrop panel */}
          {selectedUsers.size > 0 && (
            <div className="glass rounded-2xl p-4 border border-indigo-500/20 flex items-center gap-3">
              <Gift size={16} className="text-indigo-400 flex-shrink-0" />
              <p className="text-sm text-slate-300 flex-1">
                <strong className="text-white">{selectedUsers.size}</strong> users selected
              </p>
              <input type="number" value={airdropAmount} onChange={e => setAirdropAmount(e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:outline-none"
                placeholder="Amount" />
              <span className="text-xs text-slate-400">SFT each</span>
              <button onClick={handleAirdrop}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                Airdrop
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
                      {["Campaign", "Merchant", "Status", "Budget", "Reward Pool", "Impressions", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-slate-400 font-medium">{h}</th>
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
                            <p className="text-slate-600">/ {parseFloat(c.rewardPoolTotal).toFixed(0)} SFT</p>
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
                                  className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all" title="Pause">
                                  <Pause size={11} />
                                </button>
                              )}
                              {c.status === "PAUSED" && (
                                <button onClick={() => handleUpdateCampaignStatus(c.id, "ACTIVE")}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all" title="Activate">
                                  <Play size={11} />
                                </button>
                              )}
                              {["ACTIVE", "PAUSED"].includes(c.status) && (
                                <button onClick={() => handleUpdateCampaignStatus(c.id, "CANCELLED")}
                                  className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all" title="Cancel">
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
              <span className="text-xs text-slate-500">{campaignTotal} total campaigns</span>
              <div className="flex gap-2">
                <button disabled={campaignPage <= 1} onClick={() => setCampaignPage(p => p - 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">Prev</button>
                <span className="text-xs text-slate-400 self-center">pg {campaignPage}</span>
                <button disabled={campaignPage * 20 >= campaignTotal} onClick={() => setCampaignPage(p => p + 1)}
                  className="px-3 py-1 rounded-lg text-xs border border-slate-700 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">Next</button>
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
            <StatCard label="Total Rewards Paid" value={`${parseFloat(stats.rewards.totalPaid).toFixed(0)} SFT`}
              icon={<Zap size={16} />} color="#10b981" />
            <StatCard label="Pending Withdrawals"
              value={stats.rewards.pendingWithdrawals.count}
              sub={`${parseFloat(stats.rewards.pendingWithdrawals.amount).toFixed(2)} SFT queued`}
              icon={<ArrowUpRight size={16} />} color="#f59e0b" />
          </div>

          {/* Distribute button */}
          <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
            <div className="flex items-start gap-3">
              <Shield size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Batch Token Distribution</p>
                <p className="text-xs text-slate-400 mt-1">
                  Process all queued (<code className="text-amber-400">CONFIRMED</code>) withdrawal requests in batch.
                  Up to 50 per run. Tokens are sent on-chain from the operator wallet.
                </p>
              </div>
            </div>

            {!stats.onChainEnabled && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-300">On-chain not configured. Set env vars to enable distribution.</p>
              </div>
            )}

            <button onClick={handleDistribute} disabled={distributing || !stats.onChainEnabled}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
              {distributing ? <><RefreshCw size={15} className="animate-spin" /> Processing batch...</> : <><Zap size={15} /> Run Batch Distribution</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { analyticsApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  BarChart2, TrendingUp, Users, Zap, Heart, MessageCircle,
  RefreshCw, Award, ArrowUpRight, Calendar
} from "lucide-react";

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function MiniChart({ data, color, label }: { data: { date: string; count?: number; amount?: number }[]; color: string; label: string }) {
  const values = data.map(d => d.count ?? d.amount ?? 0);
  const max = Math.max(...values, 1);

  return (
    <div className="glass rounded-2xl p-4 border border-slate-700/10">
      <p className="text-xs font-semibold text-slate-400 mb-3">{label}</p>
      <div className="flex items-end gap-[2px] h-16">
        {data.map((d, i) => {
          const val = d.count ?? d.amount ?? 0;
          const h = Math.max((val / max) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center group relative">
              <div className="w-full rounded-t-sm transition-all hover:opacity-80"
                style={{ height: `${h}%`, background: val > 0 ? color : "rgba(100,116,139,0.15)", minHeight: 2 }} />
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                <div className="px-2 py-1 rounded-lg text-xs font-mono whitespace-nowrap"
                  style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(100,116,139,0.3)", color }}>
                  {val.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Date labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-slate-600">{data[0]?.date?.slice(5)}</span>
        <span className="text-[9px] text-slate-600">{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
      {/* Total */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/10">
        <span className="text-xs text-slate-500">Total (30d)</span>
        <span className="text-sm font-bold font-mono" style={{ color }}>
          {values.reduce((a, b) => a + b, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass rounded-2xl p-4 border border-slate-700/10">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
        style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
        {icon}
      </div>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      <p className="text-xs font-semibold text-white mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type Tab = "personal" | "platform";

export function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("personal");
  const [myData, setMyData] = useState<any>(null);
  const [platformData, setPlatformData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMy = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getMyAnalytics();
      setMyData(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchPlatform = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getPlatformAnalytics();
      setPlatformData(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "personal") fetchMy();
    else if (tab === "platform" && isAdmin) fetchPlatform();
  }, [tab, fetchMy, fetchPlatform, isAdmin]);

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(34,211,238,0.2),rgba(16,185,129,0.2))", border: "1px solid rgba(34,211,238,0.3)" }}>
            <BarChart2 size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Analytics</h1>
            <p className="text-xs text-slate-400">Insights & performance metrics</p>
          </div>
          <button onClick={() => tab === "personal" ? fetchMy() : fetchPlatform()} className="ml-auto text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="flex gap-1.5">
          <button onClick={() => setTab("personal")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${tab === "personal" ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25" : "text-slate-500 border border-transparent"}`}>
            My Analytics
          </button>
          {isAdmin && (
            <button onClick={() => setTab("platform")}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${tab === "platform" ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "text-slate-500 border border-transparent"}`}>
              Platform
            </button>
          )}
        </div>
      </div>

      {/* ── PERSONAL ANALYTICS ─────────────────────── */}
      {tab === "personal" && myData && (
        <div className="space-y-4">
          {/* Overview cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Earned" value={`${parseFloat(myData.overview.totalEarned).toFixed(0)} SFT`}
              icon={<Zap size={14} />} color="#10b981" />
            <StatCard label="Balance" value={`${parseFloat(myData.overview.balance).toFixed(2)} SFT`}
              sub={`${parseFloat(myData.overview.totalWithdrawn).toFixed(0)} withdrawn`}
              icon={<ArrowUpRight size={14} />} color="#22d3ee" />
            <StatCard label="Posts" value={myData.overview.posts}
              sub={`${myData.overview.posts7d} this week`}
              icon={<BarChart2 size={14} />} color="#6366f1" />
            <StatCard label="Engagement" value={myData.overview.totalLikes + myData.overview.totalComments}
              sub={`${myData.overview.totalLikes} likes · ${myData.overview.totalComments} comments`}
              icon={<Heart size={14} />} color="#ef4444" />
          </div>

          {/* Social stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Followers" value={myData.overview.followers}
              icon={<Users size={14} />} color="#a855f7" />
            <StatCard label="Following" value={myData.overview.following}
              icon={<Users size={14} />} color="#6366f1" />
            <StatCard label="Referrals" value={myData.overview.referrals}
              icon={<Award size={14} />} color="#f59e0b" />
          </div>

          {/* Earnings chart */}
          {myData.earningsChart && (
            <MiniChart data={myData.earningsChart} color="#10b981" label="Daily Earnings (SFT) — Last 30 days" />
          )}

          {/* Reward breakdown */}
          {myData.rewardBreakdown && Object.keys(myData.rewardBreakdown).length > 0 && (
            <div className="glass rounded-2xl p-4 border border-slate-700/10">
              <p className="text-xs font-semibold text-slate-400 mb-3">Reward Breakdown (30d)</p>
              <div className="space-y-2">
                {Object.entries(myData.rewardBreakdown as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([type, amount]) => {
                  const total = Object.values(myData.rewardBreakdown as Record<string, number>).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  const color = type === "AD_VIEW" ? "#22d3ee" : type === "AD_ENGAGEMENT" ? "#6366f1" : type === "REFERRAL_BONUS" ? "#f59e0b" : "#94a3b8";
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-xs text-slate-400 flex-1">{type.replace(/_/g, " ")}</span>
                      <span className="text-xs font-mono text-white">{amount.toFixed(2)} SFT</span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top posts */}
          {myData.topPosts?.length > 0 && (
            <div className="glass rounded-2xl p-4 border border-slate-700/10">
              <p className="text-xs font-semibold text-slate-400 mb-3">Top Posts by Engagement</p>
              <div className="space-y-2">
                {myData.topPosts.map((post: any, i: number) => (
                  <div key={post.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/20 transition-colors">
                    <span className="text-xs font-mono text-slate-600 w-4">#{i + 1}</span>
                    <p className="text-xs text-slate-300 flex-1 truncate">{post.content}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                      <span className="flex items-center gap-1"><Heart size={10} className="text-red-400" />{post.likesCount}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={10} className="text-cyan-400" />{post.commentsCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member since */}
          <div className="glass rounded-2xl p-4 border border-slate-700/10 flex items-center gap-3">
            <Calendar size={14} className="text-slate-500" />
            <p className="text-xs text-slate-400">
              Member since <strong className="text-white">{new Date(myData.overview.memberSince).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</strong>
            </p>
          </div>
        </div>
      )}

      {/* ── PLATFORM ANALYTICS (admin) ─────────────── */}
      {tab === "platform" && platformData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={platformData.overview.totalUsers}
              sub={`+${platformData.overview.newUsers7d} this week`}
              icon={<Users size={14} />} color="#22d3ee" />
            <StatCard label="Total Posts" value={platformData.overview.totalPosts}
              sub={`+${platformData.overview.posts7d} this week`}
              icon={<BarChart2 size={14} />} color="#6366f1" />
            <StatCard label="Rewards Paid" value={`${parseFloat(platformData.overview.totalRewardsPaid).toFixed(0)} SFT`}
              sub={`${platformData.overview.rewardTransactions} txs`}
              icon={<Zap size={14} />} color="#10b981" />
            <StatCard label="Interactions" value={platformData.overview.totalInteractions.toLocaleString()}
              sub={`+${platformData.overview.interactions7d} this week`}
              icon={<TrendingUp size={14} />} color="#f59e0b" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Active Campaigns" value={platformData.overview.activeCampaigns}
              icon={<Award size={14} />} color="#a855f7" />
            <StatCard label="Total NFTs" value={platformData.overview.totalNfts}
              sub={`${platformData.overview.nftSales} sold`}
              icon={<BarChart2 size={14} />} color="#ec4899" />
            <StatCard label="Withdrawn" value={`${parseFloat(platformData.overview.totalWithdrawn).toFixed(0)} SFT`}
              sub={`${platformData.overview.withdrawalCount} txs`}
              icon={<ArrowUpRight size={14} />} color="#ef4444" />
            <StatCard label="New Users (30d)" value={platformData.overview.newUsers30d}
              icon={<Users size={14} />} color="#14b8a6" />
          </div>

          {/* Charts */}
          {platformData.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <MiniChart data={platformData.charts.signups} color="#22d3ee" label="Daily Signups (30d)" />
              <MiniChart data={platformData.charts.posts} color="#6366f1" label="Daily Posts (30d)" />
              <MiniChart data={platformData.charts.rewards} color="#10b981" label="Daily Rewards SFT (30d)" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

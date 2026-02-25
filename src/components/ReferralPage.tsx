import { useState, useEffect, useCallback } from "react";
import { referralApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Users, Copy, CheckCheck, Zap, Trophy, TrendingUp,
  RefreshCw, Share2, Crown, Star
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TierInfo {
  label: string; color: string; rate: number; bonus: number; minReferrals: number;
  nextTier: { label: string; color: string; rate: number; minReferrals: number } | null;
  progressToNext: number;
  referralsToNext: number;
}
interface ReferralStats {
  referralCode: string;
  referralLink: string;
  tier: TierInfo;
  totals: { referralCount: number; bonusEarned: string; bonusTransactions: number };
  referrals: { id: string; username: string; displayName?: string; avatarUrl?: string; createdAt: string; totalEarned: string; _count: { rewards: number } }[];
  recentBonuses: { id: string; amount: string; description: string; createdAt: string; sourceUser?: { id: string; username: string; displayName?: string } }[];
}
interface LeaderboardEntry {
  rank: number;
  user: { id: string; username: string; displayName?: string; avatarUrl?: string };
  referralCount: number;
  tier: { label: string; color: string; rate: number };
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  Bronze:   <Star size={14} />,
  Silver:   <Star size={14} />,
  Gold:     <Crown size={14} />,
  Platinum: <Crown size={14} />,
  Diamond:  <Zap size={14} />,
};

// ─── Tier Progress Bar ────────────────────────────────────────────────────────
function TierCard({ tier, referralCount }: { tier: TierInfo; referralCount: number }) {
  return (
    <div className="glass rounded-2xl p-5 border" style={{ borderColor: `${tier.color}30` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${tier.color}18`, border: `1px solid ${tier.color}30`, color: tier.color }}>
            {TIER_ICONS[tier.label] ?? <Star size={18} />}
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Tier</p>
            <p className="text-lg font-extrabold" style={{ color: tier.color }}>{tier.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Bonus Rate</p>
          <p className="text-2xl font-bold font-mono text-white">{(tier.rate * 100).toFixed(0)}%</p>
        </div>
      </div>

      {tier.nextTier ? (
        <>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{referralCount} referrals</span>
            <span>{tier.nextTier.minReferrals} for {tier.nextTier.label}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${tier.progressToNext}%`, background: `linear-gradient(90deg, ${tier.color}, ${tier.nextTier.color})` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {tier.referralsToNext} more referrals to reach <strong style={{ color: tier.nextTier.color }}>{tier.nextTier.label}</strong> ({(tier.nextTier.rate * 100).toFixed(0)}% rate)
          </p>
        </>
      ) : (
        <div className="flex items-center gap-2 mt-2">
          <div className="h-2 rounded-full flex-1 overflow-hidden" style={{ background: `${tier.color}30` }}>
            <div className="h-full rounded-full w-full" style={{ background: tier.color }} />
          </div>
          <span className="text-xs font-bold" style={{ color: tier.color }}>MAX TIER 🏆</span>
        </div>
      )}
    </div>
  );
}

// ─── Referral Link Box ────────────────────────────────────────────────────────
function ReferralLinkBox({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const copy = (text: string, type: "code" | "link") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === "code" ? "Referral code copied!" : "Referral link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join SocialFi!", text: "Earn SFT tokens by viewing ads!", url: link });
      } catch { /* user cancelled */ }
    } else {
      copy(link, "link");
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-3">
      <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
        <Share2 size={12} className="text-cyan-400" /> Your Referral Link
      </p>

      {/* Code */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30">
          <span className="text-xs text-slate-400">Code</span>
          <span className="font-mono font-bold text-white text-lg tracking-widest">{code}</span>
        </div>
        <button onClick={() => copy(code, "code")}
          className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/40 transition-all">
          {copied === "code" ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      {/* Link */}
      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 overflow-hidden">
          <p className="text-xs text-slate-400 truncate font-mono">{link}</p>
        </div>
        <button onClick={() => copy(link, "link")}
          className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-700/40 transition-all">
          {copied === "link" ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>

      <button onClick={share}
        className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#22d3ee,#6366f1)" }}>
        <Share2 size={13} /> Share Referral Link
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = "overview" | "referrals" | "bonuses" | "leaderboard";

export function ReferralPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await referralApi.getStats();
      setStats(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await referralApi.getLeaderboard();
      setLeaderboard(res.leaderboard);
    } catch { /* ignore */ }
  }, []);

  const fetchTiers = useCallback(async () => {
    try {
      const res = await referralApi.getTiers();
      setTiers(res.tiers);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); fetchTiers(); }, [fetchStats, fetchTiers]);
  useEffect(() => { if (tab === "leaderboard") fetchLeaderboard(); }, [tab, fetchLeaderboard]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "referrals", label: `Referrals (${stats?.totals.referralCount ?? 0})` },
    { id: "bonuses", label: "Bonus History" },
    { id: "leaderboard", label: "Leaderboard" },
  ];

  if (loading) return (
    <div className="flex justify-center py-20"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(34,211,238,0.2),rgba(99,102,241,0.2))", border: "1px solid rgba(34,211,238,0.3)" }}>
            <Users size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Referral Program</h1>
            <p className="text-xs text-slate-400">Invite friends, earn tiered bonuses forever</p>
          </div>
          <button onClick={fetchStats} className="ml-auto text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tab === t.id ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ─────────────────────────────── */}
      {tab === "overview" && stats && (
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Referrals", value: stats.totals.referralCount, color: "#22d3ee", icon: <Users size={16} /> },
              { label: "Bonus Earned", value: `${parseFloat(stats.totals.bonusEarned).toFixed(2)} SFT`, color: "#10b981", icon: <Zap size={16} /> },
              { label: "Bonus Txs", value: stats.totals.bonusTransactions, color: "#6366f1", icon: <TrendingUp size={16} /> },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-4 border border-slate-700/10">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
                <p className="text-lg font-bold font-mono text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tier card */}
          <TierCard tier={stats.tier} referralCount={stats.totals.referralCount} />

          {/* Referral link */}
          <ReferralLinkBox code={stats.referralCode} link={stats.referralLink} />

          {/* All tiers table */}
          <div className="glass rounded-2xl p-5 border border-slate-700/10">
            <p className="text-xs font-semibold text-slate-300 mb-4 flex items-center gap-1.5">
              <Trophy size={12} className="text-amber-400" /> Tier Breakdown
            </p>
            <div className="space-y-2">
              {tiers.map((t, i) => {
                const isActive = stats.tier.label === t.label;
                return (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? "border" : "border border-transparent opacity-60"}`}
                    style={isActive ? { borderColor: `${t.color}35`, background: `${t.color}0a` } : {}}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    <span className="text-xs font-bold w-16 flex-shrink-0" style={{ color: t.color }}>{t.label}</span>
                    <span className="text-xs text-slate-400 flex-1">{t.minReferrals}+ referrals</span>
                    <span className="text-xs font-mono font-bold text-white">{(t.rate * 100).toFixed(0)}%</span>
                    {t.bonus > 0 && <span className="text-xs text-amber-400 font-mono">+{t.bonus} SFT</span>}
                    {isActive && <span className="text-xs px-1.5 py-0.5 rounded-md font-bold" style={{ background: `${t.color}20`, color: t.color }}>YOU</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── REFERRALS LIST ───────────────────────── */}
      {tab === "referrals" && stats && (
        <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
          {stats.referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No referrals yet</p>
              <p className="text-xs text-slate-600 mt-1">Share your link to start earning bonuses</p>
            </div>
          ) : (
            stats.referrals.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/10 last:border-0 hover:bg-slate-800/20 transition-colors">
                <span className="text-xs font-mono text-slate-600 w-5 flex-shrink-0">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {(r.displayName ?? r.username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{r.displayName ?? r.username}</p>
                  <p className="text-xs text-slate-500">@{r.username} · {r._count.rewards} rewards</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-emerald-400">{parseFloat(r.totalEarned).toFixed(2)} SFT</p>
                  <p className="text-xs text-slate-600">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── BONUS HISTORY ────────────────────────── */}
      {tab === "bonuses" && stats && (
        <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
          {stats.recentBonuses.length === 0 ? (
            <div className="py-12 text-center">
              <Zap size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No bonus transactions yet</p>
            </div>
          ) : (
            stats.recentBonuses.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/10 last:border-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/20 flex-shrink-0">
                  <Zap size={13} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{b.description}</p>
                  {b.sourceUser && <p className="text-xs text-slate-500">from @{b.sourceUser.username}</p>}
                  <p className="text-xs text-slate-600">{new Date(b.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <p className="text-sm font-bold font-mono text-emerald-400 flex-shrink-0">
                  +{parseFloat(b.amount).toFixed(4)} SFT
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── LEADERBOARD ──────────────────────────── */}
      {tab === "leaderboard" && (
        <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy size={36} className="text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Leaderboard loading...</p>
            </div>
          ) : (
            leaderboard.map(entry => (
              <div key={entry.rank} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-700/10 last:border-0 hover:bg-slate-800/20 transition-colors">
                {/* Rank */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  entry.rank === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                  entry.rank === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                  entry.rank === 3 ? "bg-orange-600/20 text-orange-400 border border-orange-600/30" :
                  "bg-slate-800 text-slate-500 border border-slate-700/20"}`}>
                  {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                </div>

                {entry.user && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {(entry.user.displayName ?? entry.user.username)[0].toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{entry.user?.displayName ?? entry.user?.username}</p>
                  <p className="text-xs flex items-center gap-1" style={{ color: entry.tier.color }}>
                    {TIER_ICONS[entry.tier.label]} {entry.tier.label} · {(entry.tier.rate * 100).toFixed(0)}% rate
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{entry.referralCount}</p>
                  <p className="text-xs text-slate-500">referrals</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

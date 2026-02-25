import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRewards } from "../hooks/useRewards";
import { Copy, Award, Wallet, TrendingUp, Clock, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { ApiReward } from "../lib/api";
import { rewardsApi } from "../lib/api";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { balance, totalEarned } = useRewards();
  const [rewardHistory, setRewardHistory] = useState<ApiReward[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const displayBalance = parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const copyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast.success("Referral code copied! 📋");
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await rewardsApi.getHistory({ limit: 20 });
      setRewardHistory(res.rewards);
      setHistoryLoaded(true);
    } catch {
      toast.error("Failed to load reward history");
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-700/10">
        <div className="h-32 md:h-40 relative"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 70%, #22d3ee33 100%)" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
        </div>
        <div className="px-6 pb-6 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-slate-900 shadow-lg">
              {(user.displayName ?? user.username ?? "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.displayName ?? user.username}</h1>
                {user.role === "MERCHANT" && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">MERCHANT</span>
                )}
                {user.role === "ADMIN" && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">ADMIN</span>
                )}
              </div>
              <p className="text-sm text-slate-500 font-mono">@{user.username}</p>
            </div>
          </div>

          {user.bio && <p className="text-sm text-slate-300 mt-3">{user.bio}</p>}

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Balance", value: `${displayBalance} 🪙`, color: "#22d3ee", icon: Wallet },
              { label: "Total Earned", value: `${parseFloat(totalEarned).toFixed(2)}`, color: "#f59e0b", icon: TrendingUp },
              { label: "Posts", value: user._count?.posts?.toString() ?? "0", color: "#a855f7", icon: CheckCircle },
              { label: "Followers", value: user._count?.followers?.toString() ?? "0", color: "#10b981", icon: Award },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-slate-800/50 p-3 text-center border border-slate-700/10">
                <stat.icon size={15} className="mx-auto mb-1" style={{ color: stat.color }} />
                <p className="text-base font-bold font-mono text-white">{stat.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
          <Award size={15} className="text-amber-400" /> Your Referral Code
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/30">
            <span className="font-mono text-lg font-bold tracking-wider text-cyan-400">{user.referralCode}</span>
          </div>
          <button onClick={copyReferral}
            className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <Copy size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Share this code — both you and your friend earn bonus tokens when they sign up!</p>
      </div>

      {/* Wallet */}
      {user.walletAddress && (
        <div className="glass rounded-2xl p-5 border border-slate-700/10">
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Wallet size={15} className="text-indigo-400" /> Connected Wallet
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700/30">
              <span className="font-mono text-sm text-slate-300">{user.walletAddress}</span>
            </div>
            <a href={`https://etherscan.io/address/${user.walletAddress}`} target="_blank" rel="noopener noreferrer"
              className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-slate-400 hover:text-white transition-all">
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      )}

      {/* Reward History */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <Clock size={15} className="text-cyan-400" /> Reward History
          </h3>
          {!historyLoaded && (
            <button onClick={loadHistory} disabled={loadingHistory}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
              {loadingHistory ? <RefreshCw size={12} className="animate-spin" /> : null}
              {loadingHistory ? "Loading..." : "Load History"}
            </button>
          )}
        </div>

        {!historyLoaded ? (
          <p className="text-xs text-slate-500 text-center py-4">Click "Load History" to view your rewards</p>
        ) : rewardHistory.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">No rewards yet. Interact with sponsored posts to earn tokens!</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rewardHistory.map(reward => (
              <div key={reward.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-800/30 border border-slate-700/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-400">
                    <Award size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{reward.type.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-slate-500">{new Date(reward.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-amber-400">+{parseFloat(reward.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button onClick={logout}
        className="w-full py-3 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
        Sign Out
      </button>
    </div>
  );
}

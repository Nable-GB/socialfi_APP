import { useState, useEffect, useCallback } from "react";
import { rewardsApi, type ApiTransaction } from "../lib/api";
import { ArrowUpRight, ArrowDownLeft, Zap, Users, Gift, RefreshCw, ExternalLink, Filter } from "lucide-react";
import { WithdrawModal } from "./WithdrawModal";
import { useRewards } from "../hooks/useRewards";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; sign: string }> = {
  AD_VIEW:        { label: "Ad View",        icon: <Zap size={13} />,          color: "#22d3ee", sign: "+" },
  AD_ENGAGEMENT:  { label: "Engagement",     icon: <Zap size={13} />,          color: "#6366f1", sign: "+" },
  REFERRAL_BONUS: { label: "Referral",       icon: <Users size={13} />,         color: "#10b981", sign: "+" },
  AIRDROP:        { label: "Airdrop",        icon: <Gift size={13} />,          color: "#f59e0b", sign: "+" },
  SIGNUP_BONUS:   { label: "Signup Bonus",   icon: <Gift size={13} />,          color: "#a855f7", sign: "+" },
  WITHDRAWAL:     { label: "Withdrawal",     icon: <ArrowUpRight size={13} />,  color: "#ef4444", sign: "-" },
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
  CONFIRMED:   "bg-blue-500/15 text-blue-400 border-blue-500/25",
  DISTRIBUTED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  FAILED:      "bg-red-500/15 text-red-400 border-red-500/25",
};

function TxRow({ tx }: { tx: ApiTransaction }) {
  const cfg = TYPE_CONFIG[tx.type] ?? { label: tx.type, icon: <Zap size={13} />, color: "#64748b", sign: "+" };
  const absAmount = Math.abs(parseFloat(tx.amount));
  const isWithdrawal = tx.type === "WITHDRAWAL";

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-700/15 last:border-0">
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, color: cfg.color }}>
        {cfg.icon}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white">{cfg.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-md border font-medium ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.PENDING}`}>
            {tx.status.toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {tx.description ?? tx.relatedCampaign?.title ?? tx.relatedPost?.content?.slice(0, 40) ?? "—"}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Amount + tx link */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold font-mono ${isWithdrawal ? "text-red-400" : "text-emerald-400"}`}>
          {isWithdrawal ? "-" : "+"}{absAmount.toFixed(4)}
          <span className="text-xs text-slate-500 ml-0.5">SFT</span>
        </p>
        {tx.onChainTxHash && (
          <a href={`https://etherscan.io/tx/${tx.onChainTxHash}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-cyan-500 hover:text-cyan-300 flex items-center gap-0.5 justify-end mt-0.5">
            on-chain <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  );
}

const FILTER_TABS = [
  { id: undefined, label: "All" },
  { id: "AD_VIEW", label: "Views" },
  { id: "AD_ENGAGEMENT", label: "Engage" },
  { id: "REFERRAL_BONUS", label: "Referral" },
  { id: "WITHDRAWAL", label: "Withdrawals" },
] as const;

export function TransactionsPage() {
  const { balance, fetchBalance } = useRewards();
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState<{ minWithdrawal: number; maxWithdrawal: number }>({ minWithdrawal: 10, maxWithdrawal: 10000 });

  const loadTransactions = useCallback(async (type?: string, cursor?: string) => {
    if (!cursor) setLoading(true); else setLoadingMore(true);
    try {
      const res = await rewardsApi.getTransactions({ type, cursor, limit: 25 });
      setTransactions(prev => cursor ? [...prev, ...res.transactions] : res.transactions);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const loadBalance = useCallback(async () => {
    try {
      const res = await rewardsApi.getBalance();
      setBalanceInfo({ minWithdrawal: (res as any).minWithdrawal ?? 10, maxWithdrawal: (res as any).maxWithdrawal ?? 10000 });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setTransactions([]);
    setNextCursor(null);
    loadTransactions(filter);
    loadBalance();
  }, [filter, loadTransactions, loadBalance]);

  const balanceNum = parseFloat(balance) || 0;

  return (
    <div className="space-y-5">
      {/* Header + Withdraw button */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/30">
              <ArrowDownLeft size={20} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Transactions</h1>
              <p className="text-xs text-slate-400">Your complete token ledger</p>
            </div>
          </div>
          <button onClick={() => setWithdrawOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)", boxShadow: "0 4px 12px rgba(34,211,238,0.2)" }}>
            <ArrowUpRight size={13} /> Withdraw
          </button>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Balance", value: balanceNum.toFixed(2), color: "#22d3ee" },
            { label: "Total Earned", value: "—", color: "#10b981" },
            { label: "Withdrawn", value: "—", color: "#6366f1" },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-3 text-center border border-slate-700/20"
              style={{ background: "rgba(15,23,42,0.4)" }}>
              <p className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="glass rounded-2xl p-3 border border-slate-700/10">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter size={12} className="text-slate-500 flex-shrink-0 mr-1" />
          {FILTER_TABS.map(tab => (
            <button key={String(tab.id)} onClick={() => setFilter(tab.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === tab.id
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw size={20} className="text-slate-500 animate-spin" />
          </div>
        )}
        {!loading && transactions.length === 0 && (
          <div className="text-center py-12">
            <ArrowDownLeft size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No transactions yet</p>
            <p className="text-xs text-slate-600 mt-1">View sponsored posts to start earning SFT tokens</p>
          </div>
        )}
        {!loading && transactions.map(tx => <TxRow key={tx.id} tx={tx} />)}

        {hasMore && !loadingMore && (
          <button onClick={() => loadTransactions(filter, nextCursor ?? undefined)}
            className="w-full mt-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700/30 hover:border-slate-600/50 hover:text-white transition-all">
            Load more
          </button>
        )}
        {loadingMore && (
          <div className="flex justify-center pt-4">
            <RefreshCw size={16} className="text-slate-500 animate-spin" />
          </div>
        )}
      </div>

      <WithdrawModal
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        balance={balance}
        minWithdrawal={balanceInfo.minWithdrawal}
        maxWithdrawal={balanceInfo.maxWithdrawal}
        onSuccess={() => { fetchBalance(); loadTransactions(filter); }}
      />
    </div>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { rewardsApi } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { ArrowUpRight, Wallet, RefreshCw, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../contexts/LangContext";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: string;
  minWithdrawal?: number;
  maxWithdrawal?: number;
  onSuccess?: () => void;
}

type Step = "form" | "success";

export function WithdrawModal({ open, onOpenChange, balance, minWithdrawal = 10, maxWithdrawal = 10000, onSuccess }: WithdrawModalProps) {
  const { user } = useAuth();
  const { t } = useLang();
  const wallet = useWallet();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [result, setResult] = useState<{
    txHash: string | null;
    explorerUrl: string | null;
    status: string;
    walletAddress: string;
    amount: number;
    message: string;
  } | null>(null);

  const availableBalance = parseFloat(balance) || 0;
  const amountNum = parseFloat(amount) || 0;

  // Resolve wallet: connected MetaMask > stored on account
  const targetWallet = wallet.address || user?.walletAddress;

  const handleMax = () => setAmount(Math.min(availableBalance, maxWithdrawal).toFixed(4));

  const handleWithdraw = async () => {
    if (!amountNum || amountNum <= 0) { toast.error(t.withdraw.errInvalidAmount); return; }
    if (amountNum < minWithdrawal) { toast.error(`${t.withdraw.minPrefix} ${minWithdrawal} ${t.withdraw.tokens}`); return; }
    if (amountNum > maxWithdrawal) { toast.error(`${t.withdraw.maxPrefix} ${maxWithdrawal} ${t.withdraw.tokens}`); return; }
    if (amountNum > availableBalance) { toast.error(t.withdraw.errInsufficientBalance); return; }
    if (!targetWallet) { toast.error(t.withdraw.errNoWallet); return; }

    setLoading(true);
    try {
      const res = await rewardsApi.withdraw({
        amount: amountNum,
        walletAddress: targetWallet,
      });
      setResult(res);
      setStep("success");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message ?? t.withdraw.errFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => { setStep("form"); setAmount(""); setResult(null); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
              <ArrowUpRight size={14} className="text-white" />
            </div>
            {t.withdraw.title}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {t.withdraw.subtitle}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4 pt-1">
            {/* Balance display */}
            <div className="rounded-xl p-4 border border-slate-700/40"
              style={{ background: "rgba(34,211,238,0.05)" }}>
              <p className="text-xs text-slate-400 mb-1">{t.withdraw.availableBalance}</p>
              <p className="text-2xl font-bold font-mono text-cyan-400">
                {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                <span className="text-sm text-slate-400 ml-1">SFT</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-2">{t.withdraw.walletHelp}</p>
            </div>

            {/* Wallet display */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30">
              <Wallet size={13} className="text-slate-400 flex-shrink-0" />
              {targetWallet ? (
                <span className="text-xs font-mono text-slate-300 truncate">
                  {targetWallet.slice(0, 8)}...{targetWallet.slice(-6)}
                </span>
              ) : (
                <span className="text-xs text-amber-400">{t.withdraw.noWallet}</span>
              )}
            </div>

            {/* Amount input */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">{t.withdraw.amountLabel}</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`${t.withdraw.minShort} ${minWithdrawal}`}
                  min={minWithdrawal}
                  max={Math.min(availableBalance, maxWithdrawal)}
                  step="0.0001"
                  className="w-full px-4 py-3 pr-20 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-600 font-mono"
                />
                <button onClick={handleMax}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-slate-700/60 px-2 py-0.5 rounded-md">
                  {t.withdraw.maxShort}
                </button>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-600">{t.withdraw.minShort}: {minWithdrawal} SFT</span>
                <span className="text-xs text-slate-600">{t.withdraw.maxShort}: {maxWithdrawal.toLocaleString()} SFT</span>
              </div>
            </div>

            {/* Warning */}
            {!targetWallet && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300">{t.withdraw.linkWallet}</p>
              </div>
            )}

            {/* Submit */}
            <button onClick={handleWithdraw} disabled={loading || !targetWallet || !amountNum}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)", boxShadow: "0 4px 15px rgba(34,211,238,0.2)" }}>
              {loading ? <><RefreshCw size={14} className="animate-spin" /> {t.withdraw.processing}</> : <><ArrowUpRight size={14} /> {t.withdraw.btnWithdraw}{amountNum > 0 ? ` ${amountNum} SFT` : ""}</>}
            </button>
          </div>
        )}

        {step === "success" && result && (
          <div className="space-y-4 pt-1 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto"
              style={{ border: "2px solid rgba(16,185,129,0.3)" }}>
              <CheckCircle size={32} className="text-emerald-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{result.status === "distributed" ? `${t.withdraw.sentTitle} 🎉` : t.withdraw.queuedTitle}</h3>
              <p className="text-xs text-slate-400 mt-1">{result.message}</p>
            </div>

            <div className="rounded-xl p-4 border border-slate-700/30 bg-slate-800/40 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t.withdraw.amount}</span>
                <span className="font-mono font-bold text-cyan-400">{result.amount} SFT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t.withdraw.to}</span>
                <span className="font-mono text-white">{result.walletAddress.slice(0, 8)}...{result.walletAddress.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">{t.withdraw.status}</span>
                <span className={`font-semibold ${result.status === "distributed" ? "text-emerald-400" : "text-amber-400"}`}>
                  {result.status === "distributed" ? `${t.withdraw.onChain} ✅` : `${t.withdraw.queued} ⏳`}
                </span>
              </div>
              {result.txHash && (
                <div className="flex justify-between text-xs items-center">
                  <span className="text-slate-400">{t.withdraw.txHash}</span>
                  <a href={result.explorerUrl ?? "#"} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                    {result.txHash.slice(0, 8)}...{result.txHash.slice(-6)}
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            <button onClick={handleClose}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
              {t.withdraw.done}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

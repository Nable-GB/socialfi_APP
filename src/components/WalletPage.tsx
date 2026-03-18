import { useState, useEffect, useCallback } from "react";
import { parseEther, formatEther, BrowserProvider, isAddress } from "ethers";
import {
  Wallet, Copy, ExternalLink, Send,
  CheckCircle, ArrowDownLeft, ArrowUpRight,
  Loader2, Repeat
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { useRewards } from "../hooks/useRewards";

const SEPOLIA_FAUCETS = [
  { name: "Alchemy Faucet", url: "https://sepoliafaucet.com/" },
  { name: "Google Faucet",  url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
  { name: "Infura Faucet",  url: "https://www.infura.io/faucet/sepolia" },
];

const EXCHANGE_RATE = 1000; // 1 ETH = 1000 SMFI

interface TxRecord {
  hash: string;
  type: "send" | "swap";
  amount: string;
  to?: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  details?: string;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function WalletPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const wallet = useWallet();
  const { balance: smfiBalance, fetchBalance: refreshSmfi } = useRewards();

  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  
  // Send state
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  
  // Swap state
  const [swapAmount, setSwapAmount] = useState("");
  const [swapDirection, setSwapDirection] = useState<"ETH_TO_SMFI" | "SMFI_TO_ETH">("ETH_TO_SMFI");
  const [swapping, setSwapping] = useState(false);

  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "send" | "swap" | "history">("overview");

  const refreshEthBalance = useCallback(async () => {
    if (!wallet.address || !window.ethereum) return;
    setLoadingBal(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(wallet.address);
      setEthBalance(parseFloat(formatEther(bal)).toFixed(6));
    } catch {
      toast.error(t.wallet.failedToFetchEth);
    } finally {
      setLoadingBal(false);
    }
  }, [wallet.address, t.wallet.failedToFetchEth]);

  useEffect(() => {
    if (wallet.address) refreshEthBalance();
    if (isAuthenticated) refreshSmfi();
  }, [wallet.address, refreshEthBalance, isAuthenticated, refreshSmfi]);

  const handleSend = async () => {
    if (!wallet.address || !window.ethereum) { toast.error(t.wallet.connectFirst); return; }
    if (!isAddress(sendTo)) { toast.error(t.wallet.invalidAddress); return; }
    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) { toast.error(t.wallet.validAmount); return; }
    if (parseFloat(ethBalance ?? "0") < amt) { toast.error(t.wallet.insufficientEth); return; }

    setSending(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: sendTo,
        value: parseEther(sendAmount),
      });
      const record: TxRecord = {
        hash: tx.hash, type: "send", amount: sendAmount,
        to: sendTo, timestamp: Date.now(), status: "pending",
      };
      setTxHistory(prev => [record, ...prev]);
      toast.success(`${t.wallet.txSent} ${tx.hash.slice(0, 10)}...`);
      setSendTo(""); setSendAmount("");
      setTab("history");
      await tx.wait(1);
      setTxHistory(prev => prev.map(t => t.hash === tx.hash ? { ...t, status: "confirmed" } : t));
      toast.success(t.wallet.txConfirmed);
      refreshEthBalance();
    } catch (err: any) {
      if (err?.code === 4001) toast.error(t.wallet.rejectedByUser);
      else toast.error(err?.message ?? t.wallet.txFailed);
      setTxHistory(prev => prev.map(t => t.status === "pending" ? { ...t, status: "failed" } : t));
    } finally {
      setSending(false);
    }
  };

  const handleSwap = async () => {
    const amt = parseFloat(swapAmount);
    if (isNaN(amt) || amt <= 0) { toast.error(t.wallet.validAmount); return; }

    if (swapDirection === "ETH_TO_SMFI") {
      if (parseFloat(ethBalance ?? "0") < amt) { toast.error(t.wallet.insufficientEth); return; }
    } else {
      if (parseFloat(smfiBalance ?? "0") < amt) { toast.error(t.wallet.insufficientSmfi); return; }
    }

    setSwapping(true);
    try {
      // Simulate swap delay
      await new Promise(r => setTimeout(r, 2000));
      
      // In a real app, this would call a smart contract or backend swap endpoint
      toast.success(`${t.wallet.swapSuccess} ${amt} ${swapDirection === "ETH_TO_SMFI" ? "ETH" : "SMFI"}`);
      
      const record: TxRecord = {
        hash: `mock-swap-${Date.now()}`,
        type: "swap",
        amount: swapAmount,
        timestamp: Date.now(),
        status: "confirmed",
        details: swapDirection === "ETH_TO_SMFI" 
          ? t.wallet.swapHistoryEthToSmfi.replace("{0}", amt.toString()).replace("{1}", (amt * EXCHANGE_RATE).toString())
          : t.wallet.swapHistorySmfiToEth.replace("{0}", amt.toString()).replace("{1}", (amt / EXCHANGE_RATE).toString())
      };
      setTxHistory(prev => [record, ...prev]);
      setSwapAmount("");
      setTab("history");
      refreshEthBalance();
      refreshSmfi();
    } catch (err) {
      toast.error(t.wallet.swapFailed);
    } finally {
      setSwapping(false);
    }
  };

  const copyAddress = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success(t.wallet.addressCopied);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <Wallet size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">{t.wallet.loginToAccess}</h3>
      </div>
    );
  }

  if (!wallet.address) {
    return (
      <div className="max-w-lg mx-auto px-2 py-10 flex flex-col items-center gap-6 text-center">
        {/* ... (Connect wallet UI remains similar but improved) ... */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(6,182,212,0.25)" }}>
          <Wallet size={36} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">{t.wallet.connectYourWallet}</h2>
          <p className="text-sm text-slate-400">{t.wallet.connectMetaMaskDesc}</p>
        </div>
        <button
          onClick={() => wallet.connect().catch((e: any) => toast.error(e?.message ?? t.auth.connectionFailed))}
          disabled={wallet.isConnecting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}
        >
          {wallet.isConnecting
            ? <><Loader2 size={16} className="animate-spin" /> {t.wallet.connecting}</>
            : <><Wallet size={16} /> {t.wallet.connectMetaMask}</>}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-2 space-y-4">
      {/* Network Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {t.wallet.sepoliaTestnet}
          </div>
        </div>
      </div>

      {/* Balances Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* ETH Balance */}
        <div className="p-5 rounded-2xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.05))", border: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">Ξ</div>
              <span className="text-xs font-bold text-indigo-300">{t.wallet.ethereumSepolia}</span>
            </div>
            <div className="flex items-end gap-2">
              {loadingBal
                ? <Loader2 size={20} className="text-indigo-400 animate-spin mt-2" />
                : <span className="text-2xl font-black text-white font-mono">{ethBalance ?? "0.0000"}</span>
              }
              <span className="text-xs text-indigo-400 font-bold mb-1.5">ETH</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">{shortAddr(wallet.address)}</p>
          </div>
        </div>

        {/* SMFI Balance */}
        <div className="p-5 rounded-2xl relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(34,211,238,0.05))", border: "1px solid rgba(6,182,212,0.2)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">S</div>
              <span className="text-xs font-bold text-cyan-300">{t.wallet.smfiToken}</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white font-mono">{parseFloat(smfiBalance).toLocaleString()}</span>
              <span className="text-xs text-cyan-400 font-bold mb-1.5">SMFI</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{t.wallet.platformRewards}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
        {[
            ["overview", t.wallet.overview],
            ["send", t.wallet.sendEth],
            ["swap", t.wallet.swap],
            ["history", t.wallet.history]
        ].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.15)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{t.wallet.quickActions}</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setShowDeposit(true)} className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 flex flex-col items-center gap-2 transition-all">
                <ArrowDownLeft size={20} className="text-green-400" />
                <span className="text-xs text-slate-300">{t.wallet.deposit}</span>
              </button>
              <button onClick={() => setTab("send")} className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 flex flex-col items-center gap-2 transition-all">
                <Send size={20} className="text-cyan-400" />
                <span className="text-xs text-slate-300">{t.wallet.send}</span>
              </button>
              <button onClick={() => setTab("swap")} className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/30 flex flex-col items-center gap-2 transition-all">
                <Repeat size={20} className="text-purple-400" />
                <span className="text-xs text-slate-300">{t.wallet.swap}</span>
              </button>
            </div>
          </div>
          
          {showDeposit && (
            <div className="p-5 rounded-2xl space-y-4"
              style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-green-400 flex items-center gap-2 text-sm">
                  <ArrowDownLeft size={15} /> {t.wallet.depositSepolia}
                </h3>
                <button onClick={() => setShowDeposit(false)} className="text-slate-500 hover:text-white text-xl leading-none">x</button>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <span className="text-xs font-mono text-green-300 flex-1 break-all select-all">{wallet.address}</span>
                <button onClick={copyAddress}
                  className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-green-400 transition-colors">
                  {copied ? <CheckCircle size={15} className="text-green-400" /> : <Copy size={15} />}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SEPOLIA_FAUCETS.map(f => (
                  <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 hover:text-white transition-colors"
                    style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                    {f.name} <ExternalLink size={9} className="opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "send" && (
        <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(6,182,212,0.15)" }}>
          <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-sm"><Send size={14} /> {t.wallet.sendSepolia}</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t.wallet.recipientAddress}</label>
            <input type="text" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="0x..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">{t.wallet.amountEth}</label>
            <div className="flex gap-2">
              <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.001" min="0" step="0.0001"
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
              <button onClick={() => setSendAmount(ethBalance ?? "0")}
                className="px-3 py-2 rounded-xl text-xs font-bold text-cyan-400 hover:text-white transition-colors"
                style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>{t.wallet.max}</button>
            </div>
          </div>
          <button onClick={handleSend} disabled={sending || !sendTo || !sendAmount}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} /> {t.wallet.send}</>}
          </button>
        </div>
      )}

      {tab === "swap" && (
        <div className="p-5 rounded-2xl space-y-6" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-purple-400 flex items-center gap-2 text-sm"><Repeat size={14} /> {t.wallet.swapTokens}</h3>
            <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/30">
              {t.wallet.rate}: 1 ETH ≈ {EXCHANGE_RATE} SMFI
            </span>
          </div>

          <div className="relative">
            {/* From */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-slate-400">{t.wallet.from}</span>
                <span className="text-xs text-slate-500">
                  {t.wallet.balance}: {swapDirection === "ETH_TO_SMFI" ? ethBalance : parseFloat(smfiBalance).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={swapAmount}
                  onChange={e => setSwapAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-transparent text-xl font-bold text-white placeholder-slate-600 focus:outline-none"
                />
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-700/50 border border-slate-600/30">
                  {swapDirection === "ETH_TO_SMFI" 
                    ? <><div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">Ξ</div><span className="text-xs font-bold text-indigo-300">ETH</span></>
                    : <><div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">S</div><span className="text-xs font-bold text-cyan-300">SMFI</span></>
                  }
                </div>
              </div>
            </div>

            {/* Switch Button */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <button 
                onClick={() => setSwapDirection(d => d === "ETH_TO_SMFI" ? "SMFI_TO_ETH" : "ETH_TO_SMFI")}
                className="p-2 rounded-full bg-slate-800 border-2 border-slate-900 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg"
              >
                <ArrowDownLeft size={16} />
              </button>
            </div>

            {/* To */}
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 mt-2">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-slate-400">{t.wallet.toEstimated}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 text-xl font-bold text-slate-300">
                  {swapAmount ? (
                    swapDirection === "ETH_TO_SMFI" 
                      ? (parseFloat(swapAmount) * EXCHANGE_RATE).toFixed(2)
                      : (parseFloat(swapAmount) / EXCHANGE_RATE).toFixed(6)
                  ) : "0.0"}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-700/50 border border-slate-600/30">
                  {swapDirection === "SMFI_TO_ETH" 
                    ? <><div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px]">Ξ</div><span className="text-xs font-bold text-indigo-300">ETH</span></>
                    : <><div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">S</div><span className="text-xs font-bold text-cyan-300">SMFI</span></>
                  }
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSwap} disabled={swapping || !swapAmount}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)", color: "white" }}>
            {swapping ? <Loader2 size={16} className="animate-spin" /> : <><Repeat size={14} /> {t.wallet.swapNow}</>}
          </button>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {txHistory.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-slate-500 text-sm">{t.wallet.noTx}</p>
            </div>
          ) : (
            txHistory.map(tx => (
              <div key={tx.hash} className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === "swap" ? "bg-purple-500/10" : "bg-red-500/10"}`}>
                  {tx.type === "swap" ? <Repeat size={14} className="text-purple-400" /> : <ArrowUpRight size={14} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white capitalize">{tx.type === "swap" ? t.wallet.txTypeSwap : t.wallet.txTypeSend}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      tx.status === "confirmed" ? "bg-green-500/10 text-green-400" :
                      tx.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-red-500/10 text-red-400"}`}>{tx.status === "confirmed" ? t.wallet.statusConfirmed : tx.status === "pending" ? t.wallet.statusPending : t.wallet.statusFailed}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{tx.details || (tx.to ? `${t.wallet.sentTo} ${shortAddr(tx.to)}` : "")}</p>
                  <p className="text-[10px] text-slate-700 mt-0.5">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">{tx.amount}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

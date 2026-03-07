import { useState, useEffect, useCallback } from "react";
import { parseEther, formatEther, BrowserProvider, isAddress } from "ethers";
import {
  Wallet, Copy, ExternalLink, Send, RefreshCw,
  AlertTriangle, CheckCircle, ArrowDownLeft, ArrowUpRight,
  Loader2, Droplets, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../contexts/AuthContext";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";
const SEPOLIA_FAUCETS = [
  { name: "Alchemy Faucet", url: "https://sepoliafaucet.com/" },
  { name: "Google Faucet",  url: "https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
  { name: "Infura Faucet",  url: "https://www.infura.io/faucet/sepolia" },
];

interface TxRecord {
  hash: string;
  type: "send";
  amount: string;
  to: string;
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export function WalletPage() {
  const { isAuthenticated } = useAuth();
  const wallet = useWallet();

  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [loadingBal, setLoadingBal] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txHistory, setTxHistory] = useState<TxRecord[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "send" | "history">("overview");

  const refreshBalance = useCallback(async () => {
    if (!wallet.address || !window.ethereum) return;
    setLoadingBal(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(wallet.address);
      setEthBalance(parseFloat(formatEther(bal)).toFixed(6));
    } catch {
      toast.error("Failed to fetch balance");
    } finally {
      setLoadingBal(false);
    }
  }, [wallet.address]);

  useEffect(() => {
    if (wallet.address) refreshBalance();
  }, [wallet.address, refreshBalance]);

  const handleSend = async () => {
    if (!wallet.address || !window.ethereum) { toast.error("Connect wallet first"); return; }
    if (!isAddress(sendTo)) { toast.error("Invalid recipient address"); return; }
    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (parseFloat(ethBalance ?? "0") < amt) { toast.error("Insufficient ETH balance"); return; }

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
      toast.success(`Tx sent! ${tx.hash.slice(0, 10)}...`);
      setSendTo(""); setSendAmount("");
      setTab("history");
      await tx.wait(1);
      setTxHistory(prev => prev.map(t => t.hash === tx.hash ? { ...t, status: "confirmed" } : t));
      toast.success("Transaction confirmed!");
      refreshBalance();
    } catch (err: any) {
      if (err?.code === 4001) toast.error("Rejected by user");
      else toast.error(err?.message ?? "Transaction failed");
      setTxHistory(prev => prev.map(t => t.status === "pending" ? { ...t, status: "failed" } : t));
    } finally {
      setSending(false);
    }
  };

  const copyAddress = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    toast.success("Address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <Wallet size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">Login to access your wallet</h3>
      </div>
    );
  }

  if (!wallet.address) {
    return (
      <div className="max-w-lg mx-auto px-2 py-10 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(6,182,212,0.25)" }}>
          <Wallet size={36} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-slate-400">Connect MetaMask to view balance, deposit and send Sepolia ETH</p>
        </div>
        <div className="p-3 rounded-xl flex gap-2 w-full max-w-sm text-left"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            This wallet operates on <strong>Sepolia Testnet</strong>. All ETH here is test ETH with <strong>no real monetary value</strong>.
          </p>
        </div>
        <button
          onClick={() => wallet.connect().catch((e: any) => toast.error(e?.message ?? "Failed to connect"))}
          disabled={wallet.isConnecting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}
        >
          {wallet.isConnecting
            ? <><Loader2 size={16} className="animate-spin" /> Connecting...</>
            : <><Wallet size={16} /> Connect MetaMask</>}
        </button>
        <div>
          <p className="text-[11px] text-slate-500 mb-2">Need free Sepolia ETH for testing?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {SEPOLIA_FAUCETS.map(f => (
              <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-cyan-400 hover:text-white transition-colors"
                style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>
                <Droplets size={10} /> {f.name} <ExternalLink size={9} className="opacity-60" />
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-2 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Sepolia Testnet
        </div>
        <span className="text-[10px] text-slate-600">Test ETH only — no real value</span>
      </div>

      <div className="p-5 rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(6,182,212,0.2)" }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Sepolia ETH Balance</p>
            <div className="flex items-end gap-2">
              {loadingBal
                ? <Loader2 size={20} className="text-cyan-400 animate-spin mt-2" />
                : <span className="text-3xl font-black text-white font-mono">{ethBalance ?? "0.000000"}</span>
              }
              <span className="text-sm text-cyan-400 font-bold mb-1">ETH</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1.5 font-mono break-all">{wallet.address}</p>
          </div>
          <button onClick={refreshBalance} disabled={loadingBal}
            className="p-2 rounded-xl text-slate-500 hover:text-cyan-400 transition-colors hover:bg-slate-800/60">
            <RefreshCw size={15} className={loadingBal ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDeposit(v => !v)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
            <ArrowDownLeft size={15} /> Deposit
          </button>
          <button onClick={() => setTab("send")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)", color: "#22d3ee" }}>
            <ArrowUpRight size={15} /> Send
          </button>
          <a href={`${SEPOLIA_EXPLORER}/address/${wallet.address}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {showDeposit && (
        <div className="p-5 rounded-2xl space-y-4"
          style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(34,197,94,0.25)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-green-400 flex items-center gap-2 text-sm">
              <ArrowDownLeft size={15} /> Deposit Sepolia ETH
            </h3>
            <button onClick={() => setShowDeposit(false)} className="text-slate-500 hover:text-white text-xl leading-none">x</button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Send Sepolia ETH from any Sepolia wallet to your address below. It will appear after block confirmation.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <span className="text-xs font-mono text-green-300 flex-1 break-all select-all">{wallet.address}</span>
            <button onClick={copyAddress}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-green-400 transition-colors">
              {copied ? <CheckCircle size={15} className="text-green-400" /> : <Copy size={15} />}
            </button>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-2">Get free Sepolia ETH from faucets:</p>
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
          <div className="flex items-start gap-2 text-[11px] text-amber-400/80 p-2.5 rounded-lg"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            Only send Sepolia ETH here. Sending mainnet ETH will result in permanent loss.
          </div>
          <button onClick={refreshBalance} disabled={loadingBal}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            style={{ background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.15)" }}>
            <RefreshCw size={12} className={loadingBal ? "animate-spin" : ""} /> Refresh Balance
          </button>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
        {([["overview","Overview"],["send","Send ETH"],["history",`History (${txHistory.length})`]] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === id ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
              <p className="text-[11px] text-slate-500 mb-0.5">Network</p>
              <p className="text-sm font-bold text-indigo-400">Sepolia Testnet</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Chain ID: 11155111</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
              <p className="text-[11px] text-slate-500 mb-0.5">This Session</p>
              <p className="text-sm font-bold text-white">{txHistory.length} Tx</p>
              <p className="text-[10px] text-slate-600 mt-0.5">{txHistory.filter(t => t.status === "confirmed").length} confirmed</p>
            </div>
          </div>
          <a href={`${SEPOLIA_EXPLORER}/address/${wallet.address}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-3.5 rounded-xl transition-all group hover:border-cyan-500/20"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
            <span className="text-xs text-slate-400 group-hover:text-white transition-colors">View full history on Etherscan</span>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
          </a>
        </div>
      )}

      {tab === "send" && (
        <div className="p-5 rounded-2xl space-y-4" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(6,182,212,0.15)" }}>
          <h3 className="font-bold text-cyan-400 flex items-center gap-2 text-sm"><Send size={14} /> Send Sepolia ETH</h3>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Recipient Address</label>
            <input type="text" value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="0x..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono" />
            {sendTo && !isAddress(sendTo) && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> Invalid Ethereum address</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (ETH)</label>
            <div className="flex gap-2">
              <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="0.001" min="0" step="0.0001"
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50" />
              <button onClick={() => setSendAmount(ethBalance ?? "0")}
                className="px-3 py-2 rounded-xl text-xs font-bold text-cyan-400 hover:text-white transition-colors"
                style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)" }}>MAX</button>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">Available: <span className="text-cyan-500 font-mono">{ethBalance ?? "0"} ETH</span></p>
          </div>
          <div className="p-3 rounded-xl text-[11px] text-amber-300/80 flex gap-2"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <AlertTriangle size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            MetaMask will open for confirmation. Gas fee deducted automatically.
          </div>
          <button onClick={handleSend} disabled={sending || !sendTo || !sendAmount || !isAddress(sendTo)}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", color: "white" }}>
            {sending ? <><Loader2 size={16} className="animate-spin" /> Waiting for MetaMask...</> : <><Send size={14} /> Send ETH</>}
          </button>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {txHistory.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <p className="text-slate-500 text-sm">No transactions this session</p>
              <a href={`${SEPOLIA_EXPLORER}/address/${wallet.address}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                <ExternalLink size={12} /> View all history on Etherscan
              </a>
            </div>
          ) : (
            txHistory.map(tx => (
              <div key={tx.hash} className="flex items-center gap-3 p-3.5 rounded-xl"
                style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(100,116,139,0.1)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/10">
                  <ArrowUpRight size={14} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Send</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      tx.status === "confirmed" ? "bg-green-500/10 text-green-400" :
                      tx.status === "pending" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-red-500/10 text-red-400"}`}>{tx.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">to {shortAddr(tx.to)}</p>
                  <p className="text-[10px] text-slate-700 mt-0.5">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-red-400">-{tx.amount} ETH</p>
                  <a href={`${SEPOLIA_EXPLORER}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-cyan-500 hover:text-cyan-300 flex items-center gap-0.5 justify-end mt-0.5">
                    <ExternalLink size={9} /> Etherscan
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

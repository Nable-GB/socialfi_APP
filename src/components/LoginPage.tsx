import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useWallet } from "../hooks/useWallet";
import { toast } from "sonner";
import { Mail, Lock, User, RefreshCw, Wallet, Zap, CheckCircle, AlertTriangle } from "lucide-react";

type Mode = "login" | "register";

export function LoginPage() {
  const { login, register, walletLogin } = useAuth();
  const wallet = useWallet();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");

  const reset = () => {
    setEmail(""); setPassword(""); setUsername("");
    setDisplayName(""); setReferralCode("");
  };

  // ─── MetaMask Connect + SIWE Login ───────────────────────────────────────
  const handleWalletConnect = async () => {
    if (!wallet.hasMetaMask) {
      toast.error("MetaMask not detected! Please install MetaMask extension.", { duration: 5000 });
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    try {
      setWalletConnecting(true);

      // 1. Connect MetaMask + switch to Sepolia
      const address = await wallet.connect();
      setWalletAddress(address);
      toast.success(`Wallet connected! ${address.slice(0, 6)}...${address.slice(-4)}`, { duration: 3000 });

      // 2. Sign in via SIWE
      await walletLogin(address, wallet.signMessage);
      toast.success("Welcome to SocialFi! 🎉🦊");
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.error("Connection rejected by user");
      } else {
        toast.error(err instanceof Error ? err.message : "Wallet connection failed");
      }
      setWalletAddress(null);
    } finally {
      setWalletConnecting(false);
    }
  };

  // ─── Email Login ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    try {
      setIsLoading(true);
      await login(email, password);
      toast.success("Welcome back! 👋");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Email Register ──────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!email || !password || !username) {
      toast.error("Email, password, and username are required");
      return;
    }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    try {
      setIsLoading(true);
      await register({ email, password, username, displayName: displayName || username, referralCode: referralCode || undefined });
      toast.success("Account created! Welcome to SocialFi 🎉");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (demoEmail: string) => {
    try {
      setIsLoading(true);
      await login(demoEmail, "Password123!");
      toast.success("Demo login successful! 🚀");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demo login failed — seed the database first");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleRegister();
  };

  const shortAddr = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(135deg, #eef2f7 0%, #e4eaf3 50%, #dce5f0 100%)" }}>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl px-8 py-10">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center shadow-sm">
            <Zap size={28} className="text-indigo-500" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-center text-slate-900 tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-indigo-500">SOCIALFI</span>
        </h1>
        <p className="text-center text-slate-500 text-sm mt-1.5 mb-8">
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </p>

        {/* ══════════════ Connect Wallet (MetaMask) ══════════════ */}
        {mode === "login" && (
          <>
            <button
              onClick={handleWalletConnect}
              disabled={walletConnecting || isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 text-slate-800 font-semibold text-sm hover:from-orange-100 hover:to-amber-100 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {walletConnecting ? (
                <><RefreshCw size={16} className="animate-spin text-orange-500" /> Connecting MetaMask...</>
              ) : walletAddress ? (
                <><CheckCircle size={16} className="text-green-500" /> Connected: {shortAddr}</>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.96 1L19.67 10.88L22.15 4.95L32.96 1Z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2.04 1L15.21 10.97L12.85 4.95L2.04 1Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M28.17 23.53L24.61 29.01L32.23 31.11L34.44 23.65L28.17 23.53Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M0.58 23.65L2.77 31.11L10.39 29.01L6.83 23.53L0.58 23.65Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.95 14.42L7.81 17.62L15.35 17.96L15.08 9.82L9.95 14.42Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M25.05 14.42L19.84 9.73L19.67 17.96L27.19 17.62L25.05 14.42Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.39 29.01L14.89 26.82L10.99 23.7L10.39 29.01Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.11 26.82L24.61 29.01L24.01 23.7L20.11 26.82Z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Connect with MetaMask
                </>
              )}
            </button>

            {/* Sepolia badge */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
              <span className="text-[10px] font-mono text-slate-400">Sepolia Testnet (ETH)</span>
            </div>

            {/* OR divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium">OR USE EMAIL</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
          </>
        )}

        {/* ══════════════ Email Form ══════════════ */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 text-center mb-1.5">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Username (register) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 text-center mb-1.5">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="crypto_alice"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
          )}

          {/* Display Name (register) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 text-center mb-1.5">Display Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Alice Nakamoto (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 text-center mb-1.5">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Referral Code (register + login) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 text-center mb-1.5">Referral Code</label>
              <input
                type="text"
                placeholder="Optional"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm text-center font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
          >
            {isLoading ? (
              <><RefreshCw size={15} className="animate-spin" /> Loading...</>
            ) : mode === "login" ? "Sign in" : "Create Account"}
          </button>
        </form>

        {/* Footer links */}
        <div className="flex items-center justify-between mt-5 text-sm">
          {mode === "login" && (
            <button className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors">
              Forgot password?
            </button>
          )}
          <div className={mode === "register" ? "w-full text-center" : "ml-auto"}>
            <span className="text-slate-500">
              {mode === "login" ? "Need an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); reset(); }}
              className="text-indigo-500 hover:text-indigo-600 font-semibold transition-colors"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>

        {/* MetaMask not installed warning */}
        {!wallet.hasMetaMask && mode === "login" && (
          <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Install MetaMask</a> to connect your wallet
            </p>
          </div>
        )}

        {/* Demo divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">DEMO ACCOUNTS</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Demo buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => demoLogin("alice@example.com")}
            disabled={isLoading}
            className="py-2.5 rounded-xl text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Wallet size={13} /> Demo User
          </button>
          <button
            onClick={() => demoLogin("merchant@nftstore.io")}
            disabled={isLoading}
            className="py-2.5 rounded-xl text-xs font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Zap size={13} /> Demo Merchant
          </button>
        </div>
      </div>
    </div>
  );
}

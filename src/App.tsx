import { useState, useEffect } from "react";
import {
  Home, TrendingUp, PlusSquare, User, Users, Wallet, Search,
  Zap, Star, ShoppingBag, ChevronUp, ChevronDown, Flame, Award, Shield,
  RefreshCw, Crown, Image,
  Globe, Settings, LogOut, Mail, X, ArrowUpRight, Menu,
  Music, Headphones, Upload, Gem, BarChart3
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { useLang } from "./contexts/LangContext";
import { useFeed } from "./hooks/useFeed";
import { useRewards } from "./hooks/useRewards";
import { useWallet } from "./hooks/useWallet";
import { AuthModal } from "./components/AuthModal";
// LoginPage replaced by SocialMusicFiLanding for unauthenticated users
import { MarketplacePage } from "./components/MarketplacePage";
import { CreateAdPage } from "./components/CreateAdPage";
import { ExplorePage } from "./components/ExplorePage";
import { ProfilePage } from "./components/ProfilePage";
import { SettingsPage } from "./components/SettingsPage";
import { TransactionsPage } from "./components/TransactionsPage";
import { AdminPage } from "./components/AdminPage";
import { NotificationCenter } from "./components/NotificationCenter";
import { NFTMarketplacePage } from "./components/NFTMarketplacePage";
import { MyNFTsPage } from "./components/MyNFTsPage";
import { ReferralPage } from "./components/ReferralPage";
import { AnalyticsPage } from "./components/AnalyticsPage";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { PaidServicesPage } from "./components/PaidServicesPage";
import { VerifyEmailPage } from "./components/VerifyEmailPage";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { MusicFeedPage } from "./components/MusicFeedPage";
import { UploadTrackPage } from "./components/UploadTrackPage";
import { MyMusicPage } from "./components/MyMusicPage";
import { AudioPlayerBar } from "./components/AudioPlayerBar";
import { MusicNFTPage } from "./components/MusicNFTPage";
import { RevenueDashboardPage } from "./components/RevenueDashboardPage";
import { DistributionSubmitPage } from "./components/DistributionSubmitPage";
import { WalletPage } from "./components/WalletPage";
import { SocialMusicFiLanding } from "./components/SocialMusicFiLanding";
import { authApi, uploadApi } from "./lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
interface User {
  id: number;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  color: string;
}

interface NFT {
  name: string;
  collection: string;
  price_eth: string;
  price_usd: string;
  rarity: "Legendary" | "Epic" | "Rare";
  edition: string;
  traits: string[];
  image: string;
  accent: string;
  change?: string;
}



const TRENDING_NFTS: NFT[] = [
  {
    name: "Neon Fragments EP",
    collection: "Lunar Circuit",
    price_eth: "0.85",
    price_usd: "3,060",
    change: "+42%",
    rarity: "Rare",
    edition: "200 of 2000",
    traits: ["Lo-fi", "Analog"],
    image: "https://images.unsplash.com/photo-1598387993441-a364f854cfbd?w=80&h=80&fit=crop",
    accent: "#22d3ee",
  },
  {
    name: "Void Samurai Album",
    collection: "Kaifire",
    price_eth: "1.20",
    price_usd: "4,320",
    change: "+28%",
    rarity: "Epic",
    edition: "500 of 5000",
    traits: ["Synthwave", "Stereo"],
    image: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?w=80&h=80&fit=crop",
    accent: "#a855f7",
  },
  {
    name: "Echoes of Green",
    collection: "Nova Synth",
    price_eth: "0.42",
    price_usd: "1,512",
    change: "+18%",
    rarity: "Rare",
    edition: "320 of 3000",
    traits: ["Indie Pop", "Vinyl"],
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop",
    accent: "#10b981",
  },
  {
    name: "Cosmic Purr",
    collection: "Atlas Sound",
    price_eth: "7.70",
    price_usd: "27,720",
    change: "+91%",
    rarity: "Legendary",
    edition: "50 of 250",
    traits: ["World", "Collector"],
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=80&h=80&fit=crop",
    accent: "#f59e0b",
  },
];

const TOP_SPONSORS = [
  { name: "NexusX Protocol", logo: "🔷", spent: "12.4 ETH", category: "DeFi", tier: "Gold", color: "#f59e0b" },
  { name: "ArcadeDAO", logo: "🎮", spent: "28.1 ETH", category: "Gaming", tier: "Platinum", color: "#a855f7" },
  { name: "VaultFi", logo: "🏦", spent: "8.9 ETH", category: "Lending", tier: "Silver", color: "#94a3b8" },
  { name: "PulseChain", logo: "💓", spent: "5.2 ETH", category: "Layer1", tier: "Bronze", color: "#cd7c41" },
];

// ─── Right Panel Widgets ──────────────────────────────────────────────────────

function TrendingNFTsWidget() {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const { t } = useLang();

  return (
    <div className="glass rounded-2xl p-4 border border-slate-700/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-cyan-400" />
          <span className="font-bold text-sm text-slate-100">{t.feed.trendingAlbums}</span>
        </div>
        <button 
          onClick={() => toast.info(t.widgets.fullMarketplaceComing)}
          className="flex items-center gap-1 text-xs hover:text-cyan-400 transition-colors text-slate-500">
          {t.feed.viewAll} <ChevronUp size={12} className="rotate-90" />
        </button>
      </div>

      <div className="space-y-2">
        {TRENDING_NFTS.map((nft) => (
          <div key={nft.name}
            onClick={() => setSelectedNFT(nft)}
            className="rounded-xl p-3 nft-card cursor-pointer flex items-center gap-3 group hover:bg-slate-800/40 transition-colors"
            style={{background:'rgba(15,23,42,0.6)', border:`1px solid ${nft.accent}22`}}>
            {/* Mini preview */}
            <img 
              src={nft.image} 
              alt={nft.name}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              style={{border:`1px solid ${nft.accent}33`, boxShadow:`0 0 8px ${nft.accent}22`}}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200 truncate">{nft.name}</span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-slate-600 font-mono">{nft.collection}</span>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold font-mono" style={{ color: nft.accent }}>{nft.price_eth} ETH</div>
              <div className="text-xs font-semibold text-emerald-400">{(nft as any).change}</div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => toast.info(t.widgets.exploringMarketplace)}
        className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
        style={{
          background:'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(99,102,241,0.1))',
          border:'1px solid rgba(34,211,238,0.25)',
          color:'#67e8f9',
        }}>
        <span className="flex items-center justify-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          {t.feed.discoverAlbums}
        </span>
      </button>

      {/* NFT Detail Dialog */}
      <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedNFT?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedNFT?.collection}
            </DialogDescription>
          </DialogHeader>
          {selectedNFT && (
            <div className="space-y-4 pt-4">
              <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full aspect-square rounded-xl object-cover" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">{t.widgets.price}</span>
                <span className="text-lg font-bold font-mono" style={{ color: selectedNFT.accent }}>{selectedNFT.price_eth} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">{t.widgets.change24h}</span>
                <span className="text-sm font-semibold text-emerald-400">{(selectedNFT as any).change}</span>
              </div>
              <Button 
                onClick={() => { toast.success(t.widgets.purchaseInitiated); setSelectedNFT(null); }}
                className="w-full"
                style={{ background: selectedNFT.accent }}
              >
                {t.widgets.buyNow}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopSponsorsWidget() {
  const tierIcon = (t: string) => ({ Platinum: <Crown size={11} />, Gold: <Star size={11} />, Silver: <Award size={11} />, Bronze: <Shield size={11} /> }[t]);
  const [selectedSponsor, setSelectedSponsor] = useState<typeof TOP_SPONSORS[0] | null>(null);
  const { t } = useLang();

  return (
    <div className="glass rounded-2xl p-4 border border-slate-700/10">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={15} className="text-orange-500" />
        <span className="font-bold text-sm text-slate-100">{t.feed.topSponsors}</span>
        <span className="text-xs ml-auto text-slate-600 font-mono">{t.feed.thisWeek}</span>
      </div>

      <div className="space-y-2">
        {TOP_SPONSORS.map((s, i) => (
          <div 
            key={s.name} 
            onClick={() => setSelectedSponsor(s)}
            className="flex items-center gap-3 p-2.5 rounded-xl group cursor-pointer hover:bg-slate-800/40 transition-colors">
            <span className="text-xs font-bold w-4 text-center text-slate-600 font-mono">{i+1}</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 bg-indigo-500/10 border border-indigo-500/20">
              {s.logo}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">{s.name}</div>
              <div className="text-xs text-slate-600 font-mono">
                {t.widgets.categories[s.category as keyof typeof t.widgets.categories] || s.category}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-0.5 text-[10px]" style={{ color: s.color }}>
                {tierIcon(s.tier)}
                <span className="font-mono font-semibold">
                  {t.widgets.tiers[s.tier as keyof typeof t.widgets.tiers] || s.tier}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono">{s.spent}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 p-3 rounded-xl text-center bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs font-semibold text-amber-400">💡 {t.feed.becomeSponsor}</p>
        <p className="text-xs mt-1 text-slate-500">{t.feed.reach50k}</p>
        <button 
          onClick={() => toast.info(t.widgets.campaignComing)}
          className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
          style={{background:'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))', border:'1px solid rgba(245,158,11,0.3)', color:'#fbbf24'}}>
          {t.nav.createAd}
        </button>
      </div>

      {/* Sponsor Detail Dialog */}
      <Dialog open={!!selectedSponsor} onOpenChange={() => setSelectedSponsor(null)}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedSponsor?.logo}</span>
              {selectedSponsor?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedSponsor && (t.widgets.categories[selectedSponsor.category as keyof typeof t.widgets.categories] || selectedSponsor.category)} · {selectedSponsor && (t.widgets.tiers[selectedSponsor.tier as keyof typeof t.widgets.tiers] || selectedSponsor.tier)} {t.widgets.sponsor}
            </DialogDescription>
          </DialogHeader>
          {selectedSponsor && (
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-sm text-slate-400">{t.widgets.totalSpent}</span>
                <span className="text-lg font-bold font-mono" style={{ color: selectedSponsor.color }}>{selectedSponsor.spent}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-sm text-slate-400">{t.widgets.tier}</span>
                <span className="text-sm font-semibold flex items-center gap-1" style={{ color: selectedSponsor.color }}>
                  {tierIcon(selectedSponsor.tier)} {t.widgets.tiers[selectedSponsor.tier as keyof typeof t.widgets.tiers] || selectedSponsor.tier}
                </span>
              </div>
              <Button 
                onClick={() => { toast.success(`${t.widgets.visiting} ${selectedSponsor.name}... 🔗`); setSelectedSponsor(null); }}
                className="w-full bg-indigo-500 hover:bg-indigo-600"
              >
                {t.widgets.visitWebsite}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Language Switcher ────────────────────────────────────────────────────────

function LangSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center rounded-xl overflow-hidden border border-slate-700/30" style={{background:'rgba(15,23,42,0.6)'}}>
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1.5 text-xs font-bold transition-all ${
          lang === 'en'
            ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400'
            : 'text-slate-500 hover:text-slate-300'
        }`}>
        EN
      </button>
      <div className="w-px h-4 bg-slate-700/50" />
      <button
        onClick={() => setLang('ko')}
        className={`px-2.5 py-1.5 text-xs font-bold transition-all ${
          lang === 'ko'
            ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400'
            : 'text-slate-500 hover:text-slate-300'
        }`}>
        한국어
      </button>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onOpenAuth, onOpenLanding }: { onOpenAuth: () => void; onOpenLanding: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLang();
  const tHeader = t.header;
  const { balance } = useRewards();
  const wallet = useWallet();
  const displayBalance = isAuthenticated
    ? parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0";

  const shortAddr = wallet.address
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : null;

  const handleConnectWallet = async () => {
    try {
      const addr = await wallet.connect();
      toast.success(`${t.auth.walletConnected} ${addr.slice(0, 6)}...${addr.slice(-4)}`);
    } catch (err: any) {
      if (err?.code === 4001) {
        toast.error(t.auth.connectionRejected);
      } else if (!wallet.hasMetaMask) {
        toast.error(t.auth.metaMaskNotFound);
      } else {
        toast.error(err?.message || t.auth.connectionFailed);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.04]" style={{ background: 'rgba(3,7,17,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <button onClick={onOpenLanding} className="flex items-center gap-2.5 flex-shrink-0 text-left" type="button">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-900" style={{ boxShadow: '0 0 12px rgba(34,211,238,0.4)' }}>
            <img src="/smfi-logo.jpeg" alt="SMFI logo" className="w-full h-full object-cover" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-extrabold text-sm tracking-tight shimmer-text">SMFI</span>
            <span className="text-[9px] text-slate-500 font-medium tracking-wide">Social Music Fi</span>
          </div>
        </button>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-sm items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <Search size={14} className="text-slate-500" />
          <input placeholder={tHeader.searchPlaceholder} className="bg-transparent text-sm outline-none w-full text-slate-300" />
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Token balance — only show when logged in */}
          {isAuthenticated && (
            <div className="relative pulse-ring rounded-xl flex items-center gap-2 px-3 py-1.5"
              style={{
                background:'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(99,102,241,0.08))',
                border:'1px solid rgba(34,211,238,0.25)',
                boxShadow:'0 0 15px rgba(34,211,238,0.1)',
              }}>
              <span className="text-base">🪙</span>
              <span className="font-bold text-sm text-cyan-400 font-mono" style={{textShadow:'0 0 12px rgba(34,211,238,0.7)'}}>
                {displayBalance}
              </span>
            </div>
          )}

          {/* MetaMask wallet button — only for logged-in users */}
          {isAuthenticated && !wallet.address && (
            <button
              onClick={handleConnectWallet}
              disabled={wallet.isConnecting}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))',
                border: '1px solid rgba(245,158,11,0.35)',
                color: '#fbbf24',
                boxShadow: '0 0 10px rgba(245,158,11,0.1)',
              }}>
              {wallet.isConnecting ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21.3 3L13 8.9l1.5-3.6L21.3 3z" fill="#E17726"/><path d="M2.7 3l8.2 6-1.4-3.7L2.7 3zM18.2 17l-2.2 3.3 4.7 1.3 1.3-4.6h-3.8zM2 17l1.3 4.6 4.7-1.3L5.8 17H2z" fill="#E27625"/></svg>
              )}
              <span className="hidden sm:inline">{wallet.isConnecting ? t.header.connecting : t.header.connectWallet}</span>
            </button>
          )}

          {/* Connected wallet address chip */}
          {isAuthenticated && wallet.address && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(34,211,238,0.08))',
                border: '1px solid rgba(16,185,129,0.3)',
              }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px #34d399' }} />
              <span className="text-emerald-400 font-semibold">{shortAddr}</span>
              {wallet.isSepolia && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-sans font-bold">Sepolia</span>
              )}
            </div>
          )}

          {/* Language Switcher */}
          <LangSwitcher />

          {/* Notification Center */}
          {isAuthenticated && <NotificationCenter />}

          {/* Auth button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)'}}>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {(user?.displayName ?? user?.username ?? "U")[0].toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-emerald-400">
                  {user?.displayName ?? user?.username}
                </span>
              </div>
              <button
                onClick={() => { logout(); toast.info(tHeader.signedOut); }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-800 border border-slate-700/20 text-slate-500 hover:text-red-400">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background:'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.15))',
                border:'1px solid rgba(99,102,241,0.35)',
                color:'#a5b4fc',
                boxShadow:'0 0 15px rgba(99,102,241,0.15)',
              }}>
              <Wallet size={14} />
              <span className="hidden sm:block">{tHeader.signIn}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Left Desktop Nav ─────────────────────────────────────────────────────────

function DesktopNavUserChip({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLang();
  
  if (!isAuthenticated) {
    return (
      <div className="mt-auto pt-6 pb-2">
        <button
          onClick={onOpenAuth}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))',border:'1px solid rgba(99,102,241,0.35)',color:'#a5b4fc'}}>
          {t.header.signInRegister}
        </button>
      </div>
    );
  }
  return (
    <div className="mt-auto pt-6 pb-2">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/10">
        <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {(user?.displayName ?? user?.username ?? 'U')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-200 truncate">{user?.displayName ?? user?.username}</p>
          <p className="text-xs truncate text-slate-600 font-mono">@{user?.username}</p>
        </div>
        <button
          onClick={() => { logout(); toast.info(t.header.signedOut); }}
          className="text-slate-500 hover:text-red-400 ml-auto flex-shrink-0 p-1 rounded-lg hover:bg-slate-700 transition-colors">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

function DesktopNav({ activeNav, setActiveNav, onOpenAuth }: { activeNav: string; setActiveNav: (id: string) => void; onOpenAuth: () => void }) {
  const { user } = useAuth();
  const { t } = useLang();
  const [meOpen, setMeOpen] = useState(false);

  const mainItems = [
    { id: "music", icon: Headphones, label: t.nav.listen },
    { id: "feed", icon: Home, label: t.nav.community },
    { id: "upload-track", icon: Upload, label: t.nav.upload },
    { id: "explore", icon: Globe, label: t.nav.explore },
  ];

  const meItems = [
    { id: "profile", icon: User, label: t.nav.myProfile },
    { id: "my-music", icon: Music, label: t.nav.myMusic },
    { id: "revenue", icon: BarChart3, label: t.nav.revenue },
    { id: "music-nfts", icon: Gem, label: t.nav.musicNFTs },
    { id: "wallet", icon: Wallet, label: t.nav.wallet },
    { id: "distribution", icon: Globe, label: t.nav.distribution },
    { id: "market", icon: ShoppingBag, label: t.nav.marketplace },
    { id: "create", icon: PlusSquare, label: t.nav.createAd },
    { id: "nft-market", icon: Image, label: t.nav.nftMarket },
    { id: "my-nfts", icon: Image, label: t.nav.myNFTs },
    { id: "referrals", icon: Users, label: t.nav.referrals },
    { id: "analytics", icon: TrendingUp, label: t.nav.analytics },
    { id: "subscription", icon: Crown, label: t.nav.subscription },
    { id: "services", icon: ShoppingBag, label: t.nav.services },
    { id: "transactions", icon: ArrowUpRight, label: t.nav.transactions },
    { id: "settings", icon: Settings, label: t.nav.settings },
    ...(user?.role === "ADMIN" ? [{ id: "admin", icon: Shield, label: t.nav.admin }] : []),
  ];

  const isInMe = meItems.some(i => i.id === activeNav);

  return (
    <nav className="sticky top-14 pt-6 flex flex-col gap-1 h-fit">
      {mainItems.map(item => (
        <button
          key={item.id}
          onClick={() => { setActiveNav(item.id); setMeOpen(false); }}
          className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeNav === item.id && !isInMe ? 'active' : ''}`}
          style={{
            color: activeNav === item.id && !isInMe ? '#22d3ee' : '#94a3b8',
            fontWeight: activeNav === item.id && !isInMe ? 600 : 400,
            borderLeft: activeNav === item.id && !isInMe ? '' : '3px solid transparent',
          }}>
          <item.icon size={18} />
          <span className="text-sm">{item.label}</span>
        </button>
      ))}

      {/* Me section */}
      <button
        onClick={() => setMeOpen(!meOpen)}
        className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${isInMe ? 'active' : ''}`}
        style={{
          color: isInMe ? '#22d3ee' : '#94a3b8',
          fontWeight: isInMe ? 600 : 400,
          borderLeft: isInMe ? '' : '3px solid transparent',
        }}>
        <User size={18} />
        <span className="text-sm">{t.nav.me}</span>
        <ChevronUp size={14} className={`ml-auto transition-transform ${meOpen || isInMe ? '' : 'rotate-180'}`} />
      </button>

      {(meOpen || isInMe) && (
        <div className="ml-3 pl-4 border-l border-slate-700/20 space-y-0.5 fade-in">
          {meItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all w-full ${activeNav === item.id ? '' : 'hover:bg-white/[0.03]'}`}
              style={{
                color: activeNav === item.id ? '#22d3ee' : '#64748b',
                fontWeight: activeNav === item.id ? 600 : 400,
                background: activeNav === item.id ? 'rgba(34,211,238,0.08)' : undefined,
              }}>
              <item.icon size={14} />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      <DesktopNavUserChip onOpenAuth={onOpenAuth} />
    </nav>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function BottomNav({ mobileTab, setMobileTab }: { mobileTab: string; setMobileTab: (id: string) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { user: authUser } = useAuth();
  const { t } = useLang();

  const mainItems = [
    { id: "music", icon: Headphones, label: t.nav.listen },
    { id: "feed", icon: Home, label: t.nav.community },
    { id: "upload-track", icon: Upload, label: t.nav.upload },
    { id: "profile", icon: User, label: t.nav.me },
  ];

  const moreItems = [
    { id: "my-music", icon: Music, label: t.nav.myMusic },
    { id: "music-nfts", icon: Gem, label: t.nav.musicNFTs },
    { id: "revenue", icon: BarChart3, label: t.nav.revenue },
    { id: "distribution", icon: Globe, label: t.nav.distribution },
    { id: "market", icon: ShoppingBag, label: t.nav.marketplace },
    { id: "create", icon: PlusSquare, label: t.nav.createAd },
    { id: "explore", icon: Globe, label: t.nav.explore },
    { id: "nft-market", icon: Image, label: t.nav.nftMarket },
    { id: "my-nfts", icon: Image, label: t.nav.myNFTs },
    { id: "referrals", icon: Users, label: t.nav.referrals },
    { id: "analytics", icon: TrendingUp, label: t.nav.analytics },
    { id: "subscription", icon: Crown, label: t.nav.subscription },
    { id: "services", icon: ShoppingBag, label: t.nav.services },
    { id: "wallet", icon: Wallet, label: t.nav.wallet },
    { id: "transactions", icon: ArrowUpRight, label: t.nav.transactions },
    { id: "settings", icon: Settings, label: t.nav.settings },
    ...(authUser?.role === "ADMIN" ? [{ id: "admin", icon: Shield, label: t.nav.admin }] : []),
  ];

  const isMoreActive = moreItems.some(i => i.id === mobileTab);

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-2xl p-4 pb-24 slide-up-modal"
            style={{ background: "linear-gradient(180deg, #111827 0%, #030711 100%)", border: "1px solid rgba(148,163,184,0.07)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-300 mb-3 px-1">{t.nav.more}</h3>
            <div className="grid grid-cols-4 gap-2">
              {moreItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setMobileTab(item.id); setMoreOpen(false); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                    mobileTab === item.id ? "bg-cyan-500/15 border border-cyan-500/30" : "bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06]"
                  }`}
                >
                  <item.icon size={20} style={{ color: mobileTab === item.id ? "#22d3ee" : "#94a3b8" }} />
                  <span className="text-[10px] font-medium" style={{ color: mobileTab === item.id ? "#22d3ee" : "#94a3b8" }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.04] flex lg:hidden"
        style={{ background: "rgba(3,7,17,0.95)", backdropFilter: "blur(20px)" }}>
        {mainItems.map(item => (
          <button key={item.id} onClick={() => { setMobileTab(item.id); setMoreOpen(false); }}
            className={`bnav-item flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${mobileTab === item.id && !isMoreActive ? 'active' : ''}`}
            style={{color: mobileTab === item.id && !isMoreActive ? '#22d3ee' : '#475569'}}>
            <item.icon size={20} className="bnav-icon" />
            <span className="text-[10px]" style={{fontWeight: mobileTab === item.id && !isMoreActive ? 600 : 400}}>{item.label}</span>
          </button>
        ))}
        {/* More button */}
        <button onClick={() => setMoreOpen(!moreOpen)}
          className={`bnav-item flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${isMoreActive || moreOpen ? 'active' : ''}`}
          style={{color: isMoreActive || moreOpen ? '#22d3ee' : '#475569'}}>
          <Menu size={20} className="bnav-icon" />
          <span className="text-[10px]" style={{fontWeight: isMoreActive || moreOpen ? 600 : 400}}>{t.nav.more}</span>
        </button>
      </nav>
    </>
  );
}

// ─── Real API Feed Components ────────────────────────────────────────────────

import { FeedPost } from "./components/FeedPost";

function RealFeed({ onClaimReward }: { onClaimReward: (postId: string, type: 'VIEW' | 'ENGAGEMENT', amount: string) => void }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, createPost, likePost, commentPost, claimAdReward, deletePost, getComments } = useFeed();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    if (!isAuthenticated) { toast.error(t.feed.signInToPost); return; }
    try {
      setIsPosting(true);
      await createPost(content, mediaUrl || undefined);
      setContent('');
      setMediaUrl(null);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="glass rounded-2xl p-4 border border-slate-700/10">
        <Textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder={isAuthenticated ? t.feed.whatsHappening : t.feed.signInToPost}
          className="bg-slate-800/60 border-slate-700/20 text-white placeholder:text-slate-500 min-h-[80px] resize-none"
          disabled={!isAuthenticated} />
        {/* Media preview */}
        {mediaUrl && (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-700/20 max-h-48">
            <img src={mediaUrl} alt="media" className="w-full h-full object-cover" />
            <button onClick={() => setMediaUrl(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500 transition-colors">
              <X size={12} />
            </button>
          </div>
        )}
        {(content || mediaUrl) && (
          <div className="flex items-center gap-2 mt-3">
            {/* Media upload button */}
            <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${uploadingMedia ? 'opacity-50' : 'hover:bg-slate-700/50'} border border-slate-700/30 text-slate-400`}>
              {uploadingMedia ? <RefreshCw size={12} className="animate-spin" /> : <Image size={12} />}
              {uploadingMedia ? t.feed.uploading : t.feed.media}
              <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" disabled={uploadingMedia}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) { toast.error(t.feed.maxFileSize); return; }
                  setUploadingMedia(true);
                  try {
                    const res = await uploadApi.media(file);
                    setMediaUrl(res.url);
                  } catch (err: any) { toast.error(err?.message ?? t.feed.uploadFailed); }
                  finally { setUploadingMedia(false); e.target.value = ''; }
                }} />
            </label>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setContent('')} className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">{t.feed.cancelBtn}</Button>
            <Button onClick={handlePost} disabled={isPosting || !content.trim()}
              style={{background:'linear-gradient(135deg,#22d3ee,#6366f1)',boxShadow:'0 4px 12px rgba(34,211,238,0.25)'}}>
              {isPosting ? <><RefreshCw size={14} className="animate-spin mr-1" />{t.feed.posting}</> : t.feed.postBtn}
            </Button>
          </div>
        )}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-2xl p-5 border border-slate-700/10 animate-pulse">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-700/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-700/50 rounded w-1/3" />
                  <div className="h-2 bg-slate-700/30 rounded w-3/4" />
                  <div className="h-2 bg-slate-700/30 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-slate-500">
          <p>{t.feed.noPosts}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <FeedPost
              key={post.id}
              post={post}
              onClaimReward={onClaimReward}
              onLike={likePost}
              onComment={commentPost}
              onClaimAdReward={claimAdReward}
              onDelete={deletePost}
              onGetComments={getComments}
            />
          ))}
          {hasMore && (
            <button onClick={loadMore} disabled={isLoadingMore}
              className="w-full py-3 rounded-xl glass border border-slate-700/10 text-sm text-slate-400 hover:text-cyan-400 transition-all flex items-center justify-center gap-2">
              {isLoadingMore ? <RefreshCw size={14} className="animate-spin" /> : <ChevronDown size={14} />}
              {t.feed.loadMore}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLang();
  const { balance, totalEarned, onRewardClaimed } = useRewards();
  const appEnteredKey = "smfi_app_entered";
  const defaultPage = "music";
  const getPageFromHash = () => {
    const raw = window.location.hash.replace(/^#/, "").trim();
    return raw || null;
  };
  
  // Persist navigation state
  const [mobileTab, setMobileTab] = useState(() => getPageFromHash() || localStorage.getItem("mobileTab") || defaultPage);
  const [activeNav, setActiveNav] = useState(() => getPageFromHash() || localStorage.getItem("activeNav") || defaultPage);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | undefined>(undefined);

  const navigateTo = (page: string) => {
    setForceLanding(false);
    if (page !== "profile") {
      setSelectedProfileUserId(undefined);
    }
    setActiveNav(page);
    setMobileTab(page);
  };

  const openUserProfile = (userId: string) => {
    setForceLanding(false);
    setSelectedProfileUserId(userId);
    setActiveNav("profile");
    setMobileTab("profile");
  };

  const openLandingPage = () => {
    setAuthOpen(false);
    setForceLanding(true);
    try {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    } catch { }
  };

  useEffect(() => { localStorage.setItem("mobileTab", mobileTab); }, [mobileTab]);
  useEffect(() => { localStorage.setItem("activeNav", activeNav); }, [activeNav]);
  useEffect(() => {
    const currentPage = activeNav || mobileTab || defaultPage;
    if (window.location.hash !== `#${currentPage}`) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}#${currentPage}`);
    }
  }, [activeNav, mobileTab, defaultPage]);

  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      if (!page) return;
      setActiveNav(page);
      setMobileTab(page);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [authOpen, setAuthOpen] = useState(false);
  const [forceLanding, setForceLanding] = useState(false);
  const [showLanding, setShowLanding] = useState(() => {
    try {
      if (getPageFromHash()) return false;
      return localStorage.getItem(appEnteredKey) !== "true";
    } catch {
      return true;
    }
  });
  
  // Sync showLanding with auth state once loading finishes
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setShowLanding(false);
        setForceLanding(false);
        try { localStorage.setItem(appEnteredKey, "true"); } catch { }
      } else if (getPageFromHash()) {
        setShowLanding(false);
      }
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    try {
      localStorage.setItem(appEnteredKey, showLanding ? "false" : "true");
    } catch { }
  }, [showLanding, appEnteredKey]);

  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  // ── URL-based special pages ────────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const verifyToken = window.location.pathname === "/verify-email" ? urlParams.get("token") : null;
  const resetToken = window.location.pathname === "/reset-password" ? urlParams.get("token") : null;

  if (verifyToken) {
    return <VerifyEmailPage token={verifyToken} onDone={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }} />;
  }
  if (resetToken) {
    return <ResetPasswordPage token={resetToken} onDone={() => { window.history.replaceState({}, "", "/"); window.location.reload(); }} />;
  }

  // Show loading state to prevent flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 animate-pulse" />
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      </div>
    );
  }

  const handleClaimReward = async (_postId: string, _type: 'VIEW' | 'ENGAGEMENT', amount: string) => {
    await onRewardClaimed(amount);
  };

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await authApi.sendVerification();
      toast.success(t.auth.verificationSent);
    } catch (err: any) {
      toast.error(err?.message ?? t.auth.verificationFailed);
    } finally {
      setSendingVerification(false);
    }
  };

  const displayBalance = parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 2 });

  // Show landing page for first-time / unauthenticated visitors
  if (forceLanding || (!isAuthenticated && showLanding)) {
    return (
      <>
        <SocialMusicFiLanding
          onLaunchApp={() => {
            setForceLanding(false);
            setShowLanding(false);
            navigateTo(activeNav || mobileTab || defaultPage);
          }}
          onApplyArtist={() => setAuthOpen(true)}
        />
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  // Email verification banner — show if user has email but not verified
  const showVerifyBanner = user?.email && !user.emailVerified && !verifyBannerDismissed;

  return (
    <div className="bg-mesh min-h-screen">
      <Header onOpenAuth={() => setAuthOpen(true)} onOpenLanding={openLandingPage} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />

      {/* Email Verification Banner */}
      {showVerifyBanner && (
        <div className="sticky top-14 z-40 w-full"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))", borderBottom: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <Mail size={15} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300 flex-1">
              {t.auth.verifyEmailBanner}
            </p>
            <button onClick={handleSendVerification} disabled={sendingVerification}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-500/40 px-3 py-1 rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 flex-shrink-0">
              {sendingVerification ? <RefreshCw size={11} className="animate-spin" /> : null}
              {sendingVerification ? t.auth.sending : t.auth.sendLink}
            </button>
            <button onClick={() => setVerifyBannerDismissed(true)} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4">

        {/* Desktop layout */}
        <div className="hidden lg:grid gap-6 py-6" style={{gridTemplateColumns:'220px 1fr 290px'}}>
          <DesktopNav activeNav={activeNav} setActiveNav={navigateTo} onOpenAuth={() => setAuthOpen(true)} />

          <main className="min-w-0">
            {activeNav === "feed" && <RealFeed onClaimReward={handleClaimReward} />}
            {activeNav === "music" && <MusicFeedPage />}
            {activeNav === "upload-track" && <UploadTrackPage />}
            {activeNav === "my-music" && <MyMusicPage />}
            {activeNav === "music-nfts" && <MusicNFTPage />}
            {activeNav === "revenue" && <RevenueDashboardPage />}
            {activeNav === "distribution" && <DistributionSubmitPage />}
            {activeNav === "market" && <MarketplacePage />}
            {activeNav === "create" && <CreateAdPage />}
            {activeNav === "profile" && <ProfilePage userId={selectedProfileUserId} />}
            {activeNav === "explore" && <ExplorePage onOpenProfile={openUserProfile} />}
            {activeNav === "settings" && <SettingsPage />}
            {activeNav === "transactions" && <TransactionsPage />}
            {activeNav === "nft-market" && <NFTMarketplacePage />}
            {activeNav === "my-nfts" && <MyNFTsPage />}
            {activeNav === "referrals" && <ReferralPage />}
            {activeNav === "analytics" && <AnalyticsPage />}
            {activeNav === "subscription" && <SubscriptionPage />}
            {activeNav === "services" && <PaidServicesPage />}
            {activeNav === "wallet" && <WalletPage />}
            {activeNav === "admin" && <AdminPage />}
          </main>

          <aside className="space-y-4 sticky top-14 pt-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <TrendingNFTsWidget />
            <TopSponsorsWidget />
            {/* Stats chip */}
            <div className="glass rounded-2xl p-4 border border-slate-700/10">
              <p className="text-xs font-semibold mb-3 text-slate-300">{t.profile.yourStats}</p>
              {[
                { label: t.profile.username, value: isAuthenticated ? `@${user?.username}` : 'Guest', icon: User, color: '#22d3ee' },
                { label: t.profile.earned, value: `${displayBalance} 🪙`, icon: Zap, color: '#f59e0b' },
                { label: t.profile.totalEarned, value: parseFloat(totalEarned).toFixed(2), icon: Image, color: '#a855f7' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-700/10 last:border-0">
                  <div className="flex items-center gap-2">
                    <s.icon size={13} style={{color: s.color}} />
                    <span className="text-xs text-slate-400">{s.label}</span>
                  </div>
                  <span className="text-xs font-bold font-mono" style={{color: s.color}}>{s.value}</span>
                </div>
              ))}
              {!isAuthenticated && (
                <button onClick={() => setAuthOpen(true)}
                  className="w-full mt-3 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{background:'linear-gradient(135deg,rgba(34,211,238,0.1),rgba(99,102,241,0.1))',border:'1px solid rgba(34,211,238,0.25)',color:'#67e8f9'}}>
                  {t.feed.signInEarn}
                </button>
              )}
            </div>
          </aside>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden pb-36 pt-4">
          {mobileTab === "feed" && <RealFeed onClaimReward={handleClaimReward} />}
          {mobileTab === "music" && <MusicFeedPage />}
          {mobileTab === "upload-track" && <UploadTrackPage />}
          {mobileTab === "my-music" && <MyMusicPage />}
          {mobileTab === "music-nfts" && <MusicNFTPage />}
          {mobileTab === "revenue" && <RevenueDashboardPage />}
          {mobileTab === "distribution" && <DistributionSubmitPage />}
          {mobileTab === "market" && <MarketplacePage />}
          {mobileTab === "create" && <CreateAdPage />}
          {mobileTab === "profile" && <ProfilePage userId={selectedProfileUserId} />}
          {mobileTab === "transactions" && <TransactionsPage />}
          {mobileTab === "settings" && <SettingsPage />}
          {mobileTab === "admin" && <AdminPage />}
          {mobileTab === "nft-market" && <NFTMarketplacePage />}
          {mobileTab === "my-nfts" && <MyNFTsPage />}
          {mobileTab === "referrals" && <ReferralPage />}
          {mobileTab === "analytics" && <AnalyticsPage />}
          {mobileTab === "subscription" && <SubscriptionPage />}
          {mobileTab === "services" && <PaidServicesPage />}
          {mobileTab === "explore" && <ExplorePage onOpenProfile={openUserProfile} />}
          {mobileTab === "wallet" && <WalletPage />}
        </div>
      </div>

      <AudioPlayerBar />
      <BottomNav mobileTab={mobileTab} setMobileTab={navigateTo} />
    </div>
  );
}

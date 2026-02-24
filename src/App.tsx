import { useState } from "react";
import {
  Home, TrendingUp, PlusSquare, User, Wallet, Bell, Search,
  Heart, MessageCircle, Share2,
  Zap, Star, ShoppingBag, ChevronUp, Flame, Award, Shield,
  ExternalLink, RefreshCw, Sparkles, Crown, Image,
  CheckCircle, Globe, Settings, LogOut
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { useFeed } from "./hooks/useFeed";
import { useRewards } from "./hooks/useRewards";
import { AuthModal } from "./components/AuthModal";
import type { ApiPost } from "./lib/api";
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
  { name: "Neon Fragments #77", collection: "Neon Fragments", price_eth: "0.85", price_usd: "3,060", change: "+42%", rarity: "Rare", edition: "77 of 1000", traits: ["Crystal", "Glow"], image: "/images/nft-neon-fragment.jpg", accent: "#22d3ee" },
  { name: "Void Samurai #209", collection: "Void Samurai", price_eth: "1.20", price_usd: "4,320", change: "+28%", rarity: "Epic", edition: "209 of 500", traits: ["Shadow", "Katana"], image: "/images/nft-void-samurai.jpg", accent: "#a855f7" },
  { name: "Solar Punk #1337", collection: "Solar Punks", price_eth: "0.42", price_usd: "1,512", change: "+18%", rarity: "Rare", edition: "1337 of 5000", traits: ["Solar", "Eco"], image: "/images/nft-solar-punk.jpg", accent: "#10b981" },
  { name: "QuantumKat #004", collection: "QuantumKats", price_eth: "7.70", price_usd: "27,720", change: "+91%", rarity: "Legendary", edition: "4 of 100", traits: ["Quantum", "Cosmic"], image: "/images/nft-quantum-kat.jpg", accent: "#f59e0b" },
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

  return (
    <div className="glass rounded-2xl p-4 border border-slate-700/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-cyan-400" />
          <span className="font-bold text-sm text-slate-100">Trending Collectibles</span>
        </div>
        <button 
          onClick={() => toast.info("Full marketplace coming soon! 🛒")}
          className="flex items-center gap-1 text-xs hover:text-cyan-400 transition-colors text-slate-500">
          View all <ChevronUp size={12} className="rotate-90" />
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
        onClick={() => toast.info("Exploring marketplace... 🌟")}
        className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
        style={{
          background:'linear-gradient(135deg, rgba(34,211,238,0.1), rgba(99,102,241,0.1))',
          border:'1px solid rgba(34,211,238,0.25)',
          color:'#67e8f9',
        }}>
        <span className="flex items-center justify-center gap-1.5">
          <Sparkles size={13} /> Explore Marketplace
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
                <span className="text-sm text-slate-400">Price</span>
                <span className="text-lg font-bold font-mono" style={{ color: selectedNFT.accent }}>{selectedNFT.price_eth} ETH</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">24h Change</span>
                <span className="text-sm font-semibold text-emerald-400">{(selectedNFT as any).change}</span>
              </div>
              <Button 
                onClick={() => { toast.success("Purchase initiated! 💎"); setSelectedNFT(null); }}
                className="w-full"
                style={{ background: selectedNFT.accent }}
              >
                Buy Now
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

  return (
    <div className="glass rounded-2xl p-4 border border-slate-700/10">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={15} className="text-orange-500" />
        <span className="font-bold text-sm text-slate-100">Top Sponsors</span>
        <span className="text-xs ml-auto text-slate-600 font-mono">This Week</span>
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
              <div className="text-xs text-slate-600 font-mono">{s.category}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-0.5 text-[10px]" style={{ color: s.color }}>
                {tierIcon(s.tier)}
                <span className="font-mono font-semibold">{s.tier}</span>
              </div>
              <div className="text-xs text-slate-600 font-mono">{s.spent}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 p-3 rounded-xl text-center bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs font-semibold text-amber-400">💡 Become a sponsor</p>
        <p className="text-xs mt-1 text-slate-500">Reach 50K+ Web3 users</p>
        <button 
          onClick={() => toast.info("Campaign creation coming soon! 🚀")}
          className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
          style={{background:'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))', border:'1px solid rgba(245,158,11,0.3)', color:'#fbbf24'}}>
          Create Ad Campaign
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
              {selectedSponsor?.category} · {selectedSponsor?.tier} Sponsor
            </DialogDescription>
          </DialogHeader>
          {selectedSponsor && (
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-sm text-slate-400">Total Spent</span>
                <span className="text-lg font-bold font-mono" style={{ color: selectedSponsor.color }}>{selectedSponsor.spent}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl">
                <span className="text-sm text-slate-400">Tier</span>
                <span className="text-sm font-semibold flex items-center gap-1" style={{ color: selectedSponsor.color }}>
                  {tierIcon(selectedSponsor.tier)} {selectedSponsor.tier}
                </span>
              </div>
              <Button 
                onClick={() => { toast.success(`Visiting ${selectedSponsor.name}... 🔗`); setSelectedSponsor(null); }}
                className="w-full bg-indigo-500 hover:bg-indigo-600"
              >
                Visit Website
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { balance } = useRewards();
  const [notifs, setNotifs] = useState(3);

  const displayBalance = isAuthenticated
    ? parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "0";

  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-700/10">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-cyan-400 to-indigo-500"
            style={{boxShadow:'0 0 12px rgba(34,211,238,0.4)'}}>
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-extrabold text-base tracking-tight shimmer-text hidden sm:block">SocialFi</span>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-sm items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/20">
          <Search size={14} className="text-slate-500" />
          <input placeholder="Search posts, NFTs, creators..." className="bg-transparent text-sm outline-none w-full text-slate-300" />
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

          {/* Notif bell */}
          <button 
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-slate-800 border border-slate-700/20"
            onClick={() => { setNotifs(0); toast.info("Notifications cleared"); }}>
            <Bell size={16} className={notifs > 0 ? 'text-cyan-400' : 'text-slate-500'} />
            {notifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-center flex items-center justify-center text-white font-bold text-[9px] bg-red-500"
                style={{boxShadow:'0 0 6px #ef444488'}}>
                {notifs}
              </span>
            )}
          </button>

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
                onClick={() => { logout(); toast.info("Signed out"); }}
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
              <span className="hidden sm:block">Sign In</span>
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
  if (!isAuthenticated) {
    return (
      <div className="mt-auto pt-6 pb-2">
        <button
          onClick={onOpenAuth}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))',border:'1px solid rgba(99,102,241,0.35)',color:'#a5b4fc'}}>
          Sign In / Register
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
          onClick={() => { logout(); toast.info('Signed out'); }}
          className="text-slate-500 hover:text-red-400 ml-auto flex-shrink-0 p-1 rounded-lg hover:bg-slate-700 transition-colors">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}

function DesktopNav({ activeNav, setActiveNav, onOpenAuth }: { activeNav: string; setActiveNav: (id: string) => void; onOpenAuth: () => void }) {
  const navItems = [
    { id: "feed", icon: Home, label: "Home Feed" },
    { id: "market", icon: ShoppingBag, label: "Marketplace" },
    { id: "create", icon: PlusSquare, label: "Create Ad" },
    { id: "profile", icon: User, label: "My Profile" },
    { id: "explore", icon: Globe, label: "Explore" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="sticky top-14 pt-6 flex flex-col gap-1 h-fit">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveNav(item.id)}
          className={`nav-item flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeNav === item.id ? 'active' : ''}`}
          style={{
            color: activeNav === item.id ? '#22d3ee' : '#94a3b8',
            fontWeight: activeNav === item.id ? 600 : 400,
            borderLeft: activeNav === item.id ? '' : '3px solid transparent',
          }}>
          <item.icon size={18} />
          <span className="text-sm">{item.label}</span>
          {item.id === 'market' && (
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-bold bg-cyan-400/10 text-cyan-400 font-mono text-[9px]">
              NEW
            </span>
          )}
        </button>
      ))}

      {/* User chip */}
      <DesktopNavUserChip onOpenAuth={onOpenAuth} />
    </nav>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

function BottomNav({ mobileTab, setMobileTab }: { mobileTab: string; setMobileTab: (id: string) => void }) {
  const items = [
    { id: "feed", icon: Home, label: "Feed" },
    { id: "market", icon: TrendingUp, label: "Market" },
    { id: "create", icon: PlusSquare, label: "Create" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 glass border-t border-slate-700/20 flex lg:hidden">
      {items.map(item => (
        <button key={item.id} onClick={() => setMobileTab(item.id)}
          className={`bnav-item flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${mobileTab === item.id ? 'active' : ''}`}
          style={{color: mobileTab === item.id ? '#22d3ee' : '#64748b'}}>
          <item.icon size={20} className="bnav-icon" />
          <span className="text-[10px] font-mono" style={{fontWeight: mobileTab === item.id ? 600 : 400}}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Real API Feed Components ────────────────────────────────────────────────

function RealFeedPost({ post, onClaimReward }: { post: ApiPost; onClaimReward: (postId: string, type: 'VIEW' | 'ENGAGEMENT') => void }) {
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(post.userInteractions.includes('LIKE'));
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const { likePost, commentPost, claimAdReward } = useFeed();

  const handleLike = async () => {
    if (!isAuthenticated) { toast.error('Sign in to interact'); return; }
    setLiked(p => !p);
    setLikeCount(p => liked ? p - 1 : p + 1);
    await likePost(post.id);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await commentPost(post.id, commentText);
    setCommentCount(p => p + 1);
    setCommentText('');
    setCommentOpen(false);
  };

  const handleEarn = async () => {
    if (!isAuthenticated) { toast.error('Sign in to earn tokens'); return; }
    try {
      await claimAdReward(post.id, 'VIEW');
      onClaimReward(post.id, 'VIEW');
    } catch { /* handled inside hook */ }
  };

  const avatarUrl = post.author.avatarUrl ?? `https://api.dicebear.com/9.x/avataaars/svg?seed=${post.author.username}`;

  return (
    <>
      <article className={`rounded-2xl p-5 feed-item border ${
        post.isSponsored
          ? 'border-indigo-500/25 bg-gradient-to-br from-slate-900/90 to-slate-800/80'
          : 'glass border-slate-700/10'
      }`}>
        {post.isSponsored && (
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-indigo-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{boxShadow:'0 0 4px #818cf8'}} />
            <span className="text-xs font-medium text-indigo-400 font-mono tracking-wider">SPONSORED</span>
          </div>
        )}
        <div className="flex items-start gap-3">
          <img src={avatarUrl} alt={post.author.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-700/40" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-slate-100">{post.author.displayName ?? post.author.username}</span>
              {post.author.isVerified && <CheckCircle size={13} className="text-cyan-400" />}
              <span className="text-xs text-slate-600 font-mono">@{post.author.username}</span>
              <span className="text-xs text-slate-700 font-mono ml-auto">{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{post.content}</p>
          </div>
        </div>

        {/* Earn button for sponsored posts */}
        {post.isSponsored && (
          <button
            onClick={handleEarn}
            disabled={post.rewardClaimed}
            className="mt-4 w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={post.rewardClaimed ? {
              background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399', cursor:'default'
            } : {
              background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'1px solid rgba(99,102,241,0.4)', color:'#fff',
              boxShadow:'0 4px 15px rgba(99,102,241,0.3)'
            }}>
            {post.rewardClaimed
              ? <><CheckCircle size={15}/> Reward Claimed 🪙</>
              : <><Zap size={15}/> Watch & Earn {post.rewardPerView ? `${parseFloat(post.rewardPerView).toFixed(3)} tokens` : ''} 🪙</>}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700/10">
          <button onClick={handleLike}
            className="flex items-center gap-1.5 text-slate-400 hover:text-pink-400 transition-colors">
            <Heart size={16} className={liked ? 'text-pink-400 fill-pink-400' : ''} />
            <span className="text-xs font-mono">{likeCount}</span>
          </button>
          <button onClick={() => setCommentOpen(true)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <MessageCircle size={16} />
            <span className="text-xs font-mono">{commentCount}</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(`https://socialfi.app/post/${post.id}`); toast.success('Link copied! 📋'); }}
            className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
            <Share2 size={16} />
            <span className="text-xs font-mono">{post.sharesCount}</span>
          </button>
          {post.adCampaign?.targetUrl && (
            <a href={post.adCampaign.targetUrl} target="_blank" rel="noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
              <ExternalLink size={12} />Learn More
            </a>
          )}
        </div>
      </article>

      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Add a Comment</DialogTitle>
            <DialogDescription className="text-slate-400">Share your thoughts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="Write your comment..." className="bg-slate-800 border-slate-700 text-white min-h-[100px] resize-none" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCommentOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
              <Button onClick={handleComment} disabled={!commentText.trim()} className="bg-cyan-500 hover:bg-cyan-600">Post</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RealFeed({ onClaimReward }: { onClaimReward: (postId: string, type: 'VIEW' | 'ENGAGEMENT') => void }) {
  const { isAuthenticated } = useAuth();
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, createPost } = useFeed();
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!content.trim()) return;
    if (!isAuthenticated) { toast.error('Sign in to post'); return; }
    try {
      setIsPosting(true);
      await createPost(content);
      setContent('');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compose */}
      <div className="glass rounded-2xl p-4 border border-slate-700/10">
        <Textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder={isAuthenticated ? "What's happening in Web3 today?" : "Sign in to post..."}
          className="bg-slate-800/60 border-slate-700/20 text-white placeholder:text-slate-500 min-h-[80px] resize-none"
          disabled={!isAuthenticated} />
        {content && (
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" onClick={() => setContent('')} className="border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">Cancel</Button>
            <Button onClick={handlePost} disabled={isPosting || !content.trim()}
              style={{background:'linear-gradient(135deg,#22d3ee,#6366f1)',boxShadow:'0 4px 12px rgba(34,211,238,0.25)'}}>
              {isPosting ? <><RefreshCw size={14} className="animate-spin mr-1" />Posting...</> : 'Post'}
            </Button>
          </div>
        )}
      </div>

      {/* Feed items */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center border border-slate-700/10">
          <p className="text-slate-400">No posts yet. Be the first to post!</p>
        </div>
      ) : (
        posts.map(post => <RealFeedPost key={post.id} post={post} onClaimReward={onClaimReward} />)
      )}

      {/* Load more */}
      {hasMore && (
        <button onClick={loadMore} disabled={isLoadingMore}
          className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80 bg-slate-800/50 border border-slate-700/10 text-slate-500">
          {isLoadingMore ? <><RefreshCw size={14} className="animate-spin" /> Loading...</> : <><RefreshCw size={14} /> Load more</>}
        </button>
      )}
    </div>
  );
}



// ─── Mobile Market Tab ────────────────────────────────────────────────────────

function MobileMarket() {
  return (
    <div className="space-y-4 pb-24">
      <div className="glass rounded-2xl p-4 border border-slate-700/10">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={16} className="text-cyan-400" />
          <h2 className="font-bold text-base text-slate-100">Trending Collectibles</h2>
        </div>
        <p className="text-xs mb-4 text-slate-600 font-mono">Sorted by 24h volume</p>

        <div className="grid grid-cols-2 gap-3">
          {TRENDING_NFTS.map(nft => (
            <div key={nft.name} className="rounded-xl overflow-hidden nft-card cursor-pointer"
              style={{border:`1px solid ${nft.accent}33`, boxShadow:`0 0 12px ${nft.accent}15`}}>
              <div className="relative">
                <img src={nft.image} alt={nft.name} className="w-full aspect-square object-cover" />
                <div className="nft-scan" />
              </div>
              <div className="p-3 bg-black/50">
                <div className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded mb-1.5 text-[9px] font-mono text-white rarity-${nft.rarity.toLowerCase()}`}>
                  {nft.rarity}
                </div>
                <p className="text-xs font-semibold text-white truncate">{nft.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-bold font-mono" style={{ color: nft.accent }}>{nft.price_eth} ETH</span>
                  <span className="text-xs font-semibold text-emerald-400">{(nft as any).change}</span>
                </div>
                <button 
                  onClick={() => toast.success("Mint initiated! ⛏️")}
                  className="w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-all text-white"
                  style={{background:`linear-gradient(135deg, ${nft.accent}, ${nft.accent}aa)`, boxShadow:`0 2px 10px ${nft.accent}33`}}>
                  Mint / Collect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TopSponsorsWidget />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const { balance, totalEarned, onRewardClaimed } = useRewards();
  const [mobileTab, setMobileTab] = useState("feed");
  const [activeNav, setActiveNav] = useState("feed");
  const [authOpen, setAuthOpen] = useState(false);

  const handleClaimReward = async (_postId: string, _type: 'VIEW' | 'ENGAGEMENT') => {
    await onRewardClaimed('0');
  };

  const displayBalance = parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="bg-mesh min-h-screen">
      <Header onOpenAuth={() => setAuthOpen(true)} />
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />

      <div className="max-w-screen-xl mx-auto px-4">

        {/* Desktop layout */}
        <div className="hidden lg:grid gap-6 py-6" style={{gridTemplateColumns:'220px 1fr 290px'}}>
          <DesktopNav activeNav={activeNav} setActiveNav={setActiveNav} onOpenAuth={() => setAuthOpen(true)} />

          <main className="min-w-0">
            <RealFeed onClaimReward={handleClaimReward} />
          </main>

          <aside className="space-y-4 sticky top-14 pt-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <TrendingNFTsWidget />
            <TopSponsorsWidget />
            {/* Stats chip */}
            <div className="glass rounded-2xl p-4 border border-slate-700/10">
              <p className="text-xs font-semibold mb-3 text-slate-300">Your Stats</p>
              {[
                { label: "Username", value: isAuthenticated ? `@${user?.username}` : 'Guest', icon: User, color: '#22d3ee' },
                { label: "Earned", value: `${displayBalance} 🪙`, icon: Zap, color: '#f59e0b' },
                { label: "Total Earned", value: parseFloat(totalEarned).toFixed(2), icon: Image, color: '#a855f7' },
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
                  Sign in to earn tokens
                </button>
              )}
            </div>
          </aside>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden pb-24 pt-4">
          {mobileTab === "feed" && <RealFeed onClaimReward={handleClaimReward} />}
          {mobileTab === "market" && <MobileMarket />}
          {mobileTab === "create" && (
            <div className="glass rounded-2xl p-6 text-center mt-4 border border-slate-700/10">
              <div className="text-4xl mb-3">📢</div>
              <h2 className="font-bold text-lg text-slate-100 mb-2">Create Ad Campaign</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">Launch a sponsored post, reach 50K+ Web3 users, and distribute real token rewards to engaged audiences.</p>
              <button
                onClick={() => toast.info("Sign in as Merchant to create campaigns! 🚀")}
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{background:'linear-gradient(135deg,#6366f1,#a855f7)',color:'#fff',boxShadow:'0 4px 20px rgba(99,102,241,0.35)'}}>
                <span className="flex items-center justify-center gap-2"><Zap size={16} /> Start Campaign</span>
              </button>
            </div>
          )}
          {mobileTab === "profile" && (
            <div className="space-y-4 mt-4">
              {isAuthenticated ? (
                <div className="glass rounded-2xl overflow-hidden border border-slate-700/10">
                  <div className="h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-500/30" />
                  <div className="px-5 pb-5 -mt-8">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-xl font-bold text-white border-4 border-slate-900">
                      {(user?.displayName ?? user?.username ?? 'U')[0].toUpperCase()}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-lg text-slate-100">{user?.displayName ?? user?.username}</h2>
                      </div>
                      <p className="text-sm text-slate-600 font-mono">@{user?.username}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {[
                        {l:'Balance', v:`${displayBalance} 🪙`},
                        {l:'Earned', v:parseFloat(totalEarned).toFixed(2)},
                        {l:'Role', v: user?.role ?? 'USER'}
                      ].map(s => (
                        <div key={s.l} className="text-center p-2 rounded-xl bg-slate-800/50">
                          <p className="font-bold text-sm text-slate-100">{s.v}</p>
                          <p className="text-xs mt-0.5 text-slate-500">{s.l}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass rounded-2xl p-8 text-center border border-slate-700/10">
                  <p className="text-slate-400 mb-4">Sign in to view your profile</p>
                  <Button onClick={() => setAuthOpen(true)}
                    style={{background:'linear-gradient(135deg,#22d3ee,#6366f1)'}}>
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomNav mobileTab={mobileTab} setMobileTab={setMobileTab} />
    </div>
  );
}

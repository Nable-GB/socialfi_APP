import { useState } from "react";
import { Search, TrendingUp, Star, Filter, ExternalLink, ShoppingBag, Flame, Crown } from "lucide-react";
import { toast } from "sonner";

interface NFTItem {
  id: string;
  name: string;
  collection: string;
  price_eth: string;
  price_usd: string;
  change: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  image: string;
  accent: string;
  creator: string;
  likes: number;
}

const MARKETPLACE_NFTS: NFTItem[] = [
  { id: "1", name: "Neon Fragments #77", collection: "Neon Fragments", price_eth: "0.85", price_usd: "3,060", change: "+42%", rarity: "Rare", image: "/images/nft-neon-fragment.jpg", accent: "#22d3ee", creator: "NeonArc", likes: 234 },
  { id: "2", name: "Void Samurai #209", collection: "Void Samurai", price_eth: "1.20", price_usd: "4,320", change: "+28%", rarity: "Epic", image: "/images/nft-void-samurai.jpg", accent: "#a855f7", creator: "VoxelQueen", likes: 589 },
  { id: "3", name: "Solar Punk #1337", collection: "Solar Punks", price_eth: "0.42", price_usd: "1,512", change: "+18%", rarity: "Rare", image: "/images/nft-solar-punk.jpg", accent: "#10b981", creator: "DeFiRebel", likes: 142 },
  { id: "4", name: "QuantumKat #004", collection: "QuantumKats", price_eth: "7.70", price_usd: "27,720", change: "+91%", rarity: "Legendary", image: "/images/nft-quantum-kat.jpg", accent: "#f59e0b", creator: "0xNova", likes: 1203 },
  { id: "5", name: "Cyber Samurai #88", collection: "Cyber Samurai", price_eth: "2.10", price_usd: "7,560", change: "+55%", rarity: "Epic", image: "/images/nft-cyber-samurai.jpg", accent: "#ef4444", creator: "CryptoPulse", likes: 876 },
  { id: "6", name: "Ethereal Void #12", collection: "Ethereal Voids", price_eth: "0.33", price_usd: "1,188", change: "+8%", rarity: "Common", image: "/images/nft-ethereal-void.jpg", accent: "#6366f1", creator: "NeonArc", likes: 67 },
];

const CATEGORIES = ["All", "Art", "Gaming", "PFP", "Music", "Photography", "Utility"];

const COLLECTIONS_STATS = [
  { name: "QuantumKats", floor: "5.20 ETH", volume: "1,240 ETH", change: "+23%", items: "10K", color: "#f59e0b" },
  { name: "Void Samurai", floor: "0.88 ETH", volume: "890 ETH", change: "+15%", items: "5K", color: "#a855f7" },
  { name: "Neon Fragments", floor: "0.42 ETH", volume: "560 ETH", change: "+31%", items: "3K", color: "#22d3ee" },
  { name: "Cyber Samurai", floor: "1.80 ETH", volume: "2,100 ETH", change: "+45%", items: "8K", color: "#ef4444" },
];

const rarityColor: Record<string, string> = {
  Legendary: "#f59e0b",
  Epic: "#a855f7",
  Rare: "#22d3ee",
  Common: "#94a3b8",
};

export function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState<"nfts" | "collections">("nfts");

  const filtered = MARKETPLACE_NFTS.filter(nft => {
    const matchesSearch = nft.name.toLowerCase().includes(search.toLowerCase()) ||
      nft.collection.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Hero Banner */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", border: "1px solid rgba(99,102,241,0.2)" }}>
        <div className="p-6 md:p-8 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={20} className="text-cyan-400" />
            <span className="text-xs font-bold font-mono text-cyan-400 tracking-widest">NFT MARKETPLACE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Discover, Collect & Trade</h1>
          <p className="text-sm text-slate-400 max-w-lg">Browse unique digital collectibles from top Web3 creators. Earn token rewards for every interaction.</p>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setView("nfts")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === "nfts" ? "text-white" : "text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700/50"}`}
              style={view === "nfts" ? { background: "linear-gradient(135deg, #22d3ee, #6366f1)", boxShadow: "0 4px 15px rgba(34,211,238,0.25)" } : {}}>
              Browse NFTs
            </button>
            <button
              onClick={() => setView("collections")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === "collections" ? "text-white" : "text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700/50"}`}
              style={view === "collections" ? { background: "linear-gradient(135deg, #22d3ee, #6366f1)", boxShadow: "0 4px 15px rgba(34,211,238,0.25)" } : {}}>
              Top Collections
            </button>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {view === "nfts" ? (
        <>
          {/* Search + Categories */}
          <div className="glass rounded-2xl p-4 border border-slate-700/10">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search NFTs, collections..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-slate-400 hover:text-white transition-colors">
                <Filter size={14} /> Filters
              </button>
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                    }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(nft => (
              <div key={nft.id} className="glass rounded-2xl overflow-hidden border border-slate-700/10 group hover:border-slate-600/30 transition-all cursor-pointer">
                <div className="relative aspect-square overflow-hidden">
                  <img src={nft.image} alt={nft.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md font-mono text-white"
                      style={{ background: rarityColor[nft.rarity], boxShadow: `0 2px 8px ${rarityColor[nft.rarity]}44` }}>
                      {nft.rarity}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] font-mono text-white">{nft.likes}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs text-slate-500 font-mono">{nft.collection}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-white truncate">{nft.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">by <span className="text-cyan-400">@{nft.creator}</span></p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/20">
                    <div>
                      <p className="text-xs text-slate-500">Price</p>
                      <p className="font-bold text-sm font-mono" style={{ color: nft.accent }}>{nft.price_eth} ETH</p>
                      <p className="text-[10px] text-slate-600 font-mono">${nft.price_usd}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 font-mono">{nft.change}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => toast.success(`Collecting ${nft.name}! ⛏️`)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${nft.accent}, ${nft.accent}aa)`, boxShadow: `0 2px 10px ${nft.accent}33` }}>
                      Collect Now
                    </button>
                    <button
                      onClick={() => toast.info("Opening on OpenSea...")}
                      className="p-2.5 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center border border-slate-700/10">
              <p className="text-slate-400">No NFTs found matching "{search}"</p>
            </div>
          )}
        </>
      ) : (
        /* Collections View */
        <div className="space-y-3">
          {/* Table header */}
          <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
            <div className="grid grid-cols-5 gap-4 px-5 py-3 text-xs text-slate-500 font-mono border-b border-slate-700/10">
              <span>Collection</span>
              <span className="text-right">Floor Price</span>
              <span className="text-right">Volume</span>
              <span className="text-right">24h Change</span>
              <span className="text-right">Items</span>
            </div>
            {COLLECTIONS_STATS.map((col, i) => (
              <div key={col.name}
                className="grid grid-cols-5 gap-4 px-5 py-4 items-center hover:bg-slate-800/30 transition-colors cursor-pointer border-b border-slate-700/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600 w-4">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: `${col.color}20`, border: `1px solid ${col.color}30` }}>
                    {col.name === "QuantumKats" ? "🐱" : col.name === "Void Samurai" ? "⚔️" : col.name === "Neon Fragments" ? "💎" : "🔥"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{col.name}</p>
                  </div>
                </div>
                <p className="text-right text-sm font-mono font-semibold" style={{ color: col.color }}>{col.floor}</p>
                <p className="text-right text-sm font-mono text-slate-300">{col.volume}</p>
                <p className="text-right text-sm font-mono font-semibold text-emerald-400">{col.change}</p>
                <p className="text-right text-sm font-mono text-slate-400">{col.items}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Banner */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Volume", value: "12,450 ETH", icon: TrendingUp, color: "#22d3ee" },
            { label: "NFTs Listed", value: "8,234", icon: ShoppingBag, color: "#a855f7" },
            { label: "Active Creators", value: "1,847", icon: Crown, color: "#f59e0b" },
            { label: "Floor Avg", value: "0.65 ETH", icon: Flame, color: "#ef4444" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <stat.icon size={18} className="mx-auto mb-1.5" style={{ color: stat.color }} />
              <p className="text-lg font-bold font-mono text-white">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

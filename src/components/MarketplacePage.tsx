import { useState } from "react";
import { Search, TrendingUp, ExternalLink, ShoppingBag, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "../contexts/LangContext";

interface NFTItem {
  id: string;
  name: string;
  collection: string;
  category: string;
  price_eth: string;
  price_usd: string;
  change: string;
  rarity: "Legendary" | "Epic" | "Rare" | "Common";
  image: string;
  accent: string;
  creator: string;
  likes: number;
}

interface CollectionStat {
  id: string;
  rank: number;
  name: string;
  floor_price: string;
  volume: string;
  change: string;
  items: number;
  owners: number;
  image: string;
}

const MARKETPLACE_NFTS: NFTItem[] = [
  { id: "1", name: "Neon Fragments #77", collection: "Neon Fragments", category: "Art", price_eth: "0.85", price_usd: "3,060", change: "+42%", rarity: "Rare", image: "/images/nft-neon-fragment.jpg", accent: "#22d3ee", creator: "NeonArc", likes: 234 },
  { id: "2", name: "Void Samurai #209", collection: "Void Samurai", category: "Gaming", price_eth: "1.20", price_usd: "4,320", change: "+28%", rarity: "Epic", image: "/images/nft-void-samurai.jpg", accent: "#a855f7", creator: "VoxelQueen", likes: 589 },
  { id: "3", name: "Solar Punk #1337", collection: "Solar Punks", category: "PFP", price_eth: "0.42", price_usd: "1,512", change: "+18%", rarity: "Rare", image: "/images/nft-solar-punk.jpg", accent: "#10b981", creator: "DeFiRebel", likes: 142 },
  { id: "4", name: "QuantumKat #004", collection: "QuantumKats", category: "Art", price_eth: "7.70", price_usd: "27,720", change: "+91%", rarity: "Legendary", image: "/images/nft-quantum-kat.jpg", accent: "#f59e0b", creator: "0xNova", likes: 1203 },
  { id: "5", name: "Cyber Samurai #88", collection: "Cyber Samurai", category: "Gaming", price_eth: "2.10", price_usd: "7,560", change: "+55%", rarity: "Epic", image: "/images/nft-cyber-samurai.jpg", accent: "#ef4444", creator: "CryptoPulse", likes: 876 },
  { id: "6", name: "Ethereal Void #12", collection: "Ethereal Voids", category: "Art", price_eth: "0.33", price_usd: "1,188", change: "+8%", rarity: "Common", image: "/images/nft-ethereal-void.jpg", accent: "#6366f1", creator: "NeonArc", likes: 67 },
];

const COLLECTIONS_STATS: CollectionStat[] = [
  { id: "1", rank: 1, name: "QuantumKats", floor_price: "7.5 ETH", volume: "12.4K ETH", change: "+12%", items: 5000, owners: 3200, image: "https://ui-avatars.com/api/?name=QK&background=f59e0b&color=fff" },
  { id: "2", rank: 2, name: "Void Samurai", floor_price: "1.1 ETH", volume: "8.2K ETH", change: "+5%", items: 8888, owners: 4100, image: "https://ui-avatars.com/api/?name=VS&background=a855f7&color=fff" },
  { id: "3", rank: 3, name: "Neon Fragments", floor_price: "0.8 ETH", volume: "5.1K ETH", change: "-2%", items: 3333, owners: 1800, image: "https://ui-avatars.com/api/?name=NF&background=22d3ee&color=fff" },
  { id: "4", rank: 4, name: "Solar Punks", floor_price: "0.4 ETH", volume: "3.8K ETH", change: "+8%", items: 10000, owners: 6500, image: "https://ui-avatars.com/api/?name=SP&background=10b981&color=fff" },
  { id: "5", rank: 5, name: "Cyber Samurai", floor_price: "2.0 ETH", volume: "2.1K ETH", change: "+25%", items: 2000, owners: 1200, image: "https://ui-avatars.com/api/?name=CS&background=ef4444&color=fff" },
];

function getCategories(t: any) {
  return [
    { value: "All", label: t.marketplace.categories.All },
    { value: "Art", label: t.marketplace.categories.Art },
    { value: "Gaming", label: t.marketplace.categories.Gaming },
    { value: "PFP", label: t.marketplace.categories.PFP },
    { value: "Music", label: t.marketplace.categories.Music },
    { value: "Photography", label: t.marketplace.categories.Photography },
    { value: "Utility", label: t.marketplace.categories.Utility },
  ];
}

export function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [view, setView] = useState<"nfts" | "collections">("nfts");
  const { t } = useLang();

  const filtered = MARKETPLACE_NFTS.filter(nft => {
    const matchesSearch = nft.name.toLowerCase().includes(search.toLowerCase()) ||
      nft.collection.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "All" || nft.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCollectionClick = (collectionName: string) => {
    setSearch(collectionName);
    setView("nfts");
    toast.success(`${t.marketplace.showingResults} ${collectionName}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero / Stats Banner */}
      <div className="glass rounded-2xl p-6 border border-slate-700/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShoppingBag size={120} className="text-cyan-400" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <ShoppingBag size={24} className="text-cyan-400" /> {t.marketplace.title}
          </h1>
          <p className="text-slate-400 text-sm max-w-lg">
            {t.marketplace.subtitle}
          </p>
          
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-2xl">
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-500 mb-1">{t.marketplace.totalVolume}</p>
              <p className="text-lg font-bold text-white">42.8K ETH</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-500 mb-1">{t.marketplace.floorPrice}</p>
              <p className="text-lg font-bold text-emerald-400">0.05 ETH</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/30">
              <p className="text-xs text-slate-500 mb-1">{t.marketplace.listedNfts}</p>
              <p className="text-lg font-bold text-purple-400">12,405</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/20">
          <button
            onClick={() => setView("nfts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              view === "nfts" ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LayoutGrid size={14} /> {t.marketplace.nfts}
          </button>
          <button
            onClick={() => setView("collections")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              view === "collections" ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <List size={14} /> {t.marketplace.collections}
          </button>
        </div>
      </div>

      {view === "nfts" ? (
        <>
          {/* Search + Categories */}
          <div className="glass rounded-2xl p-4 border border-slate-700/10">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.marketplace.searchPlaceholder}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {getCategories(t).map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${activeCategory === cat.value
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-800/50"
                    }`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* NFT Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(nft => (
              <div key={nft.id} className="glass rounded-2xl overflow-hidden border border-slate-700/10 group hover:border-slate-600/30 transition-all hover:-translate-y-1">
                <div className="relative aspect-square bg-slate-800">
                  <img src={nft.image} alt={nft.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                    {t.marketplace.rarity[nft.rarity as keyof typeof t.marketplace.rarity] || nft.rarity}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{nft.name}</h3>
                      <p className="text-xs text-slate-400">{nft.collection}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-cyan-400">{nft.price_eth} ETH</span>
                      <span className="text-[10px] text-slate-500">${nft.price_usd}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 mb-3">
                    <span>{t.marketplace.by} <span className="text-slate-300">{nft.creator}</span></span>
                    <span className="flex items-center gap-1"><TrendingUp size={10} className="text-green-400" /> {nft.change}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toast.success(`${t.createAd.collecting} ${nft.name}! ⛏️`)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(135deg, ${nft.accent}, ${nft.accent}aa)`, boxShadow: `0 2px 10px ${nft.accent}33` }}>
                      {t.marketplace.collectNow}
                    </button>
                    <a
                      href={`https://opensea.io/assets/ethereum/0x.../${nft.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-slate-700/30 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all flex items-center justify-center">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <ShoppingBag size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-400">{t.marketplace.noNftsFound}</h3>
              <p className="text-sm text-slate-500 mt-1">{t.marketplace.tryAdjusting}</p>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <div className="glass rounded-2xl border border-slate-700/10 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700/10 bg-slate-800/30 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-5">{t.marketplace.collection}</div>
              <div className="col-span-2 text-right">{t.marketplace.floor}</div>
              <div className="col-span-2 text-right">{t.marketplace.volume}</div>
              <div className="col-span-2 text-right">{t.marketplace.change}</div>
            </div>
            {COLLECTIONS_STATS.map((col) => (
              <div key={col.id} 
                onClick={() => handleCollectionClick(col.name)}
                className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700/5 last:border-0 items-center hover:bg-slate-800/40 transition-colors cursor-pointer group"
              >
                <div className="col-span-1 text-sm font-mono text-slate-500">{col.rank}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <img src={col.image} alt={col.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{col.name}</p>
                    <p className="text-[10px] text-slate-500">{col.items.toLocaleString()} {t.marketplace.items} · {col.owners.toLocaleString()} {t.marketplace.owners}</p>
                  </div>
                </div>
                <div className="col-span-2 text-right text-sm font-mono text-slate-300">{col.floor_price}</div>
                <div className="col-span-2 text-right text-sm font-mono text-white">{col.volume}</div>
                <div className={`col-span-2 text-right text-sm font-mono ${col.change.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                  {col.change}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

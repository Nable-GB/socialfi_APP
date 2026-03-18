import { useState, useEffect, useCallback } from "react";
import { nftApi, type ApiListing } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { ShoppingBag, RefreshCw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

function getRarityConfig(t: any): Record<string, { label: string; color: string; bg: string }> {
  return {
    COMMON:    { label: t.nft.rarityCommon,    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
    UNCOMMON:  { label: t.nft.rarityUncommon,  color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
    RARE:      { label: t.nft.rarityRare,      color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    EPIC:      { label: t.nft.rarityEpic,      color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    LEGENDARY: { label: t.nft.rarityLegendary, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  };
}

function getSortOptions(t: any) {
  return [
    { id: "newest",     label: t.nftMarket.sortNewest },
    { id: "price_asc",  label: t.nftMarket.sortPriceAsc },
    { id: "price_desc", label: t.nftMarket.sortPriceDesc },
    { id: "rarity",     label: t.nftMarket.sortRarity },
  ];
}

function NftCard({ listing, onBuy, buying }: { listing: ApiListing; onBuy: (id: string) => void; buying: boolean }) {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const RARITY_CONFIG = getRarityConfig(t);
  const nft = listing.nft!;
  const rarity = RARITY_CONFIG[nft.rarity] ?? RARITY_CONFIG.COMMON;
  const isOwn = user?.id === listing.sellerId;

  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-700/10 hover:border-slate-600/30 transition-all group">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-800">
        <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${nft.id}/400/400`; }} />
        {/* Rarity badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-bold border"
          style={{ background: rarity.bg, color: rarity.color, borderColor: `${rarity.color}40` }}>
          {rarity.label}
        </div>
        {/* Collection tag */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs bg-black/50 text-slate-300 backdrop-blur-sm border border-slate-700/30">
          {nft.collection}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-white text-sm truncate">{nft.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">by @{listing.seller?.username}</p>
        </div>

        {/* Attributes preview */}
        {nft.attributes && Array.isArray(nft.attributes) && (nft.attributes as any[]).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(nft.attributes as any[]).slice(0, 3).map((attr, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded-md text-xs bg-slate-800 text-slate-400 border border-slate-700/30">
                {attr.trait_type}: {attr.value}
              </span>
            ))}
          </div>
        )}

        {/* Price + Buy */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/20">
          <div>
            <p className="text-xs text-slate-500">{t.nftMarket.price}</p>
            <p className="text-base font-bold font-mono" style={{ color: rarity.color }}>
              {parseFloat(listing.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-xs text-slate-400 ml-1">SFT</span>
            </p>
          </div>
          {isOwn ? (
            <span className="text-xs text-slate-500 border border-slate-700/30 px-2.5 py-1.5 rounded-xl">{t.nftMarket.yourNft}</span>
          ) : (
            <button
              onClick={() => onBuy(listing.id)}
              disabled={!isAuthenticated || buying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)" }}>
              {buying ? <RefreshCw size={11} className="animate-spin" /> : <ShoppingBag size={11} />}
              {t.nftMarket.buy}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function NFTMarketplacePage() {
  const { t } = useLang();
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // Filters
  const [sort, setSort] = useState("newest");
  const [rarity, setRarity] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true); else setLoadingMore(true);
    try {
      const res = await nftApi.getMarket({
        cursor, limit: 20, sort,
        rarity: rarity || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      });
      setListings(prev => cursor ? [...prev, ...res.listings] : res.listings);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch { /* ignore */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [sort, rarity, minPrice, maxPrice]);

  useEffect(() => {
    setListings([]);
    setNextCursor(null);
    fetchListings();
  }, [fetchListings]);

  const handleBuy = async (listingId: string) => {
    setBuyingId(listingId);
    try {
      const res = await nftApi.buy(listingId);
      toast.success(res.message);
      fetchListings();
    } catch (err: any) {
      toast.error(err?.message ?? t.nftMarket.purchaseFailed);
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(99,102,241,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}>
              <ShoppingBag size={20} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{t.nftMarket.title}</h1>
              <p className="text-xs text-slate-400">{listings.length} {t.nftMarket.activeListings}</p>
            </div>
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${showFilters ? "bg-purple-500/15 text-purple-400 border-purple-500/25" : "text-slate-400 border-slate-700/30 hover:text-white"}`}>
            <SlidersHorizontal size={13} /> {t.nftMarket.filters}
          </button>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-1.5 overflow-x-auto">
          {getSortOptions(t).map(s => (
            <button key={s.id} onClick={() => setSort(s.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${sort === s.id ? "bg-purple-500/15 text-purple-400 border border-purple-500/25" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Rarity filter */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.filterRarity}</label>
              <select value={rarity ?? ""} onChange={e => setRarity(e.target.value || undefined)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white focus:outline-none">
                <option value="">{t.nftMarket.filterAllRarities}</option>
                {Object.entries(getRarityConfig(t)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.filterMinPrice}</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white placeholder:text-slate-600 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">{t.nftMarket.filterMaxPrice}</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="∞"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/30 text-xs text-white placeholder:text-slate-600 focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setRarity(undefined); setMinPrice(""); setMaxPrice(""); }}
                className="w-full py-1.5 rounded-xl text-xs font-medium text-slate-400 border border-slate-700/30 hover:text-white hover:border-slate-600/50 transition-all">
                {t.nftMarket.clearFilters}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Listing grid */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
      ) : listings.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-slate-700/10">
          <ShoppingBag size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400">{t.nftMarket.noListings}</p>
          <p className="text-xs text-slate-600 mt-1">{t.nftMarket.noListingsSub}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map(listing => (
              <NftCard
                key={listing.id}
                listing={listing}
                onBuy={handleBuy}
                buying={buyingId === listing.id}
              />
            ))}
          </div>

          {hasMore && !loadingMore && (
            <button onClick={() => fetchListings(nextCursor ?? undefined)}
              className="w-full py-3 glass rounded-2xl text-sm font-semibold text-slate-400 border border-slate-700/10 hover:text-white hover:border-slate-600/30 transition-all">
              {t.nftMarket.loadMore}
            </button>
          )}
          {loadingMore && <div className="flex justify-center py-4"><RefreshCw size={16} className="text-slate-500 animate-spin" /></div>}
        </>
      )}
    </div>
  );
}

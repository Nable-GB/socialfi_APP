import { useState, useEffect, useCallback } from "react";
import { nftApi, type ApiNft } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Image, PlusCircle, Tag, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  COMMON:    { label: "Common",    color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  UNCOMMON:  { label: "Uncommon",  color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  RARE:      { label: "Rare",      color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  EPIC:      { label: "Epic",      color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  LEGENDARY: { label: "Legendary", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

// ─── Mint Form ────────────────────────────────────────────────────────────────

function MintForm({ onMinted }: { onMinted: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [collection, setCollection] = useState("SocialFi Genesis");
  const [rarity, setRarity] = useState("COMMON");
  const [loading, setLoading] = useState(false);

  const handleMint = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!imageUrl.trim()) { toast.error("Image URL is required"); return; }
    setLoading(true);
    try {
      await nftApi.mint({ name, description: description || undefined, imageUrl, collection, rarity });
      toast.success(`"${name}" minted successfully! 🎉`);
      setName(""); setDescription(""); setImageUrl("");
      onMinted();
    } catch (err: any) {
      toast.error(err?.message ?? "Mint failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <PlusCircle size={16} className="text-purple-400" />
        <h2 className="text-sm font-bold text-white">Mint New NFT</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="My Awesome NFT"
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Collection</label>
          <input value={collection} onChange={e => setCollection(e.target.value)} placeholder="SocialFi Genesis"
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Image URL *</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Describe your NFT..."
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Rarity</label>
          <select value={rarity} onChange={e => setRarity(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-purple-500/50">
            {Object.entries(RARITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={handleMint} disabled={loading}
            className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Minting...</> : <><PlusCircle size={13} /> Mint NFT</>}
          </button>
        </div>
      </div>

      {/* Preview */}
      {imageUrl && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/20">
          <img src={imageUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <p className="text-xs font-semibold text-white">{name || "Untitled"}</p>
            <p className="text-xs text-slate-500">{collection}</p>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ color: RARITY_CONFIG[rarity]?.color, background: RARITY_CONFIG[rarity]?.bg }}>{RARITY_CONFIG[rarity]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List Modal ───────────────────────────────────────────────────────────────

function ListModal({ nft, onClose, onListed }: { nft: ApiNft; onClose: () => void; onListed: () => void }) {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleList = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { toast.error("Enter a valid price"); return; }
    setLoading(true);
    try {
      await nftApi.listForSale(nft.id, p);
      toast.success(`"${nft.name}" listed for ${p} SFT!`);
      onListed();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Listing failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass rounded-2xl p-5 border border-slate-700/20 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <img src={nft.imageUrl} alt={nft.name} className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <p className="font-bold text-white text-sm">{nft.name}</p>
            <p className="text-xs text-slate-500">{nft.collection}</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">Listing price (SFT)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 100"
            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-slate-700/30 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleList} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
            {loading ? "Listing..." : `List for ${price || "?"} SFT`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NFT Card ─────────────────────────────────────────────────────────────────

function MyNftCard({ nft, onList, onCancelListing, cancelling }: {
  nft: ApiNft;
  onList: (nft: ApiNft) => void;
  onCancelListing: (listingId: string) => void;
  cancelling: boolean;
}) {
  const rarity = RARITY_CONFIG[nft.rarity] ?? RARITY_CONFIG.COMMON;
  const activeListing = nft.listings?.[0];

  return (
    <div className="glass rounded-2xl overflow-hidden border border-slate-700/10 hover:border-slate-600/30 transition-all group">
      <div className="relative aspect-square overflow-hidden bg-slate-800">
        <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${nft.id}/400/400`; }} />
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-bold border"
          style={{ background: rarity.bg, color: rarity.color, borderColor: `${rarity.color}40` }}>
          {rarity.label}
        </div>
        {activeListing && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
            Listed
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-white text-sm truncate">{nft.name}</h3>
          <p className="text-xs text-slate-500">{nft.collection}</p>
        </div>

        {activeListing ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Listed for</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{parseFloat(activeListing.price).toFixed(2)} SFT</span>
            </div>
            <button onClick={() => onCancelListing(activeListing.id)} disabled={cancelling}
              className="w-full py-1.5 rounded-xl text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
              {cancelling ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
              Cancel listing
            </button>
          </div>
        ) : (
          <button onClick={() => onList(nft)}
            className="w-full py-1.5 rounded-xl text-xs font-semibold text-purple-400 border border-purple-500/20 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-1.5">
            <Tag size={11} /> List for sale
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "collection" | "mint";

export function MyNFTsPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("collection");
  const [nfts, setNfts] = useState<ApiNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listingNft, setListingNft] = useState<ApiNft | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchNfts = useCallback(async (cursor?: string) => {
    if (!isAuthenticated) return;
    if (!cursor) setLoading(true);
    try {
      const res = await nftApi.getMyNfts({ cursor, limit: 20 });
      setNfts(prev => cursor ? [...prev, ...res.nfts] : res.nfts);
      setHasMore(res.hasMore);
      setNextCursor(res.nextCursor);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => { fetchNfts(); }, [fetchNfts]);

  const handleCancelListing = async (listingId: string) => {
    setCancellingId(listingId);
    try {
      await nftApi.cancelListing(listingId);
      toast.success("Listing cancelled");
      fetchNfts();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-slate-700/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(99,102,241,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}>
            <Image size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">My NFTs</h1>
            <p className="text-xs text-slate-400">{nfts.length} in your collection</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          {(["collection", "mint"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all capitalize ${tab === t ? "bg-purple-500/15 text-purple-400 border border-purple-500/25" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}>
              {t === "collection" ? `Collection (${nfts.length})` : "Mint New"}
            </button>
          ))}
        </div>
      </div>

      {tab === "mint" && <MintForm onMinted={() => { setTab("collection"); fetchNfts(); }} />}

      {tab === "collection" && (
        loading ? (
          <div className="flex justify-center py-16"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
        ) : nfts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-slate-700/10">
            <Image size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No NFTs in your collection</p>
            <button onClick={() => setTab("mint")}
              className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
              Mint your first NFT
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nfts.map(nft => (
                <MyNftCard
                  key={nft.id}
                  nft={nft}
                  onList={setListingNft}
                  onCancelListing={handleCancelListing}
                  cancelling={cancellingId === nft.listings?.[0]?.id}
                />
              ))}
            </div>
            {hasMore && (
              <button onClick={() => fetchNfts(nextCursor ?? undefined)}
                className="w-full py-3 glass rounded-2xl text-sm font-semibold text-slate-400 border border-slate-700/10 hover:text-white transition-all">
                Load more
              </button>
            )}
          </>
        )
      )}

      {listingNft && (
        <ListModal nft={listingNft} onClose={() => setListingNft(null)} onListed={() => fetchNfts()} />
      )}
    </div>
  );
}

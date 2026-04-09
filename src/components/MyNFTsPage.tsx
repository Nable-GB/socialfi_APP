import { useState, useEffect, useCallback } from "react";
import { nftApi, type ApiNft } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { Image, PlusCircle, Tag, XCircle, RefreshCw } from "lucide-react";
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

// ─── Mint Form ────────────────────────────────────────────────────────────────

function MintForm({ onMinted }: { onMinted: () => void }) {
  const { t } = useLang();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [collection, setCollection] = useState("SocialFi Genesis");
  const [rarity, setRarity] = useState("COMMON");
  const [loading, setLoading] = useState(false);

  const handleMint = async () => {
    if (!name.trim()) { toast.error(t.myNfts.errNameRequired); return; }
    if (!imageUrl.trim()) { toast.error(t.myNfts.errImageRequired); return; }
    setLoading(true);
    try {
      await nftApi.mint({ name, description: description || undefined, imageUrl, collection, rarity });
      toast.success(`"${name}" ${t.myNfts.mintSuccess} 🎉`);
      setName(""); setDescription(""); setImageUrl("");
      onMinted();
    } catch (err: any) {
      toast.error(err?.message ?? t.myNfts.errMintFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 border border-slate-700/10 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <PlusCircle size={16} className="text-purple-400" />
        <h2 className="text-sm font-bold text-white">{t.myNfts.mintTitle}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t.myNfts.fieldName}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t.myNfts.namePlaceholder}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t.myNfts.fieldCollection}</label>
          <input value={collection} onChange={e => setCollection(e.target.value)} placeholder={t.myNfts.collectionPlaceholder}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">{t.myNfts.fieldImageUrl}</label>
          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder={t.myNfts.imagePlaceholder}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">{t.myNfts.fieldDescription}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={t.myNfts.descriptionPlaceholder}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{t.myNfts.fieldRarity}</label>
          <select value={rarity} onChange={e => setRarity(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white focus:outline-none focus:border-purple-500/50">
            {Object.entries(getRarityConfig(t)).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={handleMint} disabled={loading}
            className="w-full py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
            {loading ? <><RefreshCw size={13} className="animate-spin" /> {t.myNfts.mintingBtn}</> : <><PlusCircle size={13} /> {t.myNfts.mintBtn}</>}
          </button>
        </div>
      </div>

      {/* Preview */}
      {imageUrl && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/20">
          <img src={imageUrl} alt="preview" className="w-12 h-12 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <p className="text-xs font-semibold text-white">{name || t.myNfts.untitled}</p>
            <p className="text-xs text-slate-500">{collection}</p>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ color: getRarityConfig(t)[rarity]?.color, background: getRarityConfig(t)[rarity]?.bg }}>{getRarityConfig(t)[rarity]?.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List Modal ───────────────────────────────────────────────────────────────

function ListModal({ nft, onClose, onListed }: { nft: ApiNft; onClose: () => void; onListed: () => void }) {
  const { t } = useLang();
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleList = async () => {
    const p = parseFloat(price);
    if (!p || p <= 0) { toast.error(t.myNfts.errInvalidPrice); return; }
    setLoading(true);
    try {
      await nftApi.listForSale(nft.id, p);
      toast.success(`"${nft.name}" ${t.myNfts.listingSuccess} ${p} SFT!`);
      onListed();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t.myNfts.errListingFailed);
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
          <label className="text-xs text-slate-400 mb-1.5 block">{t.myNfts.listingPrice}</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder={t.myNfts.listingPlaceholder}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 border border-slate-700/30 hover:text-white transition-colors">{t.myNfts.cancel}</button>
          <button onClick={handleList} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
            {loading ? t.myNfts.listingBtn : `${t.myNfts.listForPrice} ${price || t.myNfts.unknownPrice} SFT`}
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
  const { t } = useLang();
  const RARITY_CONFIG = getRarityConfig(t);
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
            {t.myNfts.listed}
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
              <span className="text-xs text-slate-500">{t.myNfts.listedFor}</span>
              <span className="text-sm font-bold font-mono text-emerald-400">{parseFloat(activeListing.price).toFixed(2)} SFT</span>
            </div>
            <button onClick={() => onCancelListing(activeListing.id)} disabled={cancelling}
              className="w-full py-1.5 rounded-xl text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40">
              {cancelling ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
              {t.myNfts.cancelListing}
            </button>
          </div>
        ) : (
          <button onClick={() => onList(nft)}
            className="w-full py-1.5 rounded-xl text-xs font-semibold text-purple-400 border border-purple-500/20 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-1.5">
            <Tag size={11} /> {t.myNfts.listForSale}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "collection" | "mint";

export function MyNFTsPage() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("collection");
  const [nfts, setNfts] = useState<ApiNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listingNft, setListingNft] = useState<ApiNft | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const canMintVirtualNfts = Boolean(
    user?.creatorAccessForced || ["CREATOR", "PRO", "PREMIUM"].includes((user?.subscriptionTier as string | undefined) ?? ""),
  );

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
      toast.success(t.myNfts.listingCancelled);
      fetchNfts();
    } catch (err: any) {
      toast.error(err?.message ?? t.myNfts.cancelFailed);
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
            <h1 className="text-xl font-bold text-white">{t.myNfts.title}</h1>
            <p className="text-xs text-slate-400">{nfts.length} {t.myNfts.inCollection}</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          {(["collection", "mint"] as Tab[]).map(tabId => {
            const mintLocked = tabId === "mint" && !canMintVirtualNfts;
            return (
              <button
                key={tabId}
                onClick={() => !mintLocked && setTab(tabId)}
                disabled={mintLocked}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all capitalize ${tab === tabId ? "bg-purple-500/15 text-purple-400 border border-purple-500/25" : "text-slate-500 hover:text-slate-300 border border-transparent"} ${mintLocked ? "cursor-not-allowed opacity-45 hover:text-slate-500" : ""}`}
              >
                {tabId === "collection" ? `${t.myNfts.tabCollection} (${nfts.length})` : t.myNfts.tabMint}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "mint" && (
        canMintVirtualNfts ? (
          <MintForm onMinted={() => { setTab("collection"); fetchNfts(); }} />
        ) : (
          <div className="glass rounded-2xl p-6 border border-amber-500/20 space-y-3" style={{ background: "rgba(245,158,11,0.06)" }}>
            <h2 className="text-sm font-bold text-amber-300">{t.myNfts.membershipRequiredTitle}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{t.myNfts.membershipRequiredBody}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
              <div className="rounded-xl px-3 py-2 border border-slate-700/20 bg-slate-900/20">{t.myNfts.freeBenefit}</div>
              <div className="rounded-xl px-3 py-2 border border-slate-700/20 bg-slate-900/20">{t.myNfts.paidBenefit}</div>
            </div>
          </div>
        )
      )}

      {tab === "collection" && (
        loading ? (
          <div className="flex justify-center py-16"><RefreshCw size={20} className="text-slate-500 animate-spin" /></div>
        ) : nfts.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border border-slate-700/10">
            <Image size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-400">{t.myNfts.noNFTs}</p>
            {canMintVirtualNfts && (
              <button onClick={() => setTab("mint")}
                className="mt-4 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
                {t.myNfts.mintFirst}
              </button>
            )}
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
                {t.myNfts.loadMore}
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

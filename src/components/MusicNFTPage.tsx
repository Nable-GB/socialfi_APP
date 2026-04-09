import { useState, useEffect } from "react";
import { Music, Coins, Users, ShoppingCart, TrendingUp, Gem } from "lucide-react";
import { musicApi, type ApiMusicNFT } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useLang } from "../contexts/LangContext";
import { toast } from "sonner";

function NFTCard({ nft, onBuy }: { nft: ApiMusicNFT; onBuy: (nft: ApiMusicNFT) => void }) {
  const { play } = usePlayer();
  const { t } = useLang();
  const soldOut = nft.availableSupply <= 0;
  const soldCount = nft.totalSupply - nft.availableSupply;
  const soldPercent = (soldCount / nft.totalSupply) * 100;
  const pricePerFraction = Number(nft.pricePerFraction || 0);
  const totalMarketValue = pricePerFraction * nft.totalSupply;
  const soldValue = pricePerFraction * soldCount;

  return (
    <div className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
      style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(100,116,139,0.15)" }}>
      {/* Cover */}
      <div className="relative aspect-[4/3]">
        {(nft.coverUrl || nft.track?.coverUrl) ? (
          <img src={nft.coverUrl || nft.track?.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-700/40 to-pink-700/40 flex items-center justify-center">
            <Gem size={40} className="text-purple-400" />
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-purple-500/80 text-[10px] font-bold text-white flex items-center gap-1">
          <Gem size={10} /> {t.musicNFT.nftBadge}
        </div>
        {nft.track?.audioUrl && (
          <button onClick={() => play({ id: nft.trackId, title: nft.track!.title, audioUrl: nft.track!.audioUrl, coverUrl: nft.track!.coverUrl, artist: nft.artist } as any)}
            className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] hover:bg-cyan-500/80 transition-colors flex items-center gap-1">
            <Music size={10} /> {t.musicNFT.preview}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="text-sm font-bold text-white truncate">{nft.name}</h3>
        <p className="text-[11px] text-slate-400 truncate">
          {nft.track?.title} · {nft.artist?.displayName || nft.artist?.username}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><Coins size={10} /> {pricePerFraction.toFixed(2)} {t.musicNFT.perFrac}</span>
          <span className="flex items-center gap-1"><Users size={10} /> {nft._count?.holders || 0}</span>
          <span className="flex items-center gap-1"><TrendingUp size={10} /> {nft.royaltyPercent}%</span>
        </div>

        <div className="rounded-lg border border-purple-500/15 bg-slate-900/40 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Market Price</span>
            <span className="text-[10px] text-slate-500">Live pricing</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded-md bg-slate-800/50 p-2 border border-slate-700/20">
              <p className="text-slate-500 mb-1">Per fraction</p>
              <p className="font-bold text-white">${pricePerFraction.toFixed(2)}</p>
            </div>
            <div className="rounded-md bg-slate-800/50 p-2 border border-slate-700/20">
              <p className="text-slate-500 mb-1">Market cap</p>
              <p className="font-bold text-cyan-400">${totalMarketValue.toFixed(2)}</p>
            </div>
            <div className="rounded-md bg-slate-800/50 p-2 border border-slate-700/20">
              <p className="text-slate-500 mb-1">Sold value</p>
              <p className="font-bold text-emerald-400">${soldValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Supply bar */}
        <div>
          <div className="flex justify-between text-[9px] text-slate-500 mb-1">
            <span>{soldCount}/{nft.totalSupply} {t.musicNFT.sold}</span>
            <span>{nft.availableSupply} {t.musicNFT.left}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-700/50">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${soldPercent}%` }} />
          </div>
        </div>

        {/* Buy button */}
        <button onClick={() => onBuy(nft)} disabled={soldOut}
          className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            soldOut ? "bg-slate-700/30 text-slate-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
          }`}>
          {soldOut ? t.musicNFT.soldOut : <><ShoppingCart size={12} /> {t.musicNFT.buyFraction}</>}
        </button>
      </div>
    </div>
  );
}

export function MusicNFTPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const [nfts, setNfts] = useState<ApiMusicNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setBuying] = useState<string | null>(null);

  const composerNfts = nfts.filter(nft => nft.track && nft.artist);

  useEffect(() => {
    musicApi.getMusicNFTs({ limit: 20 })
      .then(res => setNfts(res.nfts))
      .catch(() => toast.error(t.musicNFT.loadFailed))
      .finally(() => setLoading(false));
  }, [t.musicNFT.loadFailed]);

  const handleBuy = async (nft: ApiMusicNFT) => {
    if (!isAuthenticated) { toast.error(t.musicNFT.loginToBuy); return; }
    setBuying(nft.id);
    try {
      const res = await musicApi.buyMusicNFT(nft.id, 1);
      toast.success(res.message || t.musicNFT.purchaseSuccess);
      setNfts(ns => ns.map(n => n.id === nft.id ? { ...n, availableSupply: n.availableSupply - 1 } : n));
    } catch (err: any) {
      toast.error(err.message || t.musicNFT.purchaseFailed);
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gem size={24} className="text-purple-400" /> {t.musicNFT.title}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{t.musicNFT.subtitle}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl animate-pulse" style={{ background: "rgba(30,41,59,0.4)" }}>
              <div className="aspect-[4/3] bg-slate-700/30" />
              <div className="p-3 space-y-2"><div className="h-3 bg-slate-700/30 rounded w-3/4" /><div className="h-2 bg-slate-700/20 rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : composerNfts.length === 0 ? (
        <div className="text-center py-16">
          <Gem size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">{t.musicNFT.noNfts}</h3>
          <p className="text-sm text-slate-500 mt-1">{t.musicNFT.noNftsSub}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {composerNfts.map(nft => (
            <NFTCard key={nft.id} nft={nft} onBuy={handleBuy} />
          ))}
        </div>
      )}
    </div>
  );
}


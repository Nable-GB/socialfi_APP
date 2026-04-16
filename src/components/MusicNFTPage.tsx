import { useState, useEffect } from "react";
import { Music, Coins, TrendingUp, Gem } from "lucide-react";
import { musicApi, type ApiNFTHolder } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useLang } from "../contexts/LangContext";
import { toast } from "sonner";

function NFTCard({ holding }: { holding: ApiNFTHolder }) {
  const { play } = usePlayer();
  const { t } = useLang();
  const nft = holding.musicNft;

  if (!nft) return null;

  const pricePerFraction = Number(nft.pricePerFraction || 0);
  const purchasePrice = Number(holding.purchasePrice || 0);
  const royaltiesReceived = Number(holding.totalRoyaltyReceived || 0);
  const marketValue = pricePerFraction * Number(holding.fractions || 0);

  return (
    <div className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
      style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(100,116,139,0.15)" }}>
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
          <button onClick={() => play({ id: nft.trackId, title: nft.track!.title, audioUrl: nft.track!.audioUrl, coverUrl: nft.track!.coverUrl, artist: nft.artist, lyrics: nft.track?.lyrics } as any)}
            className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] hover:bg-cyan-500/80 transition-colors flex items-center gap-1">
            <Music size={10} /> {t.musicNFT.preview}
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h3 className="text-sm font-bold text-white truncate">{nft.name}</h3>
        <p className="text-[11px] text-slate-400 truncate">
          {nft.track?.title} · {nft.artist?.displayName || nft.artist?.username}
        </p>

        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><Coins size={10} /> {holding.fractions} {t.revenue?.fractions || "fractions"}</span>
          <span className="flex items-center gap-1"><Coins size={10} /> {pricePerFraction.toFixed(2)} SMFI</span>
          <span className="flex items-center gap-1"><TrendingUp size={10} /> {nft.royaltyPercent}%</span>
        </div>

        <div className="rounded-lg border border-purple-500/15 bg-slate-900/40 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Holding Overview</span>
            <span className="text-[10px] text-slate-500">Purchased NFT</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="rounded-md bg-slate-800/50 p-2 border border-slate-700/20">
              <p className="text-slate-500 mb-1">Purchase price</p>
              <p className="font-bold text-white">{purchasePrice.toFixed(2)} SMFI</p>
            </div>
            <div className="rounded-md bg-slate-800/50 p-2 border border-slate-700/20">
              <p className="text-slate-500 mb-1">Current value</p>
              <p className="font-bold text-cyan-400">{marketValue.toFixed(2)} SMFI</p>
            </div>
            <div className="rounded-md bg-slate-800/50 p-2 border border-slate-700/20">
              <p className="text-slate-500 mb-1">Royalties</p>
              <p className="font-bold text-emerald-400">{royaltiesReceived.toFixed(2)} SMFI</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MusicNFTPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const [holdings, setHoldings] = useState<ApiNFTHolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setHoldings([]);
      setLoading(false);
      return;
    }

    musicApi.getMyMusicNFTs()
      .then(res => setHoldings(res.holdings.filter(holding => holding.musicNft && holding.musicNft.track && holding.musicNft.artist)))
      .catch(() => toast.error(t.musicNFT.loadFailed))
      .finally(() => setLoading(false));
  }, [isAuthenticated, t.musicNFT.loadFailed]);

  return (
    <div className="max-w-5xl mx-auto px-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gem size={24} className="text-purple-400" /> {t.musicNFT.title}
        </h1>
        <p className="text-sm text-slate-400 mt-1">Purchased music NFTs from your collection</p>
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
      ) : holdings.length === 0 ? (
        <div className="text-center py-16">
          <Gem size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No purchased music NFTs yet</h3>
          <p className="text-sm text-slate-500 mt-1">Only music NFTs you have purchased are shown here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {holdings.map(holding => (
            <NFTCard key={holding.id} holding={holding} />
          ))}
        </div>
      )}
    </div>
  );
}


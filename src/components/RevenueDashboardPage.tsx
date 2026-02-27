import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Music, Gem, Zap, Share2, BarChart3, Play, Users, Loader2 } from "lucide-react";
import { musicApi, type ApiRevenueSummary, type ApiFanSummary, type ApiNFTHolder } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(100,116,139,0.12)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function ArtistDashboard() {
  const [data, setData] = useState<{ summary: ApiRevenueSummary; tracks: any[]; nfts: any[]; distributions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    musicApi.getArtistRevenue()
      .then(setData)
      .catch(() => toast.error("Failed to load revenue"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>;
  if (!data) return <p className="text-center text-slate-500 py-8">No data</p>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${s.totalRevenue}`} color="#22d3ee" />
        <StatCard icon={Play} label="Total Plays" value={s.totalPlays.toLocaleString()} color="#a855f7" sub={`${s.totalTracks} tracks`} />
        <StatCard icon={Music} label="Streaming Revenue" value={`$${s.streamingRevenue}`} color="#10b981" sub="$0.004/play" />
        <StatCard icon={Gem} label="NFT Sales" value={`$${s.nftSalesRevenue}`} color="#f59e0b" />
        <StatCard icon={Zap} label="Boost Revenue" value={`${s.boostRevenue} tokens`} color="#06b6d4" />
        <StatCard icon={Share2} label="Repost Rewards" value={`${s.repostRewards} tokens`} color="#8b5cf6" />
        <StatCard icon={Users} label="Royalty Paid" value={`${s.totalRoyaltyPaid} tokens`} color="#ec4899" sub="To NFT holders" />
        <StatCard icon={TrendingUp} label="Tracks" value={String(s.totalTracks)} color="#64748b" />
      </div>

      {/* Top tracks */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Performing Tracks</h3>
        <div className="space-y-2">
          {data.tracks.slice(0, 10).map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(30,41,59,0.3)", border: "1px solid rgba(100,116,139,0.08)" }}>
              {t.coverUrl ? (
                <img src={t.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center flex-shrink-0">
                  <Music size={16} className="text-slate-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{t.title}</p>
                <div className="flex gap-3 text-[10px] text-slate-500">
                  <span>{t.playCount.toLocaleString()} plays</span>
                  <span>{t.likeCount} likes</span>
                  <span>{t.boostCount} boosts</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                t.status === "PUBLISHED" ? "bg-green-500/15 text-green-400" :
                t.status === "RELEASE_CANDIDATE" ? "bg-purple-500/15 text-purple-400" :
                "bg-slate-500/15 text-slate-400"
              }`}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution status */}
      {data.distributions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Distribution Status</h3>
          <div className="space-y-2">
            {data.distributions.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "rgba(30,41,59,0.3)", border: "1px solid rgba(100,116,139,0.08)" }}>
                <div>
                  <p className="text-xs text-white">{d.track?.title}</p>
                  <p className="text-[10px] text-slate-500">{d.platform}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  d.status === "LIVE" ? "bg-green-500/15 text-green-400" :
                  d.status === "PENDING" ? "bg-yellow-500/15 text-yellow-400" :
                  d.status === "REJECTED" ? "bg-red-500/15 text-red-400" :
                  "bg-blue-500/15 text-blue-400"
                }`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FanDashboard() {
  const [data, setData] = useState<{ summary: ApiFanSummary; holdings: ApiNFTHolder[]; recentPayouts: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState<string | null>(null);

  useEffect(() => {
    musicApi.getFanRevenue()
      .then(setData)
      .catch(() => toast.error("Failed to load fan revenue"))
      .finally(() => setLoading(false));
  }, []);

  const handleStake = async (nftId: string) => {
    setStaking(nftId);
    try {
      const res = await musicApi.toggleStake(nftId);
      toast.success(res.isStaked ? "NFT staked!" : "NFT unstaked");
      // Refresh
      const updated = await musicApi.getFanRevenue();
      setData(updated);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setStaking(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>;
  if (!data) return <p className="text-center text-slate-500 py-8">No data</p>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Gem} label="NFTs Held" value={String(s.totalNFTsHeld)} color="#a855f7" sub={`${s.totalFractionsOwned} fractions`} />
        <StatCard icon={DollarSign} label="Royalties Received" value={`${s.totalRoyaltiesReceived} tokens`} color="#22d3ee" />
        <StatCard icon={Share2} label="Repost Rewards" value={`${s.repostRewards} tokens`} color="#10b981" />
        <StatCard icon={Zap} label="Boost Spent" value={`${s.boostSpent} tokens`} color="#f59e0b" />
        <StatCard icon={BarChart3} label="Engagement Score" value={String(s.engagementScore.toFixed(0))} color="#8b5cf6" sub="/100" />
        <StatCard icon={Users} label="Staked NFTs" value={String(s.stakedNFTs)} color="#ec4899" />
      </div>

      {/* Holdings */}
      {data.holdings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Your Music NFTs</h3>
          <div className="space-y-2">
            {data.holdings.map((h: any) => (
              <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(30,41,59,0.3)", border: "1px solid rgba(100,116,139,0.08)" }}>
                {h.musicNft?.track?.coverUrl ? (
                  <img src={h.musicNft.track.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-700/40 to-pink-700/40 flex items-center justify-center flex-shrink-0">
                    <Gem size={18} className="text-purple-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{h.musicNft?.name}</p>
                  <p className="text-[10px] text-slate-500">{h.fractions} fraction(s) · {h.musicNft?.artist?.displayName || h.musicNft?.artist?.username}</p>
                  <p className="text-[10px] text-cyan-400">Royalties: {Number(h.totalRoyaltyReceived).toFixed(2)} tokens</p>
                </div>
                <button onClick={() => handleStake(h.musicNftId)} disabled={staking === h.musicNftId}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors flex items-center gap-1 ${
                    h.isStaked ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" : "bg-slate-700/30 text-slate-400 border border-slate-700/20 hover:text-white"
                  }`}>
                  {staking === h.musicNftId ? <Loader2 size={10} className="animate-spin" /> : h.isStaked ? "Unstake" : "Stake"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payouts */}
      {data.recentPayouts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Royalty Payouts</h3>
          <div className="space-y-1.5">
            {data.recentPayouts.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(30,41,59,0.2)" }}>
                <span className="text-xs text-slate-400">{p.musicNft?.track?.title || p.musicNft?.name}</span>
                <span className="text-xs font-bold text-cyan-400">+{Number(p.amount).toFixed(2)} tokens</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RevenueDashboardPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<"artist" | "fan">("artist");

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">Login to view your revenue</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-cyan-400" /> Revenue Dashboard
        </h1>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "rgba(30,41,59,0.6)" }}>
          {(["artist", "fan"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === t ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
              }`}>
              {t === "artist" ? "Artist" : "Fan"}
            </button>
          ))}
        </div>
      </div>

      {tab === "artist" ? <ArtistDashboard /> : <FanDashboard />}
    </div>
  );
}

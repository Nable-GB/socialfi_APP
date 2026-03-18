import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Music, Gem, Zap, Share2, BarChart3, Play, Users, Loader2 } from "lucide-react";
import { musicApi, type ApiRevenueSummary, type ApiFanSummary, type ApiNFTHolder } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
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
  const { t } = useLang();
  const [data, setData] = useState<{ summary: ApiRevenueSummary; tracks: any[]; nfts: any[]; distributions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    musicApi.getArtistRevenue()
      .then(setData)
      .catch(() => toast.error(t.revenue.loadFailed))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>;
  if (!data) return <p className="text-center text-slate-500 py-8">{t.revenue.noData}</p>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label={t.revenue.totalRevenue} value={`$${s.totalRevenue}`} color="#22d3ee" />
        <StatCard icon={Play} label={t.revenue.totalPlays} value={s.totalPlays.toLocaleString()} color="#a855f7" sub={`${s.totalTracks} ${t.revenue.tracks}`} />
        <StatCard icon={Music} label={t.revenue.streamingRevenue} value={`$${s.streamingRevenue}`} color="#10b981" sub={t.revenue.perPlay} />
        <StatCard icon={Gem} label={t.revenue.nftSales} value={`$${s.nftSalesRevenue}`} color="#f59e0b" />
        <StatCard icon={Zap} label={t.revenue.boostRevenue} value={`${s.boostRevenue} tokens`} color="#06b6d4" />
        <StatCard icon={Share2} label={t.revenue.repostRewards} value={`${s.repostRewards} tokens`} color="#8b5cf6" />
        <StatCard icon={Users} label={t.revenue.royaltyPaid} value={`${s.totalRoyaltyPaid} tokens`} color="#ec4899" sub={t.revenue.toNFTHolders} />
        <StatCard icon={TrendingUp} label={t.revenue.tracks} value={String(s.totalTracks)} color="#64748b" />
      </div>

      {/* Top tracks */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.revenue.topTracks}</h3>
        <div className="space-y-2">
          {data.tracks.slice(0, 10).map((tr: any) => (
            <div key={tr.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "rgba(30,41,59,0.3)", border: "1px solid rgba(100,116,139,0.08)" }}>
              {tr.coverUrl ? (
                <img src={tr.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center flex-shrink-0">
                  <Music size={16} className="text-slate-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{tr.title}</p>
                <div className="flex gap-3 text-[10px] text-slate-500">
                  <span>{tr.playCount.toLocaleString()} {t.revenue.plays}</span>
                  <span>{tr.likeCount} {t.revenue.likes}</span>
                  <span>{tr.boostCount} {t.revenue.boosts}</span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                tr.status === "PUBLISHED" ? "bg-green-500/15 text-green-400" :
                tr.status === "RELEASE_CANDIDATE" ? "bg-purple-500/15 text-purple-400" :
                "bg-slate-500/15 text-slate-400"
              }`}>{tr.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution status */}
      {data.distributions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.revenue.distStatus}</h3>
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
  const { t } = useLang();
  const [data, setData] = useState<{ summary: ApiFanSummary; holdings: ApiNFTHolder[]; recentPayouts: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [staking, setStaking] = useState<string | null>(null);

  useEffect(() => {
    musicApi.getFanRevenue()
      .then(setData)
      .catch(() => toast.error(t.revenue.fanLoadFailed))
      .finally(() => setLoading(false));
  }, []);

  const handleStake = async (nftId: string) => {
    setStaking(nftId);
    try {
      const res = await musicApi.toggleStake(nftId);
      toast.success(res.isStaked ? t.revenue.stakeSuccess : t.revenue.unstakeSuccess);
      const updated = await musicApi.getFanRevenue();
      setData(updated);
    } catch (err: any) {
      toast.error(err.message || t.revenue.stakeFailed);
    } finally {
      setStaking(null);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-cyan-400" size={32} /></div>;
  if (!data) return <p className="text-center text-slate-500 py-8">{t.revenue.noData}</p>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Gem} label={t.revenue.nftsHeld} value={String(s.totalNFTsHeld)} color="#a855f7" sub={`${s.totalFractionsOwned} ${t.revenue.fractions}`} />
        <StatCard icon={DollarSign} label={t.revenue.royaltiesReceived} value={`${s.totalRoyaltiesReceived} tokens`} color="#22d3ee" />
        <StatCard icon={Share2} label={t.revenue.repostRewards} value={`${s.repostRewards} tokens`} color="#10b981" />
        <StatCard icon={Zap} label={t.revenue.boostSpent} value={`${s.boostSpent} tokens`} color="#f59e0b" />
        <StatCard icon={BarChart3} label={t.revenue.engagementScore} value={String(s.engagementScore.toFixed(0))} color="#8b5cf6" sub="/100" />
        <StatCard icon={Users} label={t.revenue.stakedNFTs} value={String(s.stakedNFTs)} color="#ec4899" />
      </div>

      {/* Holdings */}
      {data.holdings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.revenue.yourNFTs}</h3>
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
                  <p className="text-[10px] text-slate-500">{h.fractions} {t.revenue.fractions} · {h.musicNft?.artist?.displayName || h.musicNft?.artist?.username}</p>
                  <p className="text-[10px] text-cyan-400">{t.revenue.royalties} {Number(h.totalRoyaltyReceived).toFixed(2)} tokens</p>
                </div>
                <button onClick={() => handleStake(h.musicNftId)} disabled={staking === h.musicNftId}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors flex items-center gap-1 ${
                    h.isStaked ? "bg-pink-500/15 text-pink-400 border border-pink-500/30" : "bg-slate-700/30 text-slate-400 border border-slate-700/20 hover:text-white"
                  }`}>
                  {staking === h.musicNftId ? <Loader2 size={10} className="animate-spin" /> : h.isStaked ? t.revenue.unstake : t.revenue.stake}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent payouts */}
      {data.recentPayouts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.revenue.recentPayouts}</h3>
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
  const { t } = useLang();
  const [tab, setTab] = useState<"artist" | "fan">("artist");

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <BarChart3 size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">{t.revenue.loginToView}</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-cyan-400" /> {t.revenue.title}
        </h1>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "rgba(30,41,59,0.6)" }}>
          {(["artist", "fan"] as const).map(tab => (
            <button key={tab} onClick={() => setTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === tab ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
              }`}>
              {tab === "artist" ? t.revenue.artistTab : t.revenue.fanTab}
            </button>
          ))}
        </div>
      </div>

      {tab === "artist" ? <ArtistDashboard /> : <FanDashboard />}
    </div>
  );
}

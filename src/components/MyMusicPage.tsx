import { useState, useEffect } from "react";
import { Music, Play, Pause, Heart, MessageCircle, Trash2, Youtube, Loader2, ExternalLink, Clock, CheckCircle, AlertCircle, Gem, Globe } from "lucide-react";
import { musicApi, type ApiTrack } from "../lib/api";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

function formatDuration(sec?: number): string {
  if (!sec) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    PUBLISHED: "bg-green-500/15 text-green-400 border-green-500/30",
    ARCHIVED: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}

function DistributionBadge({ status, url }: { status: string; url?: string }) {
  const map: Record<string, { icon: any; color: string; label: string }> = {
    PENDING: { icon: Clock, color: "text-yellow-400", label: "Queued" },
    SUBMITTED: { icon: Loader2, color: "text-blue-400", label: "Processing" },
    LIVE: { icon: CheckCircle, color: "text-green-400", label: "Live" },
    REJECTED: { icon: AlertCircle, color: "text-red-400", label: "Rejected" },
    REMOVED: { icon: AlertCircle, color: "text-slate-400", label: "Removed" },
  };
  const info = map[status] || map.PENDING;
  const Icon = info.icon;

  return (
    <div className={`flex items-center gap-1.5 text-xs ${info.color}`}>
      <Youtube size={14} />
      <Icon size={12} className={status === "SUBMITTED" ? "animate-spin" : ""} />
      <span>{info.label}</span>
      {url && status === "LIVE" && (
        <a href={url} target="_blank" rel="noopener" className="hover:underline"><ExternalLink size={10} /></a>
      )}
    </div>
  );
}

export function MyMusicPage() {
  const { isAuthenticated } = useAuth();
  const { currentTrack, isPlaying, play, pause, resume, setQueue } = usePlayer();
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [distributing, setDistributing] = useState<string | null>(null);
  const [minting, setMinting] = useState<string | null>(null);
  const [distModalTrack, setDistModalTrack] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    musicApi.getMyTracks()
      .then(res => setTracks(res.tracks))
      .catch(() => toast.error("Failed to load tracks"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <Music size={48} className="mx-auto text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">Login to view your music</h3>
      </div>
    );
  }

  const filtered = filter === "ALL" ? tracks : tracks.filter(t => t.status === filter);

  const handlePlay = (track: ApiTrack) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      setQueue(filtered.filter(t => t.status === "PUBLISHED"));
      play(track);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    try {
      await musicApi.deleteTrack(id);
      setTracks(ts => ts.filter(t => t.id !== id));
      toast.success("Track deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handlePublish = async (id: string) => {
    try {
      await musicApi.updateTrack(id, { status: "PUBLISHED" } as any);
      setTracks(ts => ts.map(t => t.id === id ? { ...t, status: "PUBLISHED" as const } : t));
      toast.success("Track published!");
    } catch { toast.error("Failed to publish"); }
  };

  const handleGlobalDistribute = async (id: string, platform: string) => {
    setDistributing(id);
    setDistModalTrack(null);
    try {
      const res = await musicApi.submitDistribution(id, platform);
      toast.success(res.message);
      const updated = await musicApi.getMyTracks();
      setTracks(updated.tracks);
    } catch (err: any) {
      toast.error(err.message || "Distribution failed");
    } finally {
      setDistributing(null);
    }
  };

  const handleMintNFT = async (track: ApiTrack) => {
    setMinting(track.id);
    try {
      await musicApi.mintMusicNFT({
        trackId: track.id,
        name: `${track.title} NFT`,
        description: `Fractional ownership of "${track.title}"`,
        coverUrl: track.coverUrl,
        totalSupply: 100,
        pricePerFraction: 5,
        royaltyPercent: 10,
      });
      toast.success("Music NFT minted! Available in NFT marketplace.");
    } catch (err: any) {
      toast.error(err.message || "Mint failed");
    } finally {
      setMinting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Music size={24} className="text-cyan-400" /> My Music
        </h1>
        <span className="text-sm text-slate-500">{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["ALL", "PUBLISHED", "DRAFT"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800/40 text-slate-400 border border-slate-700/20"
            }`}>
            {f === "ALL" ? `All (${tracks.length})` : `${f} (${tracks.filter(t => t.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(30,41,59,0.4)" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Music size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No tracks yet</h3>
          <p className="text-sm text-slate-500 mt-1">Upload your first AI-generated track!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(track => (
            <div key={track.id}
              className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-slate-800/40"
              style={{ background: "rgba(30,41,59,0.3)", border: "1px solid rgba(100,116,139,0.1)" }}>
              {/* Cover + play */}
              <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer group" onClick={() => handlePlay(track)}>
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center">
                    <Music size={20} className="text-slate-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {currentTrack?.id === track.id && isPlaying
                    ? <Pause size={16} className="text-white" />
                    : <Play size={16} className="text-white ml-0.5" />}
                </div>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate">{track.title}</h3>
                  <StatusBadge status={track.status} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                  <span>{track.genre}</span>
                  <span>{formatDuration(track.duration)}</span>
                  <span className="flex items-center gap-0.5"><Play size={9} /> {track.playCount}</span>
                  <span className="flex items-center gap-0.5"><Heart size={9} /> {track.likeCount}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle size={9} /> {track.commentCount}</span>
                </div>
                {/* YouTube distribution status */}
                {track.distributions && track.distributions.length > 0 && (
                  <div className="mt-1">
                    <DistributionBadge status={track.distributions[0].status} url={track.distributions[0].youtubeUrl} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {track.status === "DRAFT" && (
                  <button onClick={() => handlePublish(track.id)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 transition-colors">
                    Publish
                  </button>
                )}
                {track.status === "PUBLISHED" && (
                  <>
                    <button onClick={() => handleMintNFT(track)} disabled={minting === track.id}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition-colors flex items-center gap-1 disabled:opacity-40">
                      {minting === track.id ? <Loader2 size={10} className="animate-spin" /> : <Gem size={10} />}
                      Mint NFT
                    </button>
                    <button onClick={() => setDistModalTrack(track.id)} disabled={distributing === track.id}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors flex items-center gap-1 disabled:opacity-40">
                      {distributing === track.id ? <Loader2 size={10} className="animate-spin" /> : <Globe size={10} />}
                      Distribute
                    </button>
                  </>
                )}
                <button onClick={() => handleDelete(track.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distribution platform modal */}
      {distModalTrack && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => setDistModalTrack(null)}>
          <div className="rounded-2xl p-5 w-[320px] space-y-3" style={{ background: "rgba(15,23,42,0.98)", border: "1px solid rgba(100,116,139,0.2)" }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe size={16} className="text-blue-400" /> Distribute to Platform</h3>
            {["YOUTUBE_MUSIC", "SPOTIFY", "APPLE_MUSIC", "AMAZON_MUSIC", "TIDAL", "DEEZER"].map(pl => (
              <button key={pl} onClick={() => handleGlobalDistribute(distModalTrack, pl)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-medium text-left transition-all hover:bg-slate-700/40 flex items-center gap-2"
                style={{ background: "rgba(30,41,59,0.4)", border: "1px solid rgba(100,116,139,0.1)" }}>
                {pl === "YOUTUBE_MUSIC" && <Youtube size={14} className="text-red-400" />}
                {pl === "SPOTIFY" && <Music size={14} className="text-green-400" />}
                {pl === "APPLE_MUSIC" && <Music size={14} className="text-pink-400" />}
                {pl === "AMAZON_MUSIC" && <Music size={14} className="text-blue-400" />}
                {pl === "TIDAL" && <Music size={14} className="text-cyan-400" />}
                {pl === "DEEZER" && <Music size={14} className="text-purple-400" />}
                <span className="text-slate-300">{pl.replace(/_/g, " ")}</span>
              </button>
            ))}
            <button onClick={() => setDistModalTrack(null)} className="w-full py-2 text-xs text-slate-500 hover:text-white transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

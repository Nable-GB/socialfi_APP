import { useState, useEffect, useCallback } from "react";
import { Search, TrendingUp, Clock, Heart, Play, Pause, Music, Sparkles, MessageCircle } from "lucide-react";
import { musicApi, type ApiTrack } from "../lib/api";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

const GENRES = [
  { value: "", label: "All" },
  { value: "POP", label: "Pop" },
  { value: "HIPHOP", label: "Hip-Hop" },
  { value: "RNB", label: "R&B" },
  { value: "EDM", label: "EDM" },
  { value: "ROCK", label: "Rock" },
  { value: "JAZZ", label: "Jazz" },
  { value: "LOFI", label: "Lo-Fi" },
  { value: "AMBIENT", label: "Ambient" },
  { value: "EXPERIMENTAL", label: "Experimental" },
  { value: "OTHER", label: "Other" },
];

function formatDuration(sec?: number): string {
  if (!sec) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function TrackCard({ track, onPlay, isCurrentTrack, isPlaying }: {
  track: ApiTrack;
  onPlay: (t: ApiTrack) => void;
  isCurrentTrack: boolean;
  isPlaying: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(track.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(track.likeCount || 0);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { toast.error("Login to like tracks"); return; }
    try {
      const res = await musicApi.toggleLike(track.id);
      setLiked(res.liked);
      setLikeCount(c => res.liked ? c + 1 : c - 1);
    } catch { toast.error("Failed to like"); }
  };

  return (
    <div
      className={`group relative rounded-xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer ${
        isCurrentTrack ? "ring-2 ring-cyan-500/50" : ""
      }`}
      style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(100,116,139,0.15)" }}
      onClick={() => onPlay(track)}
    >
      {/* Cover */}
      <div className="relative aspect-square">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center">
            <Music size={40} className="text-slate-500" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
            {isCurrentTrack && isPlaying ? <Pause size={20} className="text-white" /> : <Play size={20} className="text-white ml-0.5" />}
          </div>
        </div>
        {/* AI badge */}
        {track.isAiGenerated && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-purple-500/80 text-[9px] font-bold text-white flex items-center gap-1">
            <Sparkles size={10} /> AI
          </div>
        )}
        {/* Duration */}
        <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded">
          {formatDuration(track.duration)}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white truncate">{track.title}</h3>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {track.artist?.displayName || track.artist?.username}
          {track.aiModel && <span className="text-purple-400"> · {track.aiModel}</span>}
        </p>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><Play size={10} /> {track.playCount.toLocaleString()}</span>
          <button onClick={handleLike} className={`flex items-center gap-1 transition-colors ${liked ? "text-red-400" : "hover:text-red-400"}`}>
            <Heart size={10} fill={liked ? "currentColor" : "none"} /> {likeCount}
          </button>
          <span className="flex items-center gap-1"><MessageCircle size={10} /> {track.commentCount}</span>
        </div>
      </div>
    </div>
  );
}

export function MusicFeedPage() {
  const [tracks, setTracks] = useState<ApiTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [sort, setSort] = useState<"latest" | "trending" | "top">("latest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { currentTrack, isPlaying, play, pause, resume, setQueue } = usePlayer();

  const fetchTracks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicApi.getTracks({ page, genre: genre || undefined, search: search || undefined, sort, limit: 20 });
      setTracks(res.tracks);
      setTotalPages(res.pagination.pages);
    } catch (err) {
      toast.error("Failed to load tracks");
    } finally {
      setLoading(false);
    }
  }, [page, genre, search, sort]);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const handlePlay = (track: ApiTrack) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      setQueue(tracks);
      play(track);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Music size={24} className="text-cyan-400" /> Discover Music
        </h1>
        <p className="text-sm text-slate-400 mt-1">AI-generated tracks from the community</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tracks, artists..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/30 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div className="flex gap-2">
          {(["latest", "trending", "top"] as const).map(s => (
            <button key={s} onClick={() => { setSort(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                sort === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-800/40 text-slate-400 border border-slate-700/20 hover:text-white"
              }`}>
              {s === "latest" && <Clock size={12} />}
              {s === "trending" && <TrendingUp size={12} />}
              {s === "top" && <Heart size={12} />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Genre pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {GENRES.map(g => (
          <button key={g.value} onClick={() => { setGenre(g.value); setPage(1); }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              genre === g.value ? "bg-cyan-500 text-white" : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700/20"
            }`}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Tracks Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: "rgba(30,41,59,0.4)" }}>
              <div className="aspect-square bg-slate-700/30" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-700/30 rounded w-3/4" />
                <div className="h-2 bg-slate-700/20 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16">
          <Music size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No tracks found</h3>
          <p className="text-sm text-slate-500 mt-1">Be the first to upload your AI-generated music!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={handlePlay}
                isCurrentTrack={currentTrack?.id === track.id}
                isPlaying={currentTrack?.id === track.id && isPlaying}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/50 text-slate-400 disabled:opacity-30 hover:text-white border border-slate-700/20">
                Prev
              </button>
              <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-800/50 text-slate-400 disabled:opacity-30 hover:text-white border border-slate-700/20">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

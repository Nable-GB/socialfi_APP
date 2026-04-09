import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, ChevronDown, Volume2, VolumeX, Heart, Share2, ListMusic } from "lucide-react";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { musicApi } from "../lib/api";
import { toast } from "sonner";

function formatTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Waveform visualizer bars
function WaveformBars({ playing }: { playing: boolean }) {
  const bars = Array.from({ length: 32 }, (_, i) => ({
    h: 30 + Math.random() * 70,
    speed: 0.4 + Math.random() * 0.6,
    delay: i * 0.05,
  }));

  return (
    <div className="flex items-end justify-center gap-[2px] h-12 w-full max-w-xs mx-auto mt-6 mb-2">
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`waveform-bar w-[3px] rounded-full ${playing ? "" : "paused"}`}
          style={{
            "--bar-h": `${bar.h}%`,
            "--bar-speed": `${bar.speed}s`,
            animationDelay: `${bar.delay}s`,
            background: `linear-gradient(to top, #22d3ee, #6366f1)`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function NowPlayingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentTrack, isPlaying, currentTime, duration, volume, pause, resume, seek, setVolume, playNext, playPrev, queue } = usePlayer();
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const [closing, setClosing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  if (!open || !currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onClose();
    }, 300);
  };

  const handleLike = async () => {
    if (!isAuthenticated) { toast.error(t.musicFeed.loginToLike); return; }
    try {
      const res = await musicApi.toggleLike(currentTrack.id);
      setLiked(res.liked);
      toast.success(res.liked ? t.player.addedToFavorites : t.player.removedFromFavorites);
    } catch { toast.error(t.player.failed); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  };

  const currentIdx = queue.findIndex(t => t.id === currentTrack.id);

  return (
    <div className="fixed inset-0 z-[100] fade-in" onClick={handleClose}>
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

      {/* Background glow from album art */}
      {currentTrack.coverUrl && (
        <div className="absolute inset-0 overflow-hidden opacity-20">
          <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover blur-[80px] scale-150" />
        </div>
      )}

      {/* Modal content */}
      <div
        className={`relative h-full flex flex-col ${closing ? "slide-down-modal" : "slide-up-modal"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <button onClick={handleClose} className="p-2 -ml-2 rounded-full text-slate-400 hover:text-white transition-colors">
            <ChevronDown size={24} />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[3px] text-slate-500 font-medium">{t.player.nowPlaying}</p>
            {currentIdx >= 0 && (
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">{currentIdx + 1} / {queue.length}</p>
            )}
          </div>
          <button onClick={() => setShowQueue(!showQueue)} className={`p-2 -mr-2 rounded-full transition-colors ${showQueue ? "text-cyan-400" : "text-slate-400 hover:text-white"}`}>
            <ListMusic size={20} />
          </button>
        </div>

        {showQueue ? (
          /* ── Queue list ────────────────────────────── */
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.player.queue}</h3>
            <div className="space-y-1">
              {queue.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${t.id === currentTrack.id ? "bg-cyan-500/10 border border-cyan-500/20" : "hover:bg-white/5"}`}>
                  <span className="text-xs font-mono text-slate-600 w-5 text-right">{i + 1}</span>
                  {t.coverUrl ? (
                    <img src={t.coverUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center text-xs">♪</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${t.id === currentTrack.id ? "text-cyan-400 font-medium" : "text-white"}`}>{t.title}</p>
                    <p className="text-xs text-slate-500 truncate">{t.artist?.displayName || t.artist?.username}</p>
                  </div>
                  {t.id === currentTrack.id && isPlaying && (
                    <div className="flex items-end gap-[2px] h-4">
                      {[0.6, 0.4, 0.8, 0.5].map((h, j) => (
                        <div key={j} className="waveform-bar w-[2px] rounded-full bg-cyan-400" style={{ "--bar-h": `${h * 100}%`, "--bar-speed": `${0.3 + j * 0.15}s` } as React.CSSProperties} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Main player view ──────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            {/* Album art with rotation */}
            <div className="relative mb-8">
              <div className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden glow-pulse album-spin ${isPlaying ? "" : "paused"}`}
                style={{ border: "4px solid rgba(34,211,238,0.15)" }}>
                {currentTrack.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-900/60 to-purple-900/60 flex items-center justify-center">
                    <span className="text-6xl">♪</span>
                  </div>
                )}
              </div>
              {/* Center hole (vinyl effect) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#030711] border-2 border-slate-800/50" />
            </div>

            {/* Track info */}
            <div className="text-center mb-2 max-w-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
              <p className="text-sm text-slate-400 mt-1">{currentTrack.artist?.displayName || currentTrack.artist?.username}</p>
              {currentTrack.genre && (
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-400 border border-white/5">
                  {currentTrack.genre}
                </span>
              )}
              {currentTrack.lyrics && (
                <div className="mt-3 px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-700/20 max-h-24 overflow-y-auto">
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{currentTrack.lyrics}</p>
                </div>
              )}
            </div>

            {/* Waveform */}
            <WaveformBars playing={isPlaying} />

            {/* Progress */}
            <div className="w-full max-w-sm mt-4">
              <div className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer group" onClick={handleSeek}>
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 relative transition-all"
                  style={{ width: `${progress}%` }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-slate-500 font-mono">{formatTime(currentTime)}</span>
                <span className="text-[11px] text-slate-500 font-mono">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-6">
              <button onClick={handleLike} className={`p-2 rounded-full transition-all ${liked ? "text-pink-400" : "text-slate-400 hover:text-pink-400"}`}>
                <Heart size={22} fill={liked ? "currentColor" : "none"} />
              </button>
              <button onClick={playPrev} className="p-3 text-slate-300 hover:text-white transition-colors active:scale-90">
                <SkipBack size={24} fill="currentColor" />
              </button>
              <button
                onClick={() => isPlaying ? pause() : resume()}
                className="p-5 rounded-full transition-all active:scale-90"
                style={{
                  background: "linear-gradient(135deg, #22d3ee, #6366f1)",
                  boxShadow: "0 0 30px rgba(34,211,238,0.3), 0 0 60px rgba(99,102,241,0.15)",
                }}
              >
                {isPlaying ? <Pause size={28} className="text-white" /> : <Play size={28} className="text-white ml-1" />}
              </button>
              <button onClick={playNext} className="p-3 text-slate-300 hover:text-white transition-colors active:scale-90">
                <SkipForward size={24} fill="currentColor" />
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`https://smfi.app/track/${currentTrack.id}`); toast.success(t.player.linkCopied); }}
                className="p-2 rounded-full text-slate-400 hover:text-cyan-400 transition-colors">
                <Share2 size={22} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 mt-8">
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-1 text-slate-500 hover:text-white transition-colors">
                {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <input
                type="range" min="0" max="1" step="0.01" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-28 accent-cyan-500 h-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

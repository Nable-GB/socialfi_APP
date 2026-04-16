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
      <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl" />

      {currentTrack.coverUrl && (
        <div className="absolute inset-0 overflow-hidden opacity-25">
          <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover blur-[110px] scale-[1.18] saturate-125" />
        </div>
      )}

      <div
        className={`relative h-full flex flex-col ${closing ? "slide-down-modal" : "slide-up-modal"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
          <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
            <ChevronDown size={24} />
          </button>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[3px] text-slate-500 font-medium">{t.player.nowPlaying}</p>
            {currentIdx >= 0 && (
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">{currentIdx + 1} / {queue.length}</p>
            )}
          </div>
          <button onClick={() => setShowQueue(!showQueue)} className={`w-10 h-10 flex items-center justify-center rounded-full border transition-colors ${showQueue ? "text-cyan-400 border-cyan-400/30 bg-cyan-500/10" : "text-slate-400 border-white/10 bg-white/[0.03] hover:text-white hover:bg-white/[0.06]"}`}>
            <ListMusic size={20} />
          </button>
        </div>

        {showQueue ? (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6">
            <div className="max-w-2xl mx-auto rounded-[28px] border border-white/10 bg-slate-950/45 backdrop-blur-xl shadow-[0_24px_80px_rgba(2,6,23,0.45)] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 bg-white/[0.02]">
                <h3 className="text-sm font-semibold text-slate-200">{t.player.queue}</h3>
                <p className="text-xs text-slate-500 mt-1">{queue.length} tracks in the active listening queue</p>
              </div>
              <div className="p-3 space-y-1.5 max-h-[calc(100vh-10rem)] overflow-y-auto">
              {queue.map((t, i) => (
                <div key={t.id} className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all border ${t.id === currentTrack.id ? "bg-cyan-500/[0.08] border-cyan-400/20 shadow-[0_0_0_1px_rgba(34,211,238,0.04)]" : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                  <span className="text-xs font-mono text-slate-600 w-5 text-right">{i + 1}</span>
                  {t.coverUrl ? (
                    <img src={t.coverUrl} alt="" className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center text-xs">♪</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${t.id === currentTrack.id ? "text-cyan-300 font-semibold" : "text-white"}`}>{t.title}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{t.artist?.displayName || t.artist?.username}</p>
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
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-8">
            <div className="max-w-2xl mx-auto rounded-[32px] border border-white/10 bg-slate-950/45 backdrop-blur-xl shadow-[0_30px_120px_rgba(2,6,23,0.55)] overflow-hidden">
              <div className="px-5 sm:px-8 pt-4 sm:pt-5 pb-7 sm:pb-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6 sm:mb-7 mt-2">
                    <div className="absolute inset-[-16px] rounded-[32px] bg-gradient-to-br from-cyan-400/18 via-indigo-400/8 to-fuchsia-400/12 blur-2xl opacity-80" />
                    <div className={`relative w-64 h-64 sm:w-80 sm:h-80 rounded-[28px] overflow-hidden premium-artwork-frame ${isPlaying ? "premium-artwork-spin" : "premium-artwork-rest"}`}>
                      {currentTrack.coverUrl ? (
                        <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-cyan-900/60 to-purple-900/60 flex items-center justify-center">
                          <span className="text-6xl">♪</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-[28px] ring-1 ring-white/10 pointer-events-none" />
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${isPlaying ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20" : "bg-white/[0.04] text-slate-400 border-white/10"}`}>
                      {isPlaying ? "PLAYING" : "PAUSED"}
                    </div>
                  </div>

                  <div className="w-full max-w-lg space-y-4">
                    <div>
                      <h2 className="text-2xl sm:text-[2rem] font-bold text-white leading-tight text-balance">{currentTrack.title}</h2>
                      <p className="text-sm sm:text-base text-slate-400 mt-2">{currentTrack.artist?.displayName || currentTrack.artist?.username}</p>
                      {currentTrack.genre && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium bg-white/[0.04] text-slate-300 border border-white/10 tracking-[0.02em]">
                            {currentTrack.genre}
                          </span>
                        </div>
                      )}
                    </div>

                    {currentTrack.lyrics && (
                      <div className="px-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/8 text-left max-h-28 overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{currentTrack.lyrics}</p>
                      </div>
                    )}

                    <div className="pt-1">
                      <WaveformBars playing={isPlaying} />
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="w-full h-2 bg-slate-800/90 rounded-full cursor-pointer group" onClick={handleSeek}>
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-violet-500 relative transition-all"
                          style={{ width: `${progress}%` }}>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-cyan-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="flex justify-between mt-3">
                        <span className="text-xs text-slate-400 font-mono">{formatTime(currentTime)}</span>
                        <span className="text-xs text-slate-400 font-mono">{formatTime(duration)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 sm:gap-5 pt-1">
                      <button onClick={handleLike} className={`w-11 h-11 flex items-center justify-center rounded-full border transition-all ${liked ? "text-pink-400 border-pink-400/20 bg-pink-500/10" : "text-slate-400 border-white/10 bg-white/[0.03] hover:text-pink-400 hover:bg-white/[0.06]"}`}>
                        <Heart size={20} fill={liked ? "currentColor" : "none"} />
                      </button>
                      <button onClick={playPrev} className="w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors active:scale-95">
                        <SkipBack size={22} fill="currentColor" />
                      </button>
                      <button
                        onClick={() => isPlaying ? pause() : resume()}
                        className="w-16 h-16 flex items-center justify-center rounded-full transition-all active:scale-95 premium-play-button"
                      >
                        {isPlaying ? <Pause size={28} className="text-white" /> : <Play size={28} className="text-white ml-1" />}
                      </button>
                      <button onClick={playNext} className="w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-200 hover:text-white hover:bg-white/[0.06] transition-colors active:scale-95">
                        <SkipForward size={22} fill="currentColor" />
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(`https://smfi.app/track/${currentTrack.id}`); toast.success(t.player.linkCopied); }}
                        className="w-11 h-11 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] transition-colors">
                        <Share2 size={20} />
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
                      <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                        {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      </button>
                      <input
                        type="range" min="0" max="1" step="0.01" value={volume}
                        onChange={e => setVolume(parseFloat(e.target.value))}
                        className="w-36 sm:w-44 accent-cyan-500 h-1.5"
                      />
                      <span className="text-[11px] text-slate-500 font-mono w-10 text-right">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { usePlayer } from "../contexts/PlayerContext";

function formatTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayerBar() {
  const { currentTrack, isPlaying, currentTime, duration, volume, pause, resume, seek, setVolume, playNext, playPrev } = usePlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-[60px] lg:bottom-0 inset-x-0 z-[55] border-t border-slate-700/30"
      style={{ background: "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,1) 100%)", backdropFilter: "blur(20px)" }}>
      {/* Progress bar (clickable) */}
      <div className="w-full h-1 bg-slate-800 cursor-pointer group" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        seek(pct * duration);
      }}>
        <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all relative"
          style={{ width: `${progress}%` }}>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-lg">♪</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-slate-400 truncate">{currentTrack.artist?.displayName || currentTrack.artist?.username}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={playPrev} className="p-1.5 text-slate-400 hover:text-white transition-colors">
            <SkipBack size={16} />
          </button>
          <button
            onClick={() => isPlaying ? pause() : resume()}
            className="p-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-white transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button onClick={playNext} className="p-1.5 text-slate-400 hover:text-white transition-colors">
            <SkipForward size={16} />
          </button>
        </div>

        {/* Time + Volume (hidden on mobile) */}
        <div className="hidden sm:flex items-center gap-3 flex-1 justify-end">
          <span className="text-xs text-slate-500 font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-1 text-slate-400 hover:text-white">
            {volume > 0 ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <input
            type="range" min="0" max="1" step="0.01" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-20 accent-cyan-500 h-1"
          />
        </div>
      </div>
    </div>
  );
}

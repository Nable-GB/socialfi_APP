import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, ChevronUp } from "lucide-react";
import { usePlayer } from "../contexts/PlayerContext";
import { NowPlayingModal } from "./NowPlayingModal";

export function AudioPlayerBar() {
  const { currentTrack, isPlaying, currentTime, duration, pause, resume, seek, playNext, playPrev } = usePlayer();
  const [modalOpen, setModalOpen] = useState(false);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div className="fixed bottom-[60px] lg:bottom-0 inset-x-0 z-[55] border-t border-white/[0.04]"
        style={{ background: "linear-gradient(180deg, rgba(3,7,17,0.97) 0%, rgba(3,7,17,1) 100%)", backdropFilter: "blur(20px)" }}>
        {/* Progress bar */}
        <div className="w-full h-[3px] bg-slate-800/50 cursor-pointer group" onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          seek(pct * duration);
        }}>
          <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all relative"
            style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-cyan-500/50" />
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2">
          {/* Track info — click to open modal */}
          <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => setModalOpen(true)}>
            <div className="relative">
              {currentTrack.coverUrl ? (
                <img src={currentTrack.coverUrl} alt="" className={`w-11 h-11 rounded-lg object-cover flex-shrink-0 ${isPlaying ? "shadow-lg shadow-cyan-500/20" : ""}`} />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg">♪</span>
                </div>
              )}
              {isPlaying && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-end gap-[1px] h-2">
                  {[0.6, 1, 0.4].map((h, i) => (
                    <div key={i} className="waveform-bar w-[2px] rounded-full bg-cyan-400" style={{ "--bar-h": `${h * 100}%`, "--bar-speed": `${0.3 + i * 0.1}s` } as React.CSSProperties} />
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-slate-500 truncate">{currentTrack.artist?.displayName || currentTrack.artist?.username}</p>
            </div>
            <ChevronUp size={16} className="text-slate-600 flex-shrink-0" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button onClick={playPrev} className="p-2 text-slate-400 hover:text-white transition-colors">
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => isPlaying ? pause() : resume()}
              className="p-2.5 rounded-full transition-all active:scale-90"
              style={{ background: "linear-gradient(135deg, #22d3ee, #6366f1)", boxShadow: "0 0 12px rgba(34,211,238,0.2)" }}
            >
              {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
            </button>
            <button onClick={playNext} className="p-2 text-slate-400 hover:text-white transition-colors">
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      </div>

      <NowPlayingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

import { useState, useEffect } from "react";
import { Trophy, Star, Play, Crown, Calendar, Music, Tag, Loader2, ArrowRight, Award } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useLang } from "../contexts/LangContext";
import { competitionApi, brochureApi } from "../lib/api";
import { NFTMarketplacePage } from "./NFTMarketplacePage";
import { toast } from "sonner";

interface CompetitionEntry {
  id: string;
  rank?: number;
  isWinner?: boolean;
  totalScore: number;
  listenScore: number;
  likeScore: number;
  voteScore: number;
  track: {
    id: string;
    title: string;
    coverUrl?: string;
    artist?: { displayName?: string; username?: string };
  };
}

interface Competition {
  id: string;
  year: number;
  month: number;
  status: "OPEN" | "VOTING" | "FINALIZED";
  entries?: CompetitionEntry[];
}

interface Brochure {
  id: string;
  name: string;
  price: number;
  isSold: boolean;
  track?: {
    id: string;
    title: string;
    coverUrl?: string;
    artist?: { displayName?: string; username?: string };
  };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export function CompetePage() {
  const { isAuthenticated } = useAuth();
  const { play } = usePlayer();
  const { t } = useLang();
  const [tab, setTab] = useState<"compete" | "brochures" | "market">("compete");
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loadingComp, setLoadingComp] = useState(true);
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [loadingBrochures, setLoadingBrochures] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    competitionApi.getCurrent()
      .then(data => setCompetition(data.competition ?? data))
      .catch(() => {})
      .finally(() => setLoadingComp(false));
  }, []);

  useEffect(() => {
    if (tab === "brochures") {
      setLoadingBrochures(true);
      brochureApi.list()
        .then(data => setBrochures(data.brochures ?? data))
        .catch(() => {})
        .finally(() => setLoadingBrochures(false));
    }
  }, [tab]);

  const handleBuyBrochure = async (brochureId: string) => {
    if (!isAuthenticated) { toast.error(t.brochureHub.signInToPurchase); return; }
    setBuyingId(brochureId);
    try {
      await brochureApi.buy(brochureId);
      toast.success(t.brochureHub.purchaseSuccess);
      setBrochures(prev => prev.map(b => b.id === brochureId ? { ...b, isSold: true } : b));
    } catch (err: any) {
      toast.error(err?.message ?? t.brochureHub.purchaseFailed);
    } finally {
      setBuyingId(null);
    }
  };

  const tabs = [
    { id: "compete" as const, label: t.competitionHub.competition, icon: Trophy },
    { id: "brochures" as const, label: t.competitionHub.brochures, icon: Tag },
    { id: "market" as const, label: t.competitionHub.market, icon: Star },
  ];

  const top3 = competition?.entries?.slice(0, 3) ?? [];
  const rest = competition?.entries?.slice(3) ?? [];
  const maxScore = competition?.entries?.[0]?.totalScore ?? 1;

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
        {tabs.map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              tab === tab_.id ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
            style={tab === tab_.id ? { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)" } : undefined}
          >
            <tab_.icon size={14} />
            {tab_.label}
          </button>
        ))}
      </div>

      {/* ── Competition Tab ── */}
      {tab === "compete" && (
        <div className="space-y-4">
          {loadingComp ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-cyan-400" />
            </div>
          ) : competition ? (
            <>
              {/* Header banner */}
              <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(168,85,247,0.08))", border: "1px solid rgba(34,211,238,0.15)" }}>
                <div className="flex items-center gap-3 mb-1">
                  <Trophy size={22} className="text-amber-400" />
                  <h2 className="text-lg font-bold text-slate-100">{t.competitionHub.monthlyTitle}</h2>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    competition.status === "OPEN" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    competition.status === "VOTING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                    "bg-slate-600/40 text-slate-400 border border-slate-600/30"
                  }`}>{competition.status === "OPEN" ? t.competitionHub.statusOpen : competition.status === "VOTING" ? t.competitionHub.statusVoting : t.competitionHub.statusFinalized}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Calendar size={13} />
                  <span>{MONTHS[competition.month - 1]} {competition.year}</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">{t.competitionHub.topArtistNote}</p>
              </div>

              {/* Top 3 podium */}
              {top3.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t.competitionHub.leaderboard}</p>
                  <div className="space-y-2">
                    {top3.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{
                          background: idx === 0 ? "rgba(245,158,11,0.08)" : idx === 1 ? "rgba(148,163,184,0.06)" : "rgba(205,124,65,0.07)",
                          border: `1px solid ${idx === 0 ? "rgba(245,158,11,0.2)" : idx === 1 ? "rgba(148,163,184,0.1)" : "rgba(205,124,65,0.15)"}`,
                        }}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          idx === 0 ? "bg-amber-400/20 text-amber-300" : idx === 1 ? "bg-slate-400/20 text-slate-300" : "bg-amber-700/20 text-amber-600"
                        }`}>
                          {idx === 0 ? <Crown size={14} /> : `#${idx + 1}`}
                        </div>
                        {entry.track.coverUrl ? (
                          <img src={entry.track.coverUrl} alt={entry.track.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center flex-shrink-0">
                            <Music size={16} className="text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{entry.track.title}</p>
                          <p className="text-xs text-slate-500 truncate">{entry.track.artist?.displayName ?? entry.track.artist?.username}</p>
                          <ScoreBar value={entry.totalScore} max={maxScore} color={idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : "#cd7c41"} />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => play(entry.track as any)} className="w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center hover:bg-cyan-500/20 transition-colors">
                            <Play size={13} className="text-slate-300 ml-0.5" />
                          </button>
                          <div className="text-right">
                            <p className="text-xs font-bold font-mono text-slate-200">{entry.totalScore.toFixed(0)}</p>
                            <p className="text-[10px] text-slate-600">pts</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {rest.map((entry, idx) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/30 transition-colors"
                        style={{ background: "rgba(10,16,32,0.5)", border: "1px solid rgba(148,163,184,0.05)" }}>
                        <span className="w-7 text-center text-xs font-mono text-slate-600 flex-shrink-0">#{idx + 4}</span>
                        {entry.track.coverUrl ? (
                          <img src={entry.track.coverUrl} alt={entry.track.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                            <Music size={14} className="text-slate-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300 truncate">{entry.track.title}</p>
                          <p className="text-xs text-slate-600 truncate">{entry.track.artist?.displayName ?? entry.track.artist?.username}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{entry.totalScore.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {competition.entries?.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <Trophy size={32} className="mx-auto mb-3 opacity-20" />
                  <p>{t.competitionHub.emptyTitle}</p>
                  <p className="text-xs mt-1 text-slate-600">{t.competitionHub.emptyBody}</p>
                </div>
              )}

              {/* Top artist explanation */}
              <div className="rounded-xl p-4" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Award size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">{t.competitionHub.howTitle}</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2"><ArrowRight size={11} className="text-amber-500/50" /><span>{t.competitionHub.how1}</span></div>
                  <div className="flex items-center gap-2"><ArrowRight size={11} className="text-amber-500/50" /><span>{t.competitionHub.how2}</span></div>
                  <div className="flex items-center gap-2"><ArrowRight size={11} className="text-amber-500/50" /><span>{t.competitionHub.how3}</span></div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Trophy size={32} className="mx-auto mb-3 opacity-20" />
              <p>{t.competitionHub.unavailable}</p>
            </div>
          )}
        </div>
      )}

      {/* ── NFT Brochures Tab ── */}
      {tab === "brochures" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Tag size={15} className="text-purple-400" />
              <h3 className="text-sm font-bold text-slate-200">{t.brochureHub.title}</h3>
            </div>
            <p className="text-xs text-slate-500">{t.brochureHub.subtitle}</p>
          </div>

          {loadingBrochures ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
          ) : brochures.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Tag size={32} className="mx-auto mb-3 opacity-20" />
              <p>{t.brochureHub.empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {brochures.map(brochure => (
                <div key={brochure.id} className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(10,16,32,0.8)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  {brochure.track?.coverUrl ? (
                    <img src={brochure.track.coverUrl} alt={brochure.name} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-gradient-to-br from-purple-900/40 to-indigo-900/40 flex items-center justify-center">
                      <Music size={32} className="text-slate-600" />
                    </div>
                  )}
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-slate-200 truncate">{brochure.name}</p>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{brochure.track?.artist?.displayName ?? brochure.track?.artist?.username}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-bold text-purple-300">{brochure.price} SMFI</span>
                      {brochure.isSold ? (
                        <span className="text-[10px] text-slate-600 font-semibold">{t.brochureHub.sold}</span>
                      ) : (
                        <button
                          onClick={() => handleBuyBrochure(brochure.id)}
                          disabled={buyingId === brochure.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                          style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)", color: "#d8b4fe" }}
                        >
                          {buyingId === brochure.id ? <Loader2 size={10} className="animate-spin" /> : t.brochureHub.buy}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NFT Market Tab ── */}
      {tab === "market" && <NFTMarketplacePage />}
    </div>
  );
}

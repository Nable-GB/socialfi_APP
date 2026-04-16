import { useCallback, useEffect, useState } from "react";
import { Trophy, Star, Play, Crown, Calendar, Tag, Loader2, ArrowRight, Award, Activity, Sparkles, Waves, PlusCircle, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useLang } from "../contexts/LangContext";
import { competitionApi, brochureApi, musicApi, type ApiTrack } from "../lib/api";
import { NFTMarketplacePage } from "./NFTMarketplacePage";
import { toast } from "sonner";

type CompetitionStatus = "OPEN" | "VOTING" | "FINALIZED";

interface ArtistRef {
  id?: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
}

interface CompetitionTrack {
  id: string;
  title: string;
  coverUrl?: string;
  genre?: string;
  playCount?: number;
  likeCount?: number;
  artist?: ArtistRef;
}

interface CompetitionEntry {
  id: string;
  rank: number;
  isWinner?: boolean;
  totalScore: number;
  listenScore: number;
  likeScore: number;
  voteScore: number;
  track: CompetitionTrack;
}

interface Competition {
  id: string;
  year: number;
  month: number;
  status: CompetitionStatus;
  entries: CompetitionEntry[];
}

interface CompetitionScoring {
  voteWeight: number;
  listenWeight: number;
  likeWeight: number;
}

interface UserCompetitionEntry extends CompetitionEntry {
  competition: {
    year: number;
    month: number;
    status: CompetitionStatus;
  };
}

interface Brochure {
  id: string;
  name: string;
  totalPrice: number;
  pricePerFraction: number;
  maxSupply: number;
  isFractionalized: boolean;
  isSold: boolean;
  soldAt?: string;
  track?: {
    id: string;
    title: string;
    coverUrl?: string;
    genre?: string;
    playCount?: number;
    artist?: ArtistRef;
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DEFAULT_SCORING: CompetitionScoring = { voteWeight: 0.4, listenWeight: 0.35, likeWeight: 0.25 };
const WINNER_SLOTS = 10;

function getStatusPill(status: CompetitionStatus) {
  if (status === "OPEN") return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  if (status === "VOTING") return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  return "bg-slate-600/40 text-slate-400 border border-slate-600/30";
}

function getCover(seed: string) {
  return `https://picsum.photos/seed/${seed}/480/480`;
}

function toArtistName(artist?: ArtistRef) {
  return artist?.displayName ?? artist?.username ?? "Unknown Artist";
}

function scorePercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function normalizeEntry(entry: any, index: number): CompetitionEntry {
  const track = entry?.track ?? {};
  const artist = track.artist ?? entry?.user ?? undefined;
  return {
    id: String(entry?.id ?? `entry-${index + 1}`),
    rank: Number(entry?.rank ?? index + 1),
    isWinner: Boolean(entry?.isWinner ?? (index < WINNER_SLOTS)),
    totalScore: Number(entry?.totalScore ?? 0),
    listenScore: Number(entry?.listenScore ?? 0),
    likeScore: Number(entry?.likeScore ?? 0),
    voteScore: Number(entry?.voteScore ?? 0),
    track: {
      id: String(track?.id ?? `track-${index + 1}`),
      title: String(track?.title ?? "Untitled Track"),
      coverUrl: track?.coverUrl,
      genre: track?.genre,
      playCount: typeof track?.playCount === "number" ? track.playCount : undefined,
      likeCount: typeof track?.likeCount === "number" ? track.likeCount : undefined,
      artist,
    },
  };
}

function normalizeCompetitionResponse(data: any) {
  const competition = data?.competition ?? data;
  if (!competition?.id) {
    return { competition: null as Competition | null, scoring: DEFAULT_SCORING };
  }

  const rawEntries = data?.entries ?? competition?.entries ?? [];
  return {
    competition: {
      id: String(competition.id),
      year: Number(competition.year),
      month: Number(competition.month),
      status: competition.status as CompetitionStatus,
      entries: rawEntries.map((entry: any, index: number) => normalizeEntry(entry, index)),
    },
    scoring: {
      voteWeight: Number(data?.scoring?.voteWeight ?? DEFAULT_SCORING.voteWeight),
      listenWeight: Number(data?.scoring?.listenWeight ?? DEFAULT_SCORING.listenWeight),
      likeWeight: Number(data?.scoring?.likeWeight ?? DEFAULT_SCORING.likeWeight),
    },
  };
}

function normalizePastCompetitions(data: any): Competition[] {
  const competitions = data?.competitions ?? [];
  return competitions.map((competition: any) => ({
    id: String(competition.id),
    year: Number(competition.year),
    month: Number(competition.month),
    status: competition.status as CompetitionStatus,
    entries: (competition.entries ?? []).map((entry: any, index: number) => normalizeEntry(entry, index)),
  }));
}

function normalizeMyEntries(data: any): UserCompetitionEntry[] {
  return (data?.entries ?? []).map((entry: any, index: number) => {
    const normalized = normalizeEntry(entry, index);
    return {
      ...normalized,
      competition: {
        year: Number(entry?.competition?.year ?? new Date().getUTCFullYear()),
        month: Number(entry?.competition?.month ?? new Date().getUTCMonth() + 1),
        status: (entry?.competition?.status ?? "OPEN") as CompetitionStatus,
      },
    };
  });
}

function normalizeBrochures(data: any): Brochure[] {
  return (data?.brochures ?? data ?? []).map((brochure: any, index: number) => ({
    id: String(brochure?.id ?? `brochure-${index + 1}`),
    name: String(brochure?.name ?? "Untitled Brochure"),
    totalPrice: Number(brochure?.totalPrice ?? brochure?.price ?? 0),
    pricePerFraction: Number(brochure?.pricePerFraction ?? brochure?.price ?? 0),
    maxSupply: Number(brochure?.maxSupply ?? 1),
    isFractionalized: Boolean(brochure?.isFractionalized),
    isSold: Boolean(brochure?.isSold),
    soldAt: brochure?.soldAt,
    track: brochure?.track
      ? {
          id: String(brochure.track.id ?? `brochure-track-${index + 1}`),
          title: String(brochure.track.title ?? brochure?.name ?? "Untitled Track"),
          coverUrl: brochure.track.coverUrl,
          genre: brochure.track.genre,
          playCount: typeof brochure.track.playCount === "number" ? brochure.track.playCount : undefined,
          artist: brochure.track.artist ?? brochure.artist,
        }
      : undefined,
  }));
}

function createDemoCompetition(base?: Partial<Competition>): Competition {
  const now = new Date();
  const year = base?.year ?? now.getUTCFullYear();
  const month = base?.month ?? now.getUTCMonth() + 1;
  const status = base?.status ?? "VOTING";
  return {
    id: base?.id ?? `demo-competition-${year}-${month}`,
    year,
    month,
    status,
    entries: [
      { id: "demo-entry-1", rank: 1, isWinner: true, totalScore: 982, voteScore: 404, listenScore: 342, likeScore: 236, track: { id: "demo-track-1", title: "Midnight Signal", coverUrl: getCover("midnight-signal"), genre: "Synthwave", playCount: 9780, likeCount: 1270, artist: { username: "astralnova", displayName: "Astral Nova" } } },
      { id: "demo-entry-2", rank: 2, isWinner: true, totalScore: 944, voteScore: 388, listenScore: 334, likeScore: 222, track: { id: "demo-track-2", title: "Blue Static", coverUrl: getCover("blue-static"), genre: "Alt Pop", playCount: 9150, likeCount: 1180, artist: { username: "lumenpark", displayName: "Lumen Park" } } },
      { id: "demo-entry-3", rank: 3, isWinner: true, totalScore: 901, voteScore: 362, listenScore: 323, likeScore: 216, track: { id: "demo-track-3", title: "Velvet Run", coverUrl: getCover("velvet-run"), genre: "R&B", playCount: 8840, likeCount: 1105, artist: { username: "kairobeats", displayName: "Kairo Beats" } } },
      { id: "demo-entry-4", rank: 4, isWinner: true, totalScore: 864, voteScore: 341, listenScore: 309, likeScore: 214, track: { id: "demo-track-4", title: "Circuit Bloom", coverUrl: getCover("circuit-bloom"), genre: "Electronic", playCount: 8120, likeCount: 1034, artist: { username: "opalgrid", displayName: "Opal Grid" } } },
      { id: "demo-entry-5", rank: 5, isWinner: true, totalScore: 842, voteScore: 330, listenScore: 301, likeScore: 211, track: { id: "demo-track-5", title: "Afterimage", coverUrl: getCover("afterimage"), genre: "Indie", playCount: 7905, likeCount: 997, artist: { username: "northlane", displayName: "North Lane" } } },
      { id: "demo-entry-6", rank: 6, isWinner: true, totalScore: 801, voteScore: 318, listenScore: 286, likeScore: 197, track: { id: "demo-track-6", title: "Silver Motel", coverUrl: getCover("silver-motel"), genre: "Lo-fi", playCount: 7410, likeCount: 920, artist: { username: "elliso", displayName: "Elliso" } } },
    ],
  };
}

function createDemoPastCompetitions(current: Competition): Competition[] {
  const months = [1, 2, 3].map((offset) => {
    const monthIndex = current.month - 1 - offset;
    const date = new Date(Date.UTC(current.year, monthIndex, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  });

  return months.map((value, index) => ({
    id: `demo-past-${index + 1}`,
    year: value.year,
    month: value.month,
    status: "FINALIZED",
    entries: [
      normalizeEntry({ id: `past-${index + 1}-1`, rank: 1, isWinner: true, totalScore: 920 - index * 18, voteScore: 368 - index * 7, listenScore: 332 - index * 5, likeScore: 220 - index * 6, track: { id: `past-track-${index + 1}-1`, title: ["Echo Harbor", "Chrome Sunrise", "Rooftop Youth"][index], coverUrl: getCover(`past-${index + 1}-1`), artist: { displayName: ["Mira Vale", "Static Youth", "Sora Lane"][index], username: ["miravale", "staticyouth", "soralane"][index] } } }, 0),
      normalizeEntry({ id: `past-${index + 1}-2`, rank: 2, isWinner: true, totalScore: 881 - index * 15, voteScore: 341 - index * 5, listenScore: 319 - index * 5, likeScore: 221 - index * 5, track: { id: `past-track-${index + 1}-2`, title: ["Soft Voltage", "Night Terminal", "Glass Arcade"][index], coverUrl: getCover(`past-${index + 1}-2`), artist: { displayName: ["Pixel Bloom", "Nova Era", "Blue Motel"][index], username: ["pixelbloom", "novaera", "bluemotel"][index] } } }, 1),
    ],
  }));
}

function createDemoMyEntries(current: Competition): UserCompetitionEntry[] {
  return [
    {
      id: "demo-my-entry",
      rank: 8,
      isWinner: true,
      totalScore: 746,
      voteScore: 284,
      listenScore: 268,
      likeScore: 194,
      competition: { year: current.year, month: current.month, status: current.status },
      track: {
        id: "demo-my-track",
        title: "Cityline Hearts",
        coverUrl: getCover("cityline-hearts"),
        genre: "Future Pop",
        playCount: 6320,
        likeCount: 802,
        artist: { username: "you", displayName: "Your Artist Profile" },
      },
    },
  ];
}

function createDemoBrochures(): Brochure[] {
  return [
    { id: "demo-brochure-1", name: "Midnight Signal Press Kit", totalPrice: 180, pricePerFraction: 1.8, maxSupply: 100, isFractionalized: true, isSold: false, track: { id: "bro-track-1", title: "Midnight Signal", coverUrl: getCover("brochure-signal"), genre: "Synthwave", playCount: 9780, artist: { displayName: "Astral Nova", username: "astralnova" } } },
    { id: "demo-brochure-2", name: "Blue Static Collector Sheet", totalPrice: 145, pricePerFraction: 145, maxSupply: 1, isFractionalized: false, isSold: false, track: { id: "bro-track-2", title: "Blue Static", coverUrl: getCover("brochure-static"), genre: "Alt Pop", playCount: 9150, artist: { displayName: "Lumen Park", username: "lumenpark" } } },
    { id: "demo-brochure-3", name: "Velvet Run Tour Edition", totalPrice: 210, pricePerFraction: 2.1, maxSupply: 100, isFractionalized: true, isSold: false, track: { id: "bro-track-3", title: "Velvet Run", coverUrl: getCover("brochure-velvet"), genre: "R&B", playCount: 8840, artist: { displayName: "Kairo Beats", username: "kairobeats" } } },
    { id: "demo-brochure-4", name: "Afterimage Lyric Zine", totalPrice: 120, pricePerFraction: 120, maxSupply: 1, isFractionalized: false, isSold: false, track: { id: "bro-track-4", title: "Afterimage", coverUrl: getCover("brochure-afterimage"), genre: "Indie", playCount: 7905, artist: { displayName: "North Lane", username: "northlane" } } },
  ];
}

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

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(15,23,42,0.55)", border: "1px solid rgba(148,163,184,0.08)" }}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function CreatorTrackCard({ track, entered, disabled, onEnter, loading, t }: { track: ApiTrack; entered: boolean; disabled: boolean; onEnter: (trackId: string) => void; loading: boolean; t: any }) {
  const isDraft = track.status !== "PUBLISHED";
  const statusLabel = entered ? t.competitionHub.entered : isDraft ? t.competitionHub.draftOnly : t.competitionHub.readyToEnter;

  return (
    <div className="rounded-xl p-3" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
      <div className="flex items-center gap-3">
        <img src={track.coverUrl || getCover(track.id)} alt={track.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{track.title}</p>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${entered ? "bg-cyan-500/12 text-cyan-300 border-cyan-500/25" : isDraft ? "bg-slate-700/50 text-slate-400 border-slate-600/30" : "bg-emerald-500/12 text-emerald-300 border-emerald-500/25"}`}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
            <span>{track.genre}</span>
            <span>{track.playCount} plays</span>
            <span>{track.likeCount} likes</span>
          </div>
        </div>
        <button
          onClick={() => onEnter(track.id)}
          disabled={disabled || loading}
          className="px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: disabled ? "rgba(51,65,85,0.4)" : "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(99,102,241,0.16))", border: disabled ? "1px solid rgba(71,85,105,0.25)" : "1px solid rgba(34,211,238,0.28)", color: disabled ? "#64748b" : "#cffafe" }}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : entered ? t.competitionHub.entered : t.competitionHub.enterNow}
        </button>
      </div>
    </div>
  );
}

export function CompetePage() {
  const { isAuthenticated, user } = useAuth();
  const { play } = usePlayer();
  const { t } = useLang();
  const [tab, setTab] = useState<"compete" | "brochures" | "market">("compete");
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [pastCompetitions, setPastCompetitions] = useState<Competition[]>([]);
  const [myEntries, setMyEntries] = useState<UserCompetitionEntry[]>([]);
  const [scoring, setScoring] = useState<CompetitionScoring>(DEFAULT_SCORING);
  const [loadingComp, setLoadingComp] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [loadingBrochures, setLoadingBrochures] = useState(false);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [usingCompetitionDemo, setUsingCompetitionDemo] = useState(false);
  const [usingBrochureDemo, setUsingBrochureDemo] = useState(false);
  const [usingEntryDemo, setUsingEntryDemo] = useState(false);
  const [creatorTracks, setCreatorTracks] = useState<ApiTrack[]>([]);
  const [loadingCreatorTracks, setLoadingCreatorTracks] = useState(false);
  const [enteringTrackId, setEnteringTrackId] = useState<string | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);

  const isCreator = Boolean(
    user?.creatorAccessForced || ["CREATOR", "PRO", "PREMIUM"].includes((user?.subscriptionTier as string | undefined) ?? ""),
  );

  const loadCompetitionData = useCallback(async () => {
    setLoadingComp(true);
    try {
      const [currentData, pastData] = await Promise.all([
        competitionApi.getCurrent(),
        competitionApi.getPast(),
      ]);

      const normalized = normalizeCompetitionResponse(currentData);
      const seeded = normalized.competition && normalized.competition.entries.length > 0
        ? normalized.competition
        : createDemoCompetition(normalized.competition ?? undefined);
      const normalizedPast = normalizePastCompetitions(pastData);

      setCompetition(seeded);
      setPastCompetitions(normalizedPast.length > 0 ? normalizedPast : createDemoPastCompetitions(seeded));
      setScoring(normalized.scoring);
      setUsingCompetitionDemo(!normalized.competition || normalized.competition.entries.length === 0);
    } catch {
      const seeded = createDemoCompetition();
      setCompetition(seeded);
      setPastCompetitions(createDemoPastCompetitions(seeded));
      setScoring(DEFAULT_SCORING);
      setUsingCompetitionDemo(true);
    } finally {
      setLoadingComp(false);
    }
  }, []);

  const loadMyEntries = useCallback(async (targetCompetition?: Competition | null) => {
    const activeCompetition = targetCompetition ?? competition;
    if (!activeCompetition || !isAuthenticated) {
      setMyEntries([]);
      setUsingEntryDemo(false);
      return;
    }

    setLoadingEntries(true);
    try {
      const data = await competitionApi.getMyEntries();
      const currentSeasonEntries = normalizeMyEntries(data).filter((entry) => (
        entry.competition.year === activeCompetition.year && entry.competition.month === activeCompetition.month
      ));
      setMyEntries(currentSeasonEntries.length > 0 ? currentSeasonEntries : createDemoMyEntries(activeCompetition));
      setUsingEntryDemo(currentSeasonEntries.length === 0);
    } catch {
      setMyEntries(createDemoMyEntries(activeCompetition));
      setUsingEntryDemo(true);
    } finally {
      setLoadingEntries(false);
    }
  }, [competition, isAuthenticated]);

  const loadCreatorTracks = useCallback(async () => {
    if (!isAuthenticated || !isCreator) {
      setCreatorTracks([]);
      return;
    }

    setLoadingCreatorTracks(true);
    try {
      const data = await musicApi.getMyTracks();
      setCreatorTracks(data.tracks);
    } catch {
      setCreatorTracks([]);
    } finally {
      setLoadingCreatorTracks(false);
    }
  }, [isAuthenticated, isCreator]);

  useEffect(() => {
    loadCompetitionData().catch(() => {});
  }, [loadCompetitionData]);

  useEffect(() => {
    loadMyEntries().catch(() => {});
  }, [loadMyEntries]);

  useEffect(() => {
    loadCreatorTracks().catch(() => {});
  }, [loadCreatorTracks]);

  useEffect(() => {
    if (tab !== "brochures") return;

    let cancelled = false;
    setLoadingBrochures(true);

    brochureApi.list()
      .then((data) => {
        if (cancelled) return;
        const normalized = normalizeBrochures(data).filter((brochure) => !brochure.isSold);
        setBrochures(normalized.length > 0 ? normalized : createDemoBrochures());
        setUsingBrochureDemo(normalized.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setBrochures(createDemoBrochures());
        setUsingBrochureDemo(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingBrochures(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const handleBuyBrochure = async (brochureId: string) => {
    if (!isAuthenticated) {
      toast.error(t.brochureHub.signInToPurchase);
      return;
    }

    setBuyingId(brochureId);
    try {
      if (usingBrochureDemo) {
        setBrochures((prev) => prev.map((brochure) => brochure.id === brochureId ? { ...brochure, isSold: true, soldAt: new Date().toISOString() } : brochure));
        toast.success(t.brochureHub.purchaseSuccess);
        return;
      }

      await brochureApi.buy(brochureId);
      toast.success(t.brochureHub.purchaseSuccess);
      setBrochures((prev) => prev.map((brochure) => brochure.id === brochureId ? { ...brochure, isSold: true, soldAt: new Date().toISOString() } : brochure));
    } catch (err: any) {
      toast.error(err?.message ?? t.brochureHub.purchaseFailed);
    } finally {
      setBuyingId(null);
    }
  };

  const handleEnterCompetition = async (trackId: string) => {
    setEnteringTrackId(trackId);
    try {
      await competitionApi.enter(trackId);
      await Promise.all([
        loadCompetitionData(),
        loadMyEntries(),
        loadCreatorTracks(),
      ]);
      setShowEntryModal(false);
      toast.success(t.competitionHub.enterSuccess);
    } catch (err: any) {
      toast.error(err?.message ?? t.competitionHub.enterFailed);
    } finally {
      setEnteringTrackId(null);
    }
  };

  const tabs = [
    { id: "compete" as const, label: t.competitionHub.competition, icon: Trophy },
    { id: "brochures" as const, label: t.competitionHub.brochures, icon: Tag },
    { id: "market" as const, label: t.competitionHub.market, icon: Star },
  ];

  const top3 = competition?.entries.slice(0, 3) ?? [];
  const rest = competition?.entries.slice(3, 8) ?? [];
  const maxScore = competition?.entries[0]?.totalScore ?? 1;
  const totalEntries = competition?.entries.length ?? 0;
  const avgScore = totalEntries > 0
    ? (competition?.entries.reduce((sum, entry) => sum + entry.totalScore, 0) ?? 0) / totalEntries
    : 0;
  const cutoffScore = competition?.entries[Math.min(WINNER_SLOTS, Math.max(totalEntries, 1)) - 1]?.totalScore ?? 0;
  const myEntry = myEntries[0] ?? null;
  const enteredTrackIds = new Set(myEntries.map((entry) => entry.track.id));
  const eligibleCreatorTracks = creatorTracks.filter((track) => track.status === "PUBLISHED" && !enteredTrackIds.has(track.id));
  const brochureAveragePrice = brochures.length > 0
    ? brochures.reduce((sum, brochure) => sum + brochure.totalPrice, 0) / brochures.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
        {tabs.map((tab_) => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${tab === tab_.id ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}
            style={tab === tab_.id ? { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)" } : undefined}
          >
            <tab_.icon size={14} />
            {tab_.label}
          </button>
        ))}
      </div>

      {tab === "compete" && (
        <div className="space-y-4">
          {loadingComp ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-cyan-400" />
            </div>
          ) : competition ? (
            <>
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(168,85,247,0.08))", border: "1px solid rgba(34,211,238,0.15)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <Trophy size={22} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-100">{t.competitionHub.monthlyTitle}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusPill(competition.status)}`}>
                        {competition.status === "OPEN" ? t.competitionHub.statusOpen : competition.status === "VOTING" ? t.competitionHub.statusVoting : t.competitionHub.statusFinalized}
                      </span>
                      {usingCompetitionDemo && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-cyan-300 border border-cyan-400/20 bg-cyan-400/10">
                          {t.competitionHub.demoMode}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                      <Calendar size={13} />
                      <span>{MONTHS[competition.month - 1]} {competition.year}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 max-w-2xl">{t.competitionHub.topArtistNote}</p>
                  </div>
                  {isAuthenticated && (
                    <div className="flex-shrink-0">
                      {isCreator ? (
                        <button
                          onClick={() => setShowEntryModal(true)}
                          disabled={competition.status === "FINALIZED"}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                          style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(99,102,241,0.16))", border: "1px solid rgba(34,211,238,0.28)", color: "#cffafe" }}
                        >
                          <span className="inline-flex items-center gap-1.5"><PlusCircle size={13} /> {t.competitionHub.enterTrack}</span>
                        </button>
                      ) : (
                        <div className="px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5" style={{ background: "rgba(51,65,85,0.4)", border: "1px solid rgba(71,85,105,0.25)", color: "#94a3b8" }}>
                          <Lock size={12} /> {t.competitionHub.creatorRequired}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label={t.competitionHub.totalEntries} value={totalEntries.toLocaleString()} accent="#22d3ee" />
                  <StatCard label={t.competitionHub.top10Cutoff} value={`${cutoffScore.toFixed(0)} pts`} accent="#f59e0b" />
                  <StatCard label={t.competitionHub.avgScore} value={`${avgScore.toFixed(0)} pts`} accent="#a855f7" />
                  <StatCard label={t.competitionHub.winnerSlots} value={String(WINNER_SLOTS)} accent="#10b981" />
                </div>

                <div className="rounded-xl p-4" style={{ background: "rgba(5,10,24,0.45)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={14} className="text-cyan-300" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.18em]">{t.competitionHub.scoreMix}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg p-2 bg-slate-900/60 border border-slate-800/70 text-slate-300">
                      <p className="text-slate-500">{t.competitionHub.voteWeightLabel}</p>
                      <p className="font-bold mt-1">{Math.round(scoring.voteWeight * 100)}%</p>
                    </div>
                    <div className="rounded-lg p-2 bg-slate-900/60 border border-slate-800/70 text-slate-300">
                      <p className="text-slate-500">{t.competitionHub.listenWeightLabel}</p>
                      <p className="font-bold mt-1">{Math.round(scoring.listenWeight * 100)}%</p>
                    </div>
                    <div className="rounded-lg p-2 bg-slate-900/60 border border-slate-800/70 text-slate-300">
                      <p className="text-slate-500">{t.competitionHub.likeWeightLabel}</p>
                      <p className="font-bold mt-1">{Math.round(scoring.likeWeight * 100)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {top3.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t.competitionHub.leaderboard}</p>
                    <p className="text-[11px] text-slate-500">{t.competitionHub.seasonOverview}</p>
                  </div>
                  <div className="space-y-2">
                    {top3.map((entry, idx) => {
                      const accent = idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : "#cd7c41";
                      return (
                        <div
                          key={entry.id}
                          className="rounded-2xl p-4"
                          style={{
                            background: idx === 0 ? "rgba(245,158,11,0.08)" : idx === 1 ? "rgba(148,163,184,0.06)" : "rgba(205,124,65,0.07)",
                            border: `1px solid ${idx === 0 ? "rgba(245,158,11,0.2)" : idx === 1 ? "rgba(148,163,184,0.1)" : "rgba(205,124,65,0.15)"}`,
                          }}
                        >
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${idx === 0 ? "bg-amber-400/20 text-amber-300" : idx === 1 ? "bg-slate-400/20 text-slate-300" : "bg-amber-700/20 text-amber-600"}`}>
                              {idx === 0 ? <Crown size={15} /> : `#${entry.rank}`}
                            </div>
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-900/60">
                              <img src={entry.track.coverUrl || getCover(entry.track.id)} alt={entry.track.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-200 truncate">{entry.track.title}</p>
                                  <p className="text-xs text-slate-500 truncate">{toArtistName(entry.track.artist)}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold font-mono text-slate-100">{entry.totalScore.toFixed(0)}</p>
                                  <p className="text-[10px] text-slate-500">pts</p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <ScoreBar value={entry.totalScore} max={maxScore} color={accent} />
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                                <div className="rounded-lg px-2 py-1.5 bg-slate-900/55 border border-slate-800/70 text-slate-300">
                                  <p className="text-slate-500">{t.competitionHub.voteWeightLabel}</p>
                                  <p className="font-mono">{entry.voteScore.toFixed(0)}</p>
                                </div>
                                <div className="rounded-lg px-2 py-1.5 bg-slate-900/55 border border-slate-800/70 text-slate-300">
                                  <p className="text-slate-500">{t.competitionHub.listenWeightLabel}</p>
                                  <p className="font-mono">{entry.listenScore.toFixed(0)}</p>
                                </div>
                                <div className="rounded-lg px-2 py-1.5 bg-slate-900/55 border border-slate-800/70 text-slate-300">
                                  <p className="text-slate-500">{t.competitionHub.likeWeightLabel}</p>
                                  <p className="font-mono">{entry.likeScore.toFixed(0)}</p>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => play(entry.track as any)} className="w-9 h-9 mt-1 rounded-full bg-slate-700/60 flex items-center justify-center hover:bg-cyan-500/20 transition-colors flex-shrink-0">
                              <Play size={13} className="text-slate-300 ml-0.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {rest.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/30 transition-colors" style={{ background: "rgba(10,16,32,0.5)", border: "1px solid rgba(148,163,184,0.05)" }}>
                        <span className="w-7 text-center text-xs font-mono text-slate-600 flex-shrink-0">#{entry.rank}</span>
                        <img src={entry.track.coverUrl || getCover(entry.track.id)} alt={entry.track.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-300 truncate">{entry.track.title}</p>
                          <p className="text-xs text-slate-600 truncate">{toArtistName(entry.track.artist)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-mono text-slate-300">{entry.totalScore.toFixed(0)}</p>
                          <p className="text-[10px] text-slate-600">{scorePercent(entry.totalScore, maxScore)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {competition.entries.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <Trophy size={32} className="mx-auto mb-3 opacity-20" />
                  <p>{t.competitionHub.emptyTitle}</p>
                  <p className="text-xs mt-1 text-slate-600">{t.competitionHub.emptyBody}</p>
                </div>
              )}

              <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
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

                <div className="rounded-xl p-4" style={{ background: "rgba(8,15,30,0.75)", border: "1px solid rgba(148,163,184,0.08)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-cyan-300" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.18em]">{t.competitionHub.campaignTitle}</span>
                    {usingEntryDemo && myEntry && <span className="ml-auto text-[10px] text-cyan-300">{t.competitionHub.demoMode}</span>}
                  </div>
                  {loadingEntries ? (
                    <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-cyan-400" /></div>
                  ) : myEntry ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <img src={myEntry.track.coverUrl || getCover(myEntry.track.id)} alt={myEntry.track.title} className="w-14 h-14 rounded-xl object-cover" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{myEntry.track.title}</p>
                          <p className="text-xs text-slate-500 truncate">{myEntry.track.genre ?? "Genre TBD"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg p-2 bg-slate-900/60 border border-slate-800/70">
                          <p className="text-slate-500">{t.competitionHub.currentRank}</p>
                          <p className="mt-1 font-bold text-cyan-300">#{myEntry.rank}</p>
                        </div>
                        <div className="rounded-lg p-2 bg-slate-900/60 border border-slate-800/70">
                          <p className="text-slate-500">{t.competitionHub.entryStatus}</p>
                          <p className="mt-1 font-bold text-slate-200">{myEntry.competition.status === "OPEN" ? t.competitionHub.statusOpen : myEntry.competition.status === "VOTING" ? t.competitionHub.statusVoting : t.competitionHub.statusFinalized}</p>
                        </div>
                        <div className="rounded-lg p-2 bg-slate-900/60 border border-slate-800/70">
                          <p className="text-slate-500">{t.competitionHub.avgScore}</p>
                          <p className="mt-1 font-bold text-amber-300">{myEntry.totalScore.toFixed(0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-900/55 border border-slate-800/70 text-xs">
                        <span className="text-slate-500">{t.competitionHub.entryCount}</span>
                        <span className="font-semibold text-slate-200">{myEntries.length}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">{t.competitionHub.campaignEmpty}</div>
                  )}
                </div>
              </div>

              {pastCompetitions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Waves size={14} className="text-purple-300" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.competitionHub.pastChampions}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {pastCompetitions.slice(0, 3).map((pastCompetition) => {
                      const champion = pastCompetition.entries[0];
                      if (!champion) return null;
                      return (
                        <div key={pastCompetition.id} className="rounded-xl p-4" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">{MONTHS[pastCompetition.month - 1]} {pastCompetition.year}</p>
                              <p className="text-xs text-slate-500">{t.competitionHub.statusFinalized}</p>
                            </div>
                            <Crown size={16} className="text-amber-400" />
                          </div>
                          <div className="flex items-center gap-3">
                            <img src={champion.track.coverUrl || getCover(champion.track.id)} alt={champion.track.title} className="w-12 h-12 rounded-xl object-cover" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{champion.track.title}</p>
                              <p className="text-xs text-slate-500 truncate">{toArtistName(champion.track.artist)}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-slate-500">{t.competitionHub.avgScore}</span>
                            <span className="font-mono text-amber-300">{champion.totalScore.toFixed(0)} pts</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Trophy size={32} className="mx-auto mb-3 opacity-20" />
              <p>{t.competitionHub.unavailable}</p>
            </div>
          )}
        </div>
      )}

      {tab === "brochures" && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Tag size={15} className="text-purple-400" />
              <h3 className="text-sm font-bold text-slate-200">{t.brochureHub.title}</h3>
              {usingBrochureDemo && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold text-purple-300 border border-purple-400/20 bg-purple-400/10">
                  {t.brochureHub.demoMode}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{t.brochureHub.subtitle}</p>
            {!loadingBrochures && brochures.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <StatCard label={t.brochureHub.availableNow} value={String(brochures.filter((brochure) => !brochure.isSold).length)} accent="#d8b4fe" />
                <StatCard label={t.brochureHub.avgPrice} value={`${brochureAveragePrice.toFixed(0)} SMFI`} accent="#c084fc" />
              </div>
            )}
          </div>

          {loadingBrochures ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-purple-400" /></div>
          ) : brochures.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Tag size={32} className="mx-auto mb-3 opacity-20" />
              <p>{t.brochureHub.empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {brochures.map((brochure) => (
                <div key={brochure.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(10,16,32,0.8)", border: "1px solid rgba(168,85,247,0.15)" }}>
                  <div className="grid grid-cols-[112px_1fr] min-h-[112px]">
                    <img src={brochure.track?.coverUrl || getCover(brochure.id)} alt={brochure.name} className="w-full h-full object-cover" />
                    <div className="p-3 flex flex-col justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-200 line-clamp-2">{brochure.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{toArtistName(brochure.track?.artist)}</p>
                        <p className="text-[11px] text-slate-600 mt-1">{brochure.track?.title}{brochure.track?.genre ? ` • ${brochure.track.genre}` : ""}</p>
                      </div>
                      <div className="flex items-end justify-between gap-3 mt-3">
                        <div>
                          <p className="text-xs text-slate-500">{brochure.isFractionalized ? "Price per fraction" : "Total price"}</p>
                          <p className="text-sm font-bold text-purple-300">{brochure.isFractionalized ? brochure.pricePerFraction : brochure.totalPrice} SMFI</p>
                          <p className="text-[10px] text-slate-500 mt-1">{brochure.isFractionalized ? `${brochure.maxSupply} max supply · ${brochure.totalPrice} SMFI total` : "Single brochure sale"}</p>
                        </div>
                        {brochure.isSold ? (
                          <span className="text-[10px] text-slate-500 font-semibold">{t.brochureHub.sold}</span>
                        ) : (
                          <button
                            onClick={() => handleBuyBrochure(brochure.id)}
                            disabled={buyingId === brochure.id}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50"
                            style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)", color: "#d8b4fe" }}
                          >
                            {buyingId === brochure.id ? <Loader2 size={10} className="animate-spin" /> : t.brochureHub.buy}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "market" && <NFTMarketplacePage />}

      {showEntryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowEntryModal(false)}>
          <div className="w-full max-w-2xl rounded-2xl p-5 space-y-4" style={{ background: "rgba(8,15,30,0.96)", border: "1px solid rgba(34,211,238,0.16)", boxShadow: "0 24px 80px rgba(2,6,23,0.55)" }} onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">{t.competitionHub.enterTrack}</h3>
                <p className="text-xs text-slate-400 mt-1">{t.competitionHub.enterTrackSub}</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-500 hover:text-white text-sm">{t.myNfts.cancel}</button>
            </div>

            {loadingCreatorTracks ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-cyan-400" /></div>
            ) : creatorTracks.length === 0 ? (
              <div className="rounded-xl p-6 text-center text-sm text-slate-500" style={{ background: "rgba(10,16,32,0.72)", border: "1px solid rgba(148,163,184,0.08)" }}>
                {t.competitionHub.noTracksYet}
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="rounded-xl p-3 text-xs text-slate-400" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  {eligibleCreatorTracks.length > 0 ? `${eligibleCreatorTracks.length} ${t.competitionHub.eligibleTracks}` : t.competitionHub.noEligibleTracks}
                </div>
                {creatorTracks.map((track) => {
                  const entered = enteredTrackIds.has(track.id);
                  const disabled = entered || track.status !== "PUBLISHED" || competition?.status === "FINALIZED";
                  return (
                    <CreatorTrackCard
                      key={track.id}
                      track={track}
                      entered={entered}
                      disabled={disabled}
                      onEnter={handleEnterCompetition}
                      loading={enteringTrackId === track.id}
                      t={t}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
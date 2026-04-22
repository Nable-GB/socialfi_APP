import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Sparkles, TrendingUp, Users, UserCheck, Music, RefreshCw, Play, Disc3, Flame, BadgeCheck, Clock3 } from "lucide-react";
import { musicApi, usersApi, type ApiTrack, type ApiUser } from "../lib/api";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { SocialFeedPage } from "./SocialFeedPage";
import { toast } from "sonner";

type SearchUser = ApiUser & { isFollowing: boolean };

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCompactNumber(value: number | null | undefined) {
  return compactNumberFormatter.format(Number(value ?? 0));
}

function formatDuration(seconds: number | null | undefined) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getArtistName(track: ApiTrack) {
  return track.artist?.displayName ?? track.artist?.username ?? "Unknown artist";
}

export function ListenPage({ onOpenProfile }: { onOpenProfile?: (userId: string) => void }) {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<"forYou" | "following" | "discover">("discover");
  const [search, setSearch] = useState("");
  const [activeSearchTab, setActiveSearchTab] = useState<"people" | "tracks">("tracks");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [trackResults, setTrackResults] = useState<ApiTrack[]>([]);
  const [discoverTracks, setDiscoverTracks] = useState<ApiTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { play, currentTrack } = usePlayer();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); setTrackResults([]); return; }
    setSearching(true);
    try {
      if (activeSearchTab === "people") {
        const { users } = await usersApi.search(q);
        setSearchResults(users as SearchUser[]);
        setFollowingSet(new Set(users.filter((u: any) => u.isFollowing).map((u: any) => u.id)));
      } else {
        const { tracks } = await musicApi.getTracks({ search: q, limit: 20 });
        setTrackResults(tracks);
      }
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, [activeSearchTab]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(search), 400);
  }, [search, activeSearchTab, doSearch]);

  useEffect(() => {
    if (tab !== "discover" || activeSearchTab !== "tracks" || search.trim()) return;

    let cancelled = false;

    const loadDiscoverTracks = async () => {
      setDiscoverLoading(true);
      try {
        const { tracks } = await musicApi.getTracks({ limit: 24, sort: "trending" });
        if (!cancelled) setDiscoverTracks(tracks);
      } catch {
        if (!cancelled) setDiscoverTracks([]);
      } finally {
        if (!cancelled) setDiscoverLoading(false);
      }
    };

    void loadDiscoverTracks();

    return () => {
      cancelled = true;
    };
  }, [tab, activeSearchTab, search]);

  const handleFollow = async (userId: string) => {
    if (!isAuthenticated) { toast.error(t.explore?.signInToFollow ?? "Sign in to follow"); return; }
    try {
      await usersApi.toggleFollow(userId);
      setFollowingSet(prev => {
        const next = new Set(prev);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        return next;
      });
    } catch { toast.error(t.listenHub.followFailed); }
  };

  const tabs = [
    { id: "forYou" as const, label: t.listenHub.forYou, icon: Sparkles },
    { id: "following" as const, label: t.listenHub.followingFeed, icon: Users },
    { id: "discover" as const, label: t.listenHub.discover, icon: TrendingUp },
  ];

  const featuredTrack = !search && activeSearchTab === "tracks" ? discoverTracks[0] : null;
  const queueTracks = !search && activeSearchTab === "tracks" ? discoverTracks.slice(1, 4) : [];
  const totalDiscoverPlays = discoverTracks.reduce((sum, track) => sum + Number(track.playCount ?? 0), 0);
  const totalDiscoverArtists = new Set(discoverTracks.map((track) => track.artist?.id).filter(Boolean)).size;

  const renderTrackRow = (track: ApiTrack, index: number) => (
    <button
      key={track.id}
      onClick={() => play(track)}
      className="group flex w-full items-center gap-3 rounded-[1.35rem] border border-slate-800/80 bg-[linear-gradient(135deg,rgba(7,14,30,0.96),rgba(10,18,36,0.84))] p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-500/25 hover:shadow-[0_18px_50px_rgba(8,145,178,0.08)] sm:gap-4 sm:p-4"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-cyan-500/15 bg-cyan-500/8 text-xs font-semibold text-cyan-300 sm:h-10 sm:w-10">
        {String(index + 1).padStart(2, "0")}
      </div>
      {track.coverUrl ? (
        <img src={track.coverUrl} alt={track.title} className="h-14 w-14 rounded-2xl object-cover shadow-[0_10px_30px_rgba(15,23,42,0.35)] sm:h-16 sm:w-16" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-indigo-500/20 text-cyan-300 sm:h-16 sm:w-16">
          <Disc3 size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-sm font-semibold sm:text-base ${currentTrack?.id === track.id ? "text-cyan-300" : "text-white"}`}>{track.title}</p>
          {track.artist?.isVerified && <BadgeCheck size={14} className="shrink-0 text-cyan-300" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="truncate">{getArtistName(track)}</span>
          <span className="rounded-full border border-slate-700/40 bg-slate-900/70 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-300">{track.genre}</span>
          {track.duration ? (
            <span className="inline-flex items-center gap-1"><Clock3 size={12} />{formatDuration(track.duration)}</span>
          ) : null}
        </div>
      </div>
      <div className="hidden items-center gap-3 text-right sm:flex">
        <div>
          <div className="text-sm font-semibold text-slate-200">{formatCompactNumber(track.playCount)}</div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{t.listenHub.playsLabel}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/15 bg-cyan-500/8 text-cyan-300 transition-colors duration-300 group-hover:border-cyan-400/30 group-hover:bg-cyan-500/14">
          <Play size={16} className="ml-0.5" />
        </div>
      </div>
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.08)" }}>
        {tabs.map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === tab_.id ? "text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
            style={tab === tab_.id ? { background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)" } : undefined}
          >
            <tab_.icon size={15} />
            {tab_.label}
          </button>
        ))}
      </div>

      {tab === "forYou" && <SocialFeedPage mode="forYou" onOpenDiscover={() => setTab("discover")} />}

      {tab === "following" && <SocialFeedPage mode="following" onOpenDiscover={() => setTab("discover")} />}

      {tab === "discover" && (
        <div className="space-y-4">
          {!search && activeSearchTab === "tracks" && (
            <section className="relative overflow-hidden rounded-[1.9rem] border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(5,12,26,0.98),rgba(9,18,36,0.92))] p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(99,102,241,0.16),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.3))]" />
              <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
                <div className="space-y-5">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      <Music size={12} />
                      {t.listenHub.discoverLibraryTitle}
                    </div>
                    <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.04em] text-white sm:text-[2.5rem]">{t.listenHub.spotlightTitle}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{t.listenHub.spotlightSubtitle}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-700/35 bg-slate-950/35 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t.listenHub.tracks}</div>
                      <div className="mt-2 text-2xl font-bold text-white">{discoverTracks.length}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-700/35 bg-slate-950/35 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t.listenHub.artistsLabel}</div>
                      <div className="mt-2 text-2xl font-bold text-white">{totalDiscoverArtists}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-700/35 bg-slate-950/35 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t.listenHub.playsLabel}</div>
                      <div className="mt-2 text-2xl font-bold text-white">{formatCompactNumber(totalDiscoverPlays)}</div>
                    </div>
                  </div>

                  {featuredTrack && (
                    <button
                      onClick={() => play(featuredTrack)}
                      className="group relative grid gap-4 overflow-hidden rounded-[1.65rem] border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(10,22,40,0.92),rgba(8,16,32,0.78))] p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_24px_80px_rgba(8,145,178,0.12)] sm:p-5 lg:grid-cols-[minmax(0,1fr)_220px]"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(56,189,248,0.08),transparent_45%)] opacity-90" />
                      <div className="relative min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                          <Flame size={12} />
                          {t.listenHub.discover}
                        </div>
                        <h3 className="mt-4 truncate text-2xl font-black tracking-[-0.04em] text-white sm:text-[2rem]">{featuredTrack.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                          <span>{getArtistName(featuredTrack)}</span>
                          {featuredTrack.artist?.isVerified && <BadgeCheck size={15} className="text-cyan-300" />}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                          <span className="rounded-full border border-cyan-500/15 bg-cyan-500/10 px-3 py-1 uppercase tracking-[0.16em] text-cyan-200">{featuredTrack.genre}</span>
                          <span className="rounded-full border border-slate-700/35 bg-slate-950/35 px-3 py-1">{formatCompactNumber(featuredTrack.playCount)} {t.listenHub.playsLabel}</span>
                          {featuredTrack.duration ? <span className="rounded-full border border-slate-700/35 bg-slate-950/35 px-3 py-1">{formatDuration(featuredTrack.duration)}</span> : null}
                        </div>
                        <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/12 px-4 py-2.5 text-sm font-semibold text-cyan-200 transition-colors duration-300 group-hover:bg-cyan-500/18">
                          <Play size={15} className="ml-0.5" />
                          {t.listenHub.playNow}
                        </div>
                      </div>
                      <div className="relative flex items-end justify-end">
                        {featuredTrack.coverUrl ? (
                          <img src={featuredTrack.coverUrl} alt={featuredTrack.title} className="h-48 w-full rounded-[1.35rem] object-cover shadow-[0_24px_60px_rgba(15,23,42,0.45)] lg:h-full" />
                        ) : (
                          <div className="flex h-48 w-full items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-cyan-500/18 via-sky-500/8 to-indigo-500/18 text-cyan-200 shadow-[0_24px_60px_rgba(15,23,42,0.45)] lg:h-full">
                            <Disc3 size={42} />
                          </div>
                        )}
                      </div>
                    </button>
                  )}
                </div>

                <div className="rounded-[1.65rem] border border-slate-700/35 bg-slate-950/35 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-200">{t.listenHub.freshQueue}</h3>
                      <p className="mt-2 text-xs leading-6 text-slate-400">{t.listenHub.discoverLibrarySubtitle}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/35 bg-slate-900/70 text-cyan-300">
                      <Disc3 size={17} />
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {queueTracks.map((track, index) => (
                      <button
                        key={track.id}
                        onClick={() => play(track)}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/45 p-3 text-left transition-all duration-300 hover:border-cyan-500/20 hover:bg-slate-900/80"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/15 bg-cyan-500/8 text-[11px] font-semibold text-cyan-300">{index + 2}</div>
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt={track.title} className="h-12 w-12 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/18 to-indigo-500/18 text-cyan-200">
                            <Music size={16} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white">{track.title}</div>
                          <div className="mt-1 truncate text-xs text-slate-400">{getArtistName(track)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-200">{formatCompactNumber(track.playCount)}</div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{t.listenHub.playsLabel}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.listenHub.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-900/80 border border-slate-700/30 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          {/* Search sub-tabs */}
          <div className="flex gap-2">
            {(["tracks", "people"] as const).map(st => (
              <button
                key={st}
                onClick={() => setActiveSearchTab(st)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeSearchTab === st ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-500 border border-slate-700/30 hover:text-slate-300"
                }`}
              >
                {st === "tracks" ? <><Music size={12} className="inline mr-1" />{t.listenHub.tracks}</> : <><Users size={12} className="inline mr-1" />{t.listenHub.people}</>}
              </button>
            ))}
          </div>

          {searching && (
            <div className="flex justify-center py-8">
              <RefreshCw size={20} className="animate-spin text-cyan-400" />
            </div>
          )}

          {!search && !searching && activeSearchTab === "people" && (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p>{t.listenHub.searchEmpty}</p>
            </div>
          )}

          {!search && activeSearchTab === "tracks" && (
            discoverLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw size={20} className="animate-spin text-cyan-400" />
              </div>
            ) : discoverTracks.length > 0 ? (
              <section className="rounded-[1.65rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(6,12,25,0.98),rgba(7,14,28,0.92))] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.listenHub.trendingNow}</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-400">{t.listenHub.discoverLibrarySubtitle}</p>
                  </div>
                  <div className="hidden rounded-full border border-cyan-500/15 bg-cyan-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:inline-flex">
                    {discoverTracks.length} {t.listenHub.tracks}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {discoverTracks.map((track, index) => renderTrackRow(track, index))}
                </div>
              </section>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                <Music size={32} className="mx-auto mb-3 opacity-30" />
                <p>{t.listenHub.discoverEmpty}</p>
              </div>
            )
          )}

          {/* Track results */}
          {search && activeSearchTab === "tracks" && trackResults.length > 0 && (
            <section className="rounded-[1.65rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(6,12,25,0.98),rgba(7,14,28,0.92))] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{t.listenHub.trendingNow}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-400">{t.listenHub.noTracks.replace("\"{{query}}\"", `\"${search}\"`)}</p>
                </div>
                <div className="hidden rounded-full border border-cyan-500/15 bg-cyan-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:inline-flex">
                  {trackResults.length} {t.listenHub.tracks}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {trackResults.map((track, index) => renderTrackRow(track, index))}
              </div>
            </section>
          )}

          {/* People results */}
          {activeSearchTab === "people" && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(10,16,32,0.6)", border: "1px solid rgba(148,163,184,0.06)" }}>
                  <button onClick={() => onOpenProfile?.(u.id)} className="flex-1 flex items-center gap-3 min-w-0 text-left">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {(u.displayName ?? u.username ?? "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{u.displayName ?? u.username}</p>
                      <p className="text-xs text-slate-500 font-mono truncate">@{u.username}</p>
                    </div>
                  </button>
                  {isAuthenticated && (
                    <button
                      onClick={() => handleFollow(u.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                        followingSet.has(u.id) ? "bg-slate-700/60 text-slate-400" : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {followingSet.has(u.id) ? <><UserCheck size={12} />{t.listenHub.following}</> : <><Users size={12} />{t.listenHub.follow}</>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeSearchTab === "people" && search && !searching && searchResults.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">{t.listenHub.noArtists.replace("{{query}}", search)}</p>
          )}
          {activeSearchTab === "tracks" && search && !searching && trackResults.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-8">{t.listenHub.noTracks.replace("{{query}}", search)}</p>
          )}
        </div>
      )}
    </div>
  );
}

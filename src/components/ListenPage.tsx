import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Sparkles, TrendingUp, Users, UserCheck, Music, RefreshCw } from "lucide-react";
import { musicApi, usersApi, type ApiTrack, type ApiUser } from "../lib/api";
import { usePlayer } from "../contexts/PlayerContext";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { SocialFeedPage } from "./SocialFeedPage";
import { toast } from "sonner";

type SearchUser = ApiUser & { isFollowing: boolean };

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
          <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.05] px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                <Music size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{t.listenHub.discoverLibraryTitle}</h2>
                <p className="mt-1 text-xs leading-6 text-slate-400">{t.listenHub.discoverLibrarySubtitle}</p>
              </div>
            </div>
          </div>

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
              <div className="space-y-2">
                {discoverTracks.map(track => (
                  <div
                    key={track.id}
                    onClick={() => play(track)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors"
                    style={{ background: "rgba(10,16,32,0.6)", border: "1px solid rgba(148,163,184,0.06)" }}
                  >
                    {track.coverUrl ? (
                      <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center flex-shrink-0">
                        <Music size={18} className="text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${currentTrack?.id === track.id ? "text-cyan-300" : "text-slate-200"}`}>{track.title}</p>
                      <p className="text-xs text-slate-500 truncate">{track.artist?.displayName ?? track.artist?.username}</p>
                    </div>
                    <div className="text-xs text-slate-600 font-mono flex-shrink-0">{track.playCount ?? 0} plays</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                <Music size={32} className="mx-auto mb-3 opacity-30" />
                <p>{t.listenHub.discoverEmpty}</p>
              </div>
            )
          )}

          {/* Track results */}
          {search && activeSearchTab === "tracks" && trackResults.length > 0 && (
            <div className="space-y-2">
              {trackResults.map(track => (
                <div
                  key={track.id}
                  onClick={() => play(track)}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors"
                  style={{ background: "rgba(10,16,32,0.6)", border: "1px solid rgba(148,163,184,0.06)" }}
                >
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 flex items-center justify-center flex-shrink-0">
                      <Music size={18} className="text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${currentTrack?.id === track.id ? "text-cyan-300" : "text-slate-200"}`}>{track.title}</p>
                    <p className="text-xs text-slate-500 truncate">{track.artist?.displayName ?? track.artist?.username}</p>
                  </div>
                  <div className="text-xs text-slate-600 font-mono flex-shrink-0">{track.playCount ?? 0} plays</div>
                </div>
              ))}
            </div>
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

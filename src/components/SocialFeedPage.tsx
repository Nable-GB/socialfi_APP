import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Disc3, Flame, Loader2, MessageSquareText, Play, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { FeedPost } from "./FeedPost";
import { Textarea } from "@/components/ui/textarea";
import { useFeed } from "../hooks/useFeed";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LangContext";
import { usePlayer } from "../contexts/PlayerContext";
import { musicApi, usersApi, type ApiTrack } from "../lib/api";

interface SocialFeedPageProps {
  mode: "forYou" | "following";
  onOpenDiscover?: () => void;
  onOpenAuth?: () => void;
}

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCompactNumber(value: number | null | undefined) {
  return compactNumberFormatter.format(Number(value ?? 0));
}

function getArtistName(track: ApiTrack) {
  return track.artist?.displayName ?? track.artist?.username ?? "Unknown artist";
}

export function SocialFeedPage({ mode, onOpenDiscover, onOpenAuth }: SocialFeedPageProps) {
  const { isAuthenticated } = useAuth();
  const { t } = useLang();
  const { posts, isLoading, isLoadingMore, hasMore, loadMore, createPost, likePost, commentPost, claimAdReward, deletePost, getComments } = useFeed();
  const { play, setQueue, currentTrack, isPlaying, pause, resume } = usePlayer();
  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingLoading, setFollowingLoading] = useState(false);
  const [trendingTracks, setTrendingTracks] = useState<ApiTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadFollowing = async () => {
      if (!isAuthenticated) {
        setFollowingIds(new Set());
        return;
      }

      try {
        setFollowingLoading(true);
        const { users } = await usersApi.getFollowing();
        if (!cancelled) {
          setFollowingIds(new Set(users.map((user) => user.id)));
        }
      } catch {
        if (!cancelled) {
          setFollowingIds(new Set());
        }
      } finally {
        if (!cancelled) {
          setFollowingLoading(false);
        }
      }
    };

    void loadFollowing();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const loadTrendingTracks = async () => {
      try {
        setTracksLoading(true);
        const { tracks } = await musicApi.getTracks({ sort: "trending", limit: 5 });
        if (!cancelled) {
          setTrendingTracks(tracks);
        }
      } catch {
        if (!cancelled) {
          setTrendingTracks([]);
        }
      } finally {
        if (!cancelled) {
          setTracksLoading(false);
        }
      }
    };

    void loadTrendingTracks();
    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePosts = useMemo(() => {
    if (mode !== "following") return posts;
    return posts.filter((post) => followingIds.has(post.author.id));
  }, [mode, posts, followingIds]);

  const handleSubmitPost = async () => {
    if (!isAuthenticated) {
      onOpenAuth?.();
      return;
    }
    if (!composerText.trim()) return;

    try {
      setPosting(true);
      await createPost(composerText.trim());
      setComposerText("");
    } finally {
      setPosting(false);
    }
  };

  const handlePlayTrack = (track: ApiTrack) => {
    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
      return;
    }

    setQueue(trendingTracks);
    play(track);
  };

  const showFollowingEmpty = mode === "following" && !isLoading && !followingLoading && visiblePosts.length === 0;
  const featuredTrack = trendingTracks[0] ?? null;
  const queueTracks = trendingTracks.slice(1, 4);
  const totalTrackPlays = trendingTracks.reduce((sum, track) => sum + Number(track.playCount ?? 0), 0);
  const spotlightTitle = mode === "forYou" ? t.listenHub.feedSpotlightTitle : t.listenHub.followingSpotlightTitle;
  const spotlightSubtitle = mode === "forYou" ? t.listenHub.feedSpotlightSubtitle : t.listenHub.followingSpotlightSubtitle;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
      <div className="space-y-4 min-w-0">
        <section className="relative overflow-hidden rounded-[1.8rem] border border-cyan-500/10 bg-[linear-gradient(135deg,rgba(7,14,28,0.98),rgba(10,18,36,0.9))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.28)] sm:p-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(99,102,241,0.14),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.24))]" />

          <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_280px] xl:gap-5">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    {mode === "forYou" ? <Sparkles size={12} /> : <Users size={12} />}
                    {mode === "forYou" ? t.listenHub.forYou : t.listenHub.followingFeed}
                  </div>
                  <h2 className="mt-4 max-w-2xl text-[1.9rem] font-black tracking-[-0.035em] text-white sm:text-[2.05rem] sm:leading-[1.05]">{spotlightTitle}</h2>
                  <p className="mt-2.5 max-w-2xl text-sm leading-6 text-slate-300">{spotlightSubtitle}</p>
                </div>
                <button
                  onClick={onOpenDiscover}
                  className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-500/15"
                >
                  <Disc3 size={14} />
                  {t.listenHub.discoverMusic}
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700/25 bg-slate-950/35 px-3.5 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.listenHub.postsLabel}</div>
                  <div className="mt-1.5 text-[1.55rem] font-bold leading-none text-white">{formatCompactNumber(visiblePosts.length)}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/25 bg-slate-950/35 px-3.5 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.listenHub.creatorsLabel}</div>
                  <div className="mt-1.5 text-[1.55rem] font-bold leading-none text-white">{formatCompactNumber(mode === "following" ? followingIds.size : trendingTracks.length)}</div>
                </div>
                <div className="rounded-2xl border border-slate-700/25 bg-slate-950/35 px-3.5 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{t.listenHub.playsLabel}</div>
                  <div className="mt-1.5 text-[1.55rem] font-bold leading-none text-white">{formatCompactNumber(totalTrackPlays)}</div>
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3.5 shadow-[0_16px_40px_rgba(2,6,23,0.14)] sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-bold text-white shadow-[0_10px_30px_rgba(34,211,238,0.2)]">
                    <MessageSquareText size={18} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <Textarea
                      value={composerText}
                      onChange={(e) => setComposerText(e.target.value)}
                      placeholder={t.listenHub.composerPlaceholder}
                      className="min-h-[96px] resize-none border-white/8 bg-slate-950/50 text-sm leading-6 text-white placeholder:text-slate-500"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                        {isAuthenticated ? t.listenHub.composerHint : t.feed.signInToPost}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onOpenDiscover}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:hidden"
                        >
                          <Disc3 size={14} />
                          {t.listenHub.discoverMusic}
                        </button>
                        <button
                          onClick={handleSubmitPost}
                          disabled={posting || !composerText.trim()}
                          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(34,211,238,0.2)] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {posting ? <Loader2 size={15} className="animate-spin" /> : <MessageSquareText size={15} />}
                          {posting ? t.feed.posting : t.feed.postBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.5rem] border border-slate-700/25 bg-slate-950/32 p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{t.listenHub.queueTitle}</div>
                  <p className="mt-2 text-xs leading-6 text-slate-400">{t.listenHub.queueSubtitle}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/25 bg-slate-900/60 text-cyan-300">
                  <Disc3 size={16} />
                </div>
              </div>

              {featuredTrack ? (
                <button
                  onClick={() => handlePlayTrack(featuredTrack)}
                  className="group w-full overflow-hidden rounded-[1.35rem] border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(10,22,40,0.92),rgba(8,16,32,0.8))] p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/30"
                >
                  <div className="flex items-center gap-3">
                    {featuredTrack.coverUrl ? (
                      <img src={featuredTrack.coverUrl} alt={featuredTrack.title} className="h-16 w-16 rounded-2xl object-cover shadow-[0_12px_30px_rgba(15,23,42,0.35)]" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/18 to-indigo-500/18 text-cyan-200">
                        <Disc3 size={22} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        <Flame size={11} />
                        {t.listenHub.trendingTitle}
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold leading-5 text-white">{featuredTrack.title}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="truncate">{getArtistName(featuredTrack)}</span>
                        {featuredTrack.artist?.isVerified && <BadgeCheck size={13} className="shrink-0 text-cyan-300" />}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/12 text-cyan-300">
                      <Play size={16} className="ml-0.5" />
                    </div>
                  </div>
                </button>
              ) : null}

              <div className="space-y-2">
                {queueTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handlePlayTrack(track)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/45 p-2.5 text-left transition-all duration-300 hover:border-cyan-500/20 hover:bg-slate-900/80"
                  >
                    {track.coverUrl ? (
                      <img src={track.coverUrl} alt={track.title} className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/18 to-indigo-500/18 text-cyan-200">
                        <Disc3 size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-5 text-slate-100">{track.title}</p>
                      <p className="truncate text-xs text-slate-500">{getArtistName(track)}</p>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">{formatCompactNumber(track.playCount)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-slate-700/20 bg-[linear-gradient(180deg,rgba(6,12,25,0.98),rgba(7,14,28,0.92))] p-3.5 shadow-[0_20px_60px_rgba(2,12,27,0.22)] sm:p-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{t.listenHub.feedColumnTitle}</div>
              <h3 className="mt-2 text-lg font-bold text-white">{mode === "forYou" ? t.listenHub.socialTitle : t.listenHub.followingFeed}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">{mode === "forYou" ? t.listenHub.socialSubtitle : t.listenHub.followingSubtitle}</p>
            </div>
            <div className="hidden rounded-full border border-cyan-500/15 bg-cyan-500/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:inline-flex">
              {formatCompactNumber(visiblePosts.length)} {t.listenHub.postsLabel}
            </div>
          </div>

          <div className="mt-4 space-y-3.5">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 animate-pulse">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/[0.05]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 rounded bg-white/[0.05]" />
                        <div className="h-3 w-full rounded bg-white/[0.04]" />
                        <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : showFollowingEmpty ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                <Users size={34} className="mx-auto mb-3 text-slate-600" />
                <h3 className="text-lg font-semibold text-white">{t.listenHub.followingEmpty}</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{t.listenHub.followingEmptySub}</p>
                <button
                  onClick={onOpenDiscover}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/15"
                >
                  <Disc3 size={14} />
                  {t.listenHub.discoverMusic}
                </button>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                <MessageSquareText size={34} className="mx-auto mb-3 text-slate-600" />
                <h3 className="text-lg font-semibold text-white">{t.feed.noPosts}</h3>
              </div>
            ) : (
              <>
                {visiblePosts.map((post) => (
                  <FeedPost
                    key={post.id}
                    post={post}
                    onClaimReward={() => {
                      toast.success(t.feed.rewardClaimed);
                    }}
                    onLike={likePost}
                    onComment={commentPost}
                    onClaimAdReward={claimAdReward}
                    onDelete={deletePost}
                    onGetComments={getComments}
                  />
                ))}
                {hasMore && mode === "forYou" && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                    >
                      {isLoadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                      {t.feed.loadMore}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-[1.6rem] border border-slate-700/20 bg-[linear-gradient(180deg,rgba(8,14,30,0.92),rgba(6,12,24,0.88))] p-3.5 shadow-[0_18px_50px_rgba(2,12,27,0.18)] sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">{t.listenHub.pulseTitle}</div>
              <h3 className="mt-2 text-sm font-semibold text-white">{t.musicFeed.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.listenHub.pulseSubtitle}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700/25 bg-slate-900/70 text-cyan-300">
              <Sparkles size={16} />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {tracksLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
              ))
            ) : trendingTracks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-500">
                {t.musicFeed.noTracks}
              </div>
            ) : (
              trendingTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-slate-950/40 p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-700/40 to-purple-700/40 text-slate-300">
                      <Disc3 size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5 text-slate-100">{track.title}</p>
                    <p className="truncate text-xs text-slate-500">{getArtistName(track)}</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">{formatCompactNumber(track.playCount)}</div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-cyan-500/15 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),rgba(99,102,241,0.16))] p-4 shadow-[0_18px_50px_rgba(8,145,178,0.12)]">
          <h3 className="text-sm font-semibold text-white">{t.listenHub.discoverMusic}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-100/75">{t.listenHub.socialRailCopy}</p>
          <button
            onClick={onOpenDiscover}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            <Sparkles size={14} />
            {t.listenHub.discover}
          </button>
        </section>
      </aside>
    </div>
  );
}

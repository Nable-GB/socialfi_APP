import { useEffect, useMemo, useState } from "react";
import { Disc3, Loader2, MessageSquareText, Sparkles, Users } from "lucide-react";
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

    loadFollowing();
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

    loadTrendingTracks();
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

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4 min-w-0">
        <section className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(135deg,rgba(8,15,30,0.96),rgba(8,15,30,0.82))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-300">
                {mode === "forYou" ? <Sparkles size={12} /> : <Users size={12} />}
                {mode === "forYou" ? t.listenHub.forYou : t.listenHub.followingFeed}
              </div>
              <h2 className="mt-3 text-2xl font-bold text-white">{t.listenHub.socialTitle}</h2>
              <p className="mt-1 text-sm text-slate-400">{mode === "forYou" ? t.listenHub.socialSubtitle : t.listenHub.followingSubtitle}</p>
            </div>
            <button
              onClick={onOpenDiscover}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <Disc3 size={14} />
              {t.listenHub.discoverMusic}
            </button>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-bold text-white shadow-[0_10px_30px_rgba(34,211,238,0.2)]">
                <MessageSquareText size={18} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <Textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder={t.listenHub.composerPlaceholder}
                  className="min-h-[110px] resize-none border-white/8 bg-slate-950/50 text-sm text-white placeholder:text-slate-500"
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
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(34,211,238,0.2)] transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {posting ? <Loader2 size={15} className="animate-spin" /> : <MessageSquareText size={15} />}
                      {posting ? t.feed.posting : t.feed.postBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
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
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                  >
                    {isLoadingMore ? <Loader2 size={15} className="animate-spin" /> : null}
                    {t.feed.loadMore}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
          <h3 className="text-sm font-semibold text-white">{t.musicFeed.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t.musicFeed.subtitle}</p>
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
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-slate-950/40 p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                >
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-700/40 to-purple-700/40 text-slate-300">
                      <Disc3 size={18} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{track.title}</p>
                    <p className="truncate text-xs text-slate-500">{track.artist?.displayName ?? track.artist?.username}</p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">{track.playCount ?? 0}</div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(99,102,241,0.12))] p-4">
          <h3 className="text-sm font-semibold text-white">{t.listenHub.discoverMusic}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300/80">{t.listenHub.socialRailCopy}</p>
          <button
            onClick={onOpenDiscover}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15"
          >
            <Sparkles size={14} />
            {t.listenHub.discover}
          </button>
        </section>
      </aside>
    </div>
  );
}

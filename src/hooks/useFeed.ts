import { useState, useEffect, useCallback } from "react";
import { feedApi, rewardsApi, type ApiPost } from "../lib/api";
import { toast } from "sonner";

export function useFeed() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await feedApi.getFeed({ limit: 10 });
      setPosts(data.feed);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const data = await feedApi.getFeed({ cursor: nextCursor, limit: 10 });
      setPosts((prev) => [...prev, ...data.feed]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Failed to load more posts");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, nextCursor, isLoadingMore]);

  const createPost = useCallback(async (content: string) => {
    try {
      const { post } = await feedApi.createPost({ content });
      setPosts((prev) => [post, ...prev]);
      toast.success("Post published! 🚀");
      return post;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post");
      throw err;
    }
  }, []);

  const likePost = useCallback(async (postId: string) => {
    try {
      const res = await feedApi.interact(postId, { type: "LIKE" });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likesCount: res.removed ? p.likesCount - 1 : p.likesCount + 1,
                userInteractions: res.removed
                  ? p.userInteractions.filter((i) => i !== "LIKE")
                  : [...p.userInteractions, "LIKE"],
              }
            : p
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }, []);

  const commentPost = useCallback(async (postId: string, commentText: string) => {
    try {
      await feedApi.interact(postId, { type: "COMMENT", commentText });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
        )
      );
      toast.success("Comment posted! 💬");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to comment");
    }
  }, []);

  const claimAdReward = useCallback(async (postId: string, type: "VIEW" | "ENGAGEMENT") => {
    try {
      const res = await rewardsApi.claimReward({ postId, type });
      // Mark the post as claimed in local state
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, rewardClaimed: true } : p))
      );
      toast.success(`Earned ${parseFloat(res.reward.amount).toFixed(4)} tokens! 🪙`);
      return res.reward;
    } catch (err) {
      if (err instanceof Error && err.message.includes("already claimed")) {
        toast.info("Reward already claimed for this post");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to claim reward");
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    loadFeed,
    loadMore,
    createPost,
    likePost,
    commentPost,
    claimAdReward,
  };
}

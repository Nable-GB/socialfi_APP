import { useState, useEffect, useCallback } from "react";
import { feedApi, rewardsApi, type ApiPost, type ApiComment } from "../lib/api";
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

  const createPost = useCallback(async (content: string, mediaUrl?: string) => {
    try {
      const { post } = await feedApi.createPost({ content, mediaUrl });
      const normalizedPost: ApiPost = {
        ...post,
        isSponsored: false,
        rewardClaimed: false,
        userInteractions: [],
        likesCount: post.likesCount ?? 0,
        commentsCount: post.commentsCount ?? 0,
        sharesCount: post.sharesCount ?? 0,
      };
      setPosts((prev) => [normalizedPost, ...prev]);
      toast.success("Post published! 🚀");
      return normalizedPost;
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

  const deletePost = useCallback(async (postId: string) => {
    try {
      await feedApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
      throw err;
    }
  }, []);

  const getComments = useCallback(async (postId: string): Promise<ApiComment[]> => {
    try {
      const res = await feedApi.getComments(postId, { limit: 30 });
      return res.comments;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load comments");
      return [];
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
      const msg = err instanceof Error ? err.message : "Failed to claim reward";
      if (msg.includes("already claimed")) {
        toast.info("Reward already claimed for this post");
      } else if (msg.includes("5 seconds") || msg.includes("view the post")) {
        toast.error("Please view the post for at least 5 seconds before claiming");
      } else if (msg.includes("pool is exhausted") || msg.includes("impression limit")) {
        toast.error("This campaign's reward pool has been exhausted");
      } else if (msg.includes("no longer active") || msg.includes("not active")) {
        toast.error("This campaign is no longer active");
      } else if (msg.includes("own sponsored")) {
        toast.error("You cannot claim rewards on your own sponsored post");
      } else {
        toast.error(msg);
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
    deletePost,
    getComments,
  };
}

import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";

// ─── Validation ─────────────────────────────────────────────────────────────

const feedQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "GIF", "NONE"]).default("NONE"),
});

// ─── GET /api/feed — Mixed organic + sponsored feed ────────────────────────

export async function getFeed(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit } = feedQuerySchema.parse(req.query);
    const userId = req.user?.userId;

    // Fetch organic posts (cursor-based pagination)
    const organicPosts = await prisma.socialPost.findMany({
      where: {
        isActive: true,
        type: "ORGANIC",
        ...(cursor ? { createdAt: { lt: (await prisma.socialPost.findUnique({ where: { id: cursor } }))?.createdAt } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // Fetch active sponsored posts from running campaigns
    const sponsoredPosts = await prisma.socialPost.findMany({
      where: {
        isActive: true,
        type: "SPONSORED",
        adCampaign: {
          status: "ACTIVE",
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.max(2, Math.floor(limit / 5)), // ~1 ad per 5 posts
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        adCampaign: {
          select: {
            id: true,
            title: true,
            targetUrl: true,
          },
        },
      },
    });

    // If user is logged in, check which sponsored posts they already claimed rewards for
    let claimedAdPostIds: Set<string> = new Set();
    if (userId && sponsoredPosts.length > 0) {
      const claimed = await prisma.rewardTransaction.findMany({
        where: {
          userId,
          type: { in: ["AD_VIEW", "AD_ENGAGEMENT"] },
          relatedPostId: { in: sponsoredPosts.map((p) => p.id) },
        },
        select: { relatedPostId: true },
      });
      claimedAdPostIds = new Set(claimed.map((c) => c.relatedPostId).filter(Boolean) as string[]);
    }

    // Check user interactions (likes, bookmarks) for all posts
    let userInteractions: Map<string, string[]> = new Map();
    if (userId) {
      const allPostIds = [...organicPosts, ...sponsoredPosts].map((p) => p.id);
      const interactions = await prisma.postInteraction.findMany({
        where: { userId, postId: { in: allPostIds } },
        select: { postId: true, type: true },
      });
      for (const i of interactions) {
        const existing = userInteractions.get(i.postId) ?? [];
        existing.push(i.type);
        userInteractions.set(i.postId, existing);
      }
    }

    // Merge and interleave: insert sponsored posts into feed
    const feed: any[] = [];
    let adIndex = 0;

    // If no organic posts, just show all sponsored posts
    if (organicPosts.length === 0) {
      for (const ad of sponsoredPosts) {
        feed.push({
          ...ad,
          isSponsored: true,
          rewardClaimed: claimedAdPostIds.has(ad.id),
          userInteractions: userInteractions.get(ad.id) ?? [],
        });
      }
    } else {
      for (let i = 0; i < organicPosts.length; i++) {
        // Insert a sponsored post after position 1, then every 4 posts
        if (i > 0 && (i === 1 || i % 4 === 0) && adIndex < sponsoredPosts.length) {
          const ad = sponsoredPosts[adIndex];
          feed.push({
            ...ad,
            isSponsored: true,
            rewardClaimed: claimedAdPostIds.has(ad.id),
            userInteractions: userInteractions.get(ad.id) ?? [],
          });
          adIndex++;
        }

        const post = organicPosts[i];
        feed.push({
          ...post,
          isSponsored: false,
          rewardClaimed: false,
          userInteractions: userInteractions.get(post.id) ?? [],
        });
      }

      // Append remaining sponsored posts at end
      while (adIndex < sponsoredPosts.length) {
        const ad = sponsoredPosts[adIndex];
        feed.push({
          ...ad,
          isSponsored: true,
          rewardClaimed: claimedAdPostIds.has(ad.id),
          userInteractions: userInteractions.get(ad.id) ?? [],
        });
        adIndex++;
      }
    }

    const nextCursor = organicPosts.length === limit ? organicPosts[organicPosts.length - 1]?.id : null;

    res.json({
      feed,
      nextCursor,
      hasMore: organicPosts.length === limit,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params", details: err.errors });
      return;
    }
    console.error("GetFeed error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/feed/posts — Create a new organic post ──────────────────────

export async function createPost(req: Request, res: Response): Promise<void> {
  try {
    const data = createPostSchema.parse(req.body);
    const userId = req.user!.userId;

    const post = await prisma.socialPost.create({
      data: {
        authorId: userId,
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        type: "ORGANIC",
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    res.status(201).json({ post });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("CreatePost error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/feed/posts/:id/interact — Like, Comment, Share, Bookmark ────

const interactSchema = z.object({
  type: z.enum(["LIKE", "COMMENT", "SHARE", "BOOKMARK"]),
  commentText: z.string().max(2000).optional(),
});

export async function interactWithPost(req: Request, res: Response): Promise<void> {
  try {
    const postId = req.params.id as string;
    const data = interactSchema.parse(req.body);
    const userId = req.user!.userId;

    // Verify post exists
    const post = await prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post || !post.isActive) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    if (data.type === "COMMENT") {
      // Comments are always additive (no uniqueness constraint for COMMENT)
      const interaction = await prisma.postInteraction.create({
        data: {
          userId,
          postId,
          type: "COMMENT",
          commentText: data.commentText,
        },
      });

      await prisma.socialPost.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });

      res.status(201).json({ interaction });
      return;
    }

    // For LIKE, BOOKMARK, SHARE — toggle behavior (upsert/delete)
    const existing = await prisma.postInteraction.findUnique({
      where: { unique_user_post_interaction: { userId, postId, type: data.type } },
    });

    if (existing) {
      // Remove the interaction (unlike, unbookmark)
      await prisma.postInteraction.delete({ where: { id: existing.id } });

      const counterField =
        data.type === "LIKE" ? "likesCount" :
        data.type === "SHARE" ? "sharesCount" : "bookmarksCount";

      await prisma.socialPost.update({
        where: { id: postId },
        data: { [counterField]: { decrement: 1 } },
      });

      res.json({ removed: true, type: data.type });
      return;
    }

    // Create new interaction
    const interaction = await prisma.postInteraction.create({
      data: { userId, postId, type: data.type },
    });

    const counterField =
      data.type === "LIKE" ? "likesCount" :
      data.type === "SHARE" ? "sharesCount" : "bookmarksCount";

    await prisma.socialPost.update({
      where: { id: postId },
      data: { [counterField]: { increment: 1 } },
    });

    res.status(201).json({ interaction });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("Interact error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

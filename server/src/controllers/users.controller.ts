import { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { notifyFollow } from "../services/notification.service.js";
import { sanitizeText } from "../middleware/sanitize.js";

// ─── Validation ─────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).optional(),
  bio: z.string().max(300).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const linkWalletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// ─── Shared user select ─────────────────────────────────────────────────────

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  role: true,
  isVerified: true,
  walletAddress: true,
  referralCode: true,
  createdAt: true,
  _count: { select: { followers: true, following: true, posts: true } },
} as const;

// ─── PATCH /api/users/profile ─────────────────────────────────────────────

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const data = updateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined && { displayName: sanitizeText(data.displayName) }),
        ...(data.bio !== undefined && { bio: sanitizeText(data.bio) }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
      },
      select: PUBLIC_USER_SELECT,
    });

    res.json({ user: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("UpdateProfile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/users/change-password ─────────────────────────────────────

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const data = changePasswordSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: "Password change not available for wallet-only accounts" });
      return;
    }

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    if (data.currentPassword === data.newPassword) {
      res.status(400).json({ error: "New password must be different from current password" });
      return;
    }

    const newHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("ChangePassword error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/users/link-wallet ──────────────────────────────────────────

export async function linkWallet(req: Request, res: Response): Promise<void> {
  try {
    const data = linkWalletSchema.parse(req.body);
    const userId = req.user!.userId;

    // Check if wallet is already used by another account
    const existing = await prisma.user.findUnique({
      where: { walletAddress: data.walletAddress },
    });
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "This wallet address is already linked to another account" });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { walletAddress: data.walletAddress },
      select: PUBLIC_USER_SELECT,
    });

    res.json({ user: updated, message: "Wallet linked successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("LinkWallet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/users/search?q=… ───────────────────────────────────────────

export async function searchUsers(req: Request, res: Response): Promise<void> {
  try {
    const { q, limit } = searchQuerySchema.parse(req.query);
    const requesterId = req.user?.userId;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
        ...(requesterId ? { NOT: { id: requesterId } } : {}),
      },
      select: {
        ...PUBLIC_USER_SELECT,
        followers: requesterId
          ? { where: { followerId: requesterId }, select: { followerId: true } }
          : false,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const result = users.map(u => ({
      ...u,
      isFollowing: requesterId ? (u as any).followers?.length > 0 : false,
      followers: undefined,
    }));

    res.json({ users: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params", details: err.errors });
      return;
    }
    console.error("SearchUsers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/users/:id ───────────────────────────────────────────────────

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const requesterId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        ...PUBLIC_USER_SELECT,
        followers: requesterId
          ? { where: { followerId: requesterId }, select: { followerId: true } }
          : false,
        posts: {
          where: { type: "ORGANIC", isActive: true },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            content: true,
            mediaUrl: true,
            mediaType: true,
            likesCount: true,
            commentsCount: true,
            sharesCount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        ...user,
        isFollowing: requesterId ? (user as any).followers?.length > 0 : false,
        followers: undefined,
      },
    });
  } catch (err) {
    console.error("GetUserProfile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/users/:id/follow ───────────────────────────────────────────

export async function toggleFollow(req: Request, res: Response): Promise<void> {
  try {
    const targetId = req.params.id as string;
    const followerId = req.user!.userId;

    if (targetId === followerId) {
      res.status(400).json({ error: "Cannot follow yourself" });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    });

    if (existing) {
      // Unfollow
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId: targetId } },
      });
      res.json({ following: false, message: `Unfollowed @${target.username}` });
    } else {
      // Follow
      const follower = await prisma.user.findUnique({ where: { id: followerId }, select: { username: true } });
      await prisma.follow.create({
        data: { followerId, followingId: targetId },
      });
      // Fire notification (non-blocking)
      if (follower) notifyFollow(targetId, follower.username, followerId).catch(() => {});
      res.json({ following: true, message: `Now following @${target.username}` });
    }
  } catch (err) {
    console.error("ToggleFollow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

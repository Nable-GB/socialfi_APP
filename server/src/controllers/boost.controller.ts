import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// ─── POST /api/music/tracks/:id/boost — Boost a track ───────────────────────

export async function boostTrack(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);
    const { tier = "BASIC" } = req.body;

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.status !== "PUBLISHED") {
      res.status(404).json({ error: "Track not found or not published" });
      return;
    }

    // Anti-abuse: check engagement score
    const engagement = await (prisma as any).engagementScore.findUnique({ where: { userId } });
    if (engagement?.isFlagged) {
      res.status(403).json({ error: "Your account is flagged for suspicious activity" });
      return;
    }

    // Rate limit: max 10 boosts per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyBoosts = await (prisma as any).musicBoost.count({
      where: { boosterId: userId, createdAt: { gte: today } },
    });
    if (dailyBoosts >= 10) {
      res.status(429).json({ error: "Daily boost limit reached (10/day)" });
      return;
    }

    // Cost per tier
    const costMap: Record<string, number> = { BASIC: 1, PREMIUM: 5, SUPER: 20 };
    const cost = costMap[tier] || 1;

    // Check user balance
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { offChainBalance: true } });
    if (!user || Number(user.offChainBalance) < cost) {
      res.status(400).json({ error: `Insufficient balance. Need ${cost} tokens.` });
      return;
    }

    const p = prisma as any;
    const [boost] = await prisma.$transaction([
      p.musicBoost.create({
        data: {
          trackId,
          boosterId: userId,
          tier: tier as any,
          tokensCost: cost,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { offChainBalance: { decrement: cost } },
      }),
      p.track.update({
        where: { id: trackId },
        data: { boostCount: { increment: 1 } },
      }),
      p.engagementScore.upsert({
        where: { userId },
        create: { userId, score: 50, totalActions: 1, validActions: 1 },
        update: { totalActions: { increment: 1 }, validActions: { increment: 1 }, lastActionAt: new Date() },
      }),
    ]);

    res.status(201).json({ success: true, boost, message: `Track boosted with ${tier} tier!` });
  } catch (err) {
    console.error("boostTrack error:", err);
    res.status(500).json({ error: "Failed to boost track" });
  }
}

// ─── POST /api/music/tracks/:id/repost — Share-to-earn repost ───────────────

export async function repostTrack(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);
    const { message } = req.body;

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track || track.status !== "PUBLISHED") {
      res.status(404).json({ error: "Track not found or not published" });
      return;
    }

    // Can't repost own track
    if (track.artistId === userId) {
      res.status(400).json({ error: "Cannot repost your own track" });
      return;
    }

    // Check existing repost
    const existing = await (prisma as any).trackRepost.findUnique({
      where: { trackId_userId: { trackId, userId } },
    });
    if (existing) {
      res.status(409).json({ error: "Already reposted this track" });
      return;
    }

    // Anti-abuse: check engagement + daily limits
    const engagement = await (prisma as any).engagementScore.findUnique({ where: { userId } });
    if (engagement?.isFlagged) {
      res.status(403).json({ error: "Account flagged" });
      return;
    }

    // Base reward: 0.5 tokens, higher with good engagement score
    const trustMultiplier = engagement ? Math.min(engagement.score / 50, 2) : 1;
    const baseReward = 0.5;
    const reward = baseReward * trustMultiplier;

    const p = prisma as any;
    const [repost] = await prisma.$transaction([
      p.trackRepost.create({
        data: { trackId, userId, message, rewardEarned: reward },
      }),
      p.track.update({
        where: { id: trackId },
        data: {
          repostCount: { increment: 1 },
          shareCount: { increment: 1 },
          engagementScore: { increment: 0.5 },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          offChainBalance: { increment: reward },
          totalEarned: { increment: reward },
        },
      }),
      p.engagementScore.upsert({
        where: { userId },
        create: { userId, score: 50, totalActions: 1, validActions: 1 },
        update: { totalActions: { increment: 1 }, validActions: { increment: 1 }, lastActionAt: new Date() },
      }),
    ]);

    res.status(201).json({ success: true, repost, rewardEarned: reward, message: `Reposted! Earned ${reward.toFixed(2)} tokens` });
  } catch (err) {
    console.error("repostTrack error:", err);
    res.status(500).json({ error: "Failed to repost" });
  }
}

// ─── GET /api/music/tracks/:id/boosts — Get boost stats ─────────────────────

export async function getBoostStats(req: Request, res: Response): Promise<void> {
  try {
    const trackId = String(req.params.id);
    const p = prisma as any;
    const [boosts, totalSpent, activeCount] = await Promise.all([
      p.musicBoost.findMany({
        where: { trackId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { booster: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      p.musicBoost.aggregate({ where: { trackId }, _sum: { tokensCost: true } }),
      p.musicBoost.count({ where: { trackId, isActive: true, expiresAt: { gt: new Date() } } }),
    ]);

    res.json({ boosts, totalSpent: totalSpent._sum.tokensCost || 0, activeCount });
  } catch (err) {
    console.error("getBoostStats error:", err);
    res.status(500).json({ error: "Failed to get boost stats" });
  }
}

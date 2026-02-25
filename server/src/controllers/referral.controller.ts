import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";

// ─── Tier config ──────────────────────────────────────────────────────────────
// Rate increases as you refer more people
export const REFERRAL_TIERS = [
  { minReferrals: 0,   rate: 0.05,  label: "Bronze",   color: "#cd7f32", bonus: 0    },
  { minReferrals: 5,   rate: 0.07,  label: "Silver",   color: "#94a3b8", bonus: 50   },
  { minReferrals: 15,  rate: 0.10,  label: "Gold",     color: "#f59e0b", bonus: 150  },
  { minReferrals: 30,  rate: 0.13,  label: "Platinum", color: "#22d3ee", bonus: 400  },
  { minReferrals: 60,  rate: 0.15,  label: "Diamond",  color: "#a855f7", bonus: 1000 },
] as const;

export function getTier(referralCount: number) {
  let tier = REFERRAL_TIERS[0];
  for (const t of REFERRAL_TIERS) {
    if (referralCount >= t.minReferrals) tier = t;
  }
  return tier;
}

export function getNextTier(referralCount: number) {
  for (const t of REFERRAL_TIERS) {
    if (referralCount < t.minReferrals) return t;
  }
  return null; // already at max tier
}

// ─── GET /api/referrals/stats ─────────────────────────────────────────────────

export async function getReferralStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const [user, referrals, bonusAggregate, recentBonuses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, username: true },
      }),
      prisma.user.findMany({
        where: { referredById: userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
          totalEarned: true,
          _count: { select: { rewards: true } },
        },
      }),
      prisma.rewardTransaction.aggregate({
        where: { userId, type: "REFERRAL_BONUS" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.rewardTransaction.findMany({
        where: { userId, type: "REFERRAL_BONUS" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          description: true,
          createdAt: true,
          sourceUser: { select: { id: true, username: true, displayName: true } },
        },
      }),
    ]);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const tier = getTier(referrals.length);
    const nextTier = getNextTier(referrals.length);
    const referralLink = `${env.FRONTEND_URL}?ref=${user.referralCode}`;

    res.json({
      referralCode: user.referralCode,
      referralLink,
      tier: {
        ...tier,
        nextTier,
        progressToNext: nextTier
          ? Math.round((referrals.length / nextTier.minReferrals) * 100)
          : 100,
        referralsToNext: nextTier ? nextTier.minReferrals - referrals.length : 0,
      },
      totals: {
        referralCount: referrals.length,
        bonusEarned: bonusAggregate._sum.amount?.toString() ?? "0",
        bonusTransactions: bonusAggregate._count,
      },
      referrals,
      recentBonuses,
    });
  } catch (err) {
    console.error("GetReferralStats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/referrals/leaderboard ──────────────────────────────────────────

export async function getReferralLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    // Group by referredById and count, then join user info
    const raw = await prisma.user.groupBy({
      by: ["referredById"],
      where: { referredById: { not: null } },
      _count: { referredById: true },
      orderBy: { _count: { referredById: "desc" } },
      take: 20,
    });

    const userIds = raw
      .filter(r => r.referredById !== null)
      .map(r => r.referredById as string);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const leaderboard = raw
      .filter(r => r.referredById !== null)
      .map((r, idx) => {
        const count = r._count.referredById;
        const tier = getTier(count);
        return {
          rank: idx + 1,
          user: userMap.get(r.referredById!),
          referralCount: count,
          tier: { label: tier.label, color: tier.color, rate: tier.rate },
        };
      });

    res.json({ leaderboard });
  } catch (err) {
    console.error("GetLeaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/referrals/tiers ─────────────────────────────────────────────────

export async function getTiers(_req: Request, res: Response): Promise<void> {
  res.json({ tiers: REFERRAL_TIERS });
}

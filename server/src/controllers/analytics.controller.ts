import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// ─── GET /api/analytics/platform — Admin-level platform analytics ─────────────

export async function getPlatformAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers30d,
      newUsers7d,
      totalPosts,
      posts7d,
      totalInteractions,
      interactions7d,
      totalRewards,
      rewards7d,
      totalWithdrawals,
      activeCampaigns,
      totalNfts,
      nftSales,
      dailySignups,
      dailyPosts,
      dailyRewards,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.socialPost.count({ where: { isActive: true } }),
      prisma.socialPost.count({ where: { isActive: true, createdAt: { gte: sevenDaysAgo } } }),
      prisma.postInteraction.count(),
      prisma.postInteraction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.rewardTransaction.aggregate({
        where: { type: { in: ["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS", "AIRDROP", "SIGNUP_BONUS"] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.rewardTransaction.aggregate({
        where: { type: { in: ["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS"] }, createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true },
      }),
      prisma.rewardTransaction.aggregate({
        where: { type: "WITHDRAWAL" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.adCampaign.count({ where: { status: "ACTIVE" } }),
      prisma.nft.count(),
      prisma.nftListing.count({ where: { status: "SOLD" } }),
      // Daily signups (last 30 days)
      prisma.user.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Daily posts (last 30 days)
      prisma.socialPost.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, isActive: true },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Daily rewards (last 30 days)
      prisma.rewardTransaction.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          type: { in: ["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS"] },
        },
        select: { createdAt: true, amount: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Aggregate daily data
    const signupChart = aggregateByDay(dailySignups.map(u => u.createdAt), 30);
    const postChart = aggregateByDay(dailyPosts.map(p => p.createdAt), 30);
    const rewardChart = aggregateAmountByDay(
      dailyRewards.map(r => ({ date: r.createdAt, amount: Number(r.amount) })),
      30
    );

    res.json({
      overview: {
        totalUsers,
        newUsers30d,
        newUsers7d,
        totalPosts,
        posts7d,
        totalInteractions,
        interactions7d,
        totalRewardsPaid: totalRewards._sum.amount?.toString() ?? "0",
        rewardTransactions: totalRewards._count,
        rewards7d: rewards7d._sum.amount?.toString() ?? "0",
        totalWithdrawn: totalWithdrawals._sum.amount?.abs().toString() ?? "0",
        withdrawalCount: totalWithdrawals._count,
        activeCampaigns,
        totalNfts,
        nftSales,
      },
      charts: {
        signups: signupChart,
        posts: postChart,
        rewards: rewardChart,
      },
    });
  } catch (err) {
    console.error("PlatformAnalytics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/analytics/me — User personal analytics ──────────────────────────

export async function getUserAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      user,
      postCount,
      posts7d,
      totalLikes,
      totalComments,
      rewardHistory,
      topPosts,
      referralCount,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          offChainBalance: true,
          totalEarned: true,
          totalWithdrawn: true,
          createdAt: true,
          _count: { select: { followers: true, following: true } },
        },
      }),
      prisma.socialPost.count({ where: { authorId: userId, isActive: true } }),
      prisma.socialPost.count({
        where: { authorId: userId, isActive: true, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.postInteraction.count({
        where: { post: { authorId: userId }, type: "LIKE" },
      }),
      prisma.postInteraction.count({
        where: { post: { authorId: userId }, type: "COMMENT" },
      }),
      prisma.rewardTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
          type: { in: ["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS"] },
        },
        select: { createdAt: true, amount: true, type: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.socialPost.findMany({
        where: { authorId: userId, isActive: true },
        orderBy: { likesCount: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          likesCount: true,
          commentsCount: true,
          sharesCount: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where: { referredById: userId } }),
    ]);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    // Aggregate reward chart by day
    const earningsChart = aggregateAmountByDay(
      rewardHistory.map(r => ({ date: r.createdAt, amount: Number(r.amount) })),
      30
    );

    // Breakdown by reward type
    const breakdown: Record<string, number> = {};
    for (const r of rewardHistory) {
      breakdown[r.type] = (breakdown[r.type] ?? 0) + Number(r.amount);
    }

    res.json({
      overview: {
        balance: user.offChainBalance.toString(),
        totalEarned: user.totalEarned.toString(),
        totalWithdrawn: user.totalWithdrawn.toString(),
        posts: postCount,
        posts7d,
        totalLikes,
        totalComments,
        followers: user._count.followers,
        following: user._count.following,
        referrals: referralCount,
        memberSince: user.createdAt,
      },
      topPosts,
      earningsChart,
      rewardBreakdown: breakdown,
    });
  } catch (err) {
    console.error("UserAnalytics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aggregateByDay(dates: Date[], days: number): { date: string; count: number }[] {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const d of dates) {
    const key = new Date(d).toISOString().slice(0, 10);
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([date, count]) => ({ date, count }));
}

function aggregateAmountByDay(items: { date: Date; amount: number }[], days: number): { date: string; amount: number }[] {
  const map: Record<string, number> = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    map[d.toISOString().slice(0, 10)] = 0;
  }
  for (const item of items) {
    const key = new Date(item.date).toISOString().slice(0, 10);
    if (key in map) map[key] += item.amount;
  }
  return Object.entries(map).map(([date, amount]) => ({ date, amount: Math.round(amount * 10000) / 10000 }));
}

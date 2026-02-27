import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

const p = prisma as any;

// ─── GET /api/music/revenue/artist — Artist revenue dashboard ────────────────

export async function getArtistRevenue(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    // Get all artist's tracks with stats
    const tracks = await p.track.findMany({
      where: { artistId: userId },
      select: {
        id: true, title: true, coverUrl: true, playCount: true, likeCount: true,
        boostCount: true, repostCount: true, totalRevenue: true, status: true,
        _count: { select: { plays: true, likes: true, comments: true } },
      },
      orderBy: { playCount: "desc" },
    });

    // Music NFT revenue
    const nfts = await p.musicNFT.findMany({
      where: { artistId: userId },
      select: {
        id: true, name: true, totalStreamingRevenue: true, totalRoyaltyPaid: true,
        totalSupply: true, availableSupply: true, pricePerFraction: true,
        _count: { select: { holders: true } },
      },
    });

    const nftSalesRevenue = nfts.reduce((sum: number, n: any) =>
      sum + (Number(n.pricePerFraction) * (n.totalSupply - n.availableSupply)), 0);

    // Boost revenue (tokens earned from others boosting your tracks)
    const boostStats = await p.musicBoost.aggregate({
      where: { track: { artistId: userId } },
      _sum: { tokensCost: true },
      _count: true,
    });

    // Repost rewards earned by artist from their own shares
    const repostRewards = await p.trackRepost.aggregate({
      where: { userId },
      _sum: { rewardEarned: true },
      _count: true,
    });

    // Total streaming plays
    const totalPlays = tracks.reduce((sum: number, t: any) => sum + t.playCount, 0);
    // Simulated streaming revenue: $0.004 per play
    const streamingRevenue = totalPlays * 0.004;

    // Royalty payouts made
    const royaltyPayouts = await p.royaltyPayout.aggregate({
      where: { musicNft: { artistId: userId } },
      _sum: { amount: true },
      _count: true,
    });

    // Distribution statuses
    const distributions = await p.distributionSubmission.findMany({
      where: { track: { artistId: userId } },
      include: { track: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      summary: {
        totalTracks: tracks.length,
        totalPlays,
        streamingRevenue: streamingRevenue.toFixed(2),
        nftSalesRevenue: nftSalesRevenue.toFixed(2),
        boostRevenue: Number(boostStats._sum.tokensCost || 0).toFixed(2),
        repostRewards: Number(repostRewards._sum.rewardEarned || 0).toFixed(2),
        totalRoyaltyPaid: Number(royaltyPayouts._sum.amount || 0).toFixed(2),
        totalRevenue: (streamingRevenue + nftSalesRevenue + Number(boostStats._sum.tokensCost || 0)).toFixed(2),
      },
      tracks,
      nfts,
      distributions,
      boostStats: { total: boostStats._count, totalSpent: boostStats._sum.tokensCost || 0 },
    });
  } catch (err) {
    console.error("getArtistRevenue error:", err);
    res.status(500).json({ error: "Failed to fetch revenue data" });
  }
}

// ─── GET /api/music/revenue/fan — Fan revenue dashboard ──────────────────────

export async function getFanRevenue(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    // NFT holdings
    const holdings = await p.musicNFTHolder.findMany({
      where: { userId },
      include: {
        musicNft: {
          select: {
            id: true, name: true, totalStreamingRevenue: true, royaltyPercent: true,
            totalSupply: true, pricePerFraction: true,
            track: { select: { id: true, title: true, coverUrl: true, playCount: true } },
            artist: { select: { id: true, username: true, displayName: true } },
          },
        },
      },
    });

    // Royalty payouts received
    const payouts = await p.royaltyPayout.findMany({
      where: { recipientId: userId },
      include: { musicNft: { select: { name: true, track: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const totalRoyalties = payouts.reduce((s: number, p: any) => s + Number(p.amount), 0);

    // Repost rewards
    const repostRewards = await p.trackRepost.aggregate({
      where: { userId },
      _sum: { rewardEarned: true },
      _count: true,
    });

    // Boost activity
    const boostActivity = await p.musicBoost.aggregate({
      where: { boosterId: userId },
      _sum: { tokensCost: true, rewardEarned: true },
      _count: true,
    });

    // Engagement score
    const engagement = await p.engagementScore.findUnique({ where: { userId } });

    res.json({
      summary: {
        totalNFTsHeld: holdings.length,
        totalFractionsOwned: holdings.reduce((s: number, h: any) => s + h.fractions, 0),
        totalRoyaltiesReceived: totalRoyalties.toFixed(2),
        repostRewards: Number(repostRewards._sum.rewardEarned || 0).toFixed(2),
        boostSpent: Number(boostActivity._sum.tokensCost || 0).toFixed(2),
        boostRewardsEarned: Number(boostActivity._sum.rewardEarned || 0).toFixed(2),
        engagementScore: engagement?.score || 0,
        stakedNFTs: holdings.filter((h: any) => h.isStaked).length,
      },
      holdings,
      recentPayouts: payouts,
    });
  } catch (err) {
    console.error("getFanRevenue error:", err);
    res.status(500).json({ error: "Failed to fetch fan revenue data" });
  }
}

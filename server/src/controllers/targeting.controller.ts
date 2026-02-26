import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";

// ─── Update User Demographics (for ad targeting) ─────────────────────────────

const updateDemographicsSchema = z.object({
  interests: z.array(z.string().max(50)).max(20).optional(),
  location: z.string().max(100).optional(),
  birthYear: z.number().int().min(1920).max(2020).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
});

export async function updateDemographics(req: Request, res: Response): Promise<void> {
  try {
    const data = updateDemographicsSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.interests !== undefined && { interests: data.interests }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.birthYear !== undefined && { birthYear: data.birthYear }),
        ...(data.gender !== undefined && { gender: data.gender }),
      },
      select: {
        id: true,
        interests: true,
        location: true,
        birthYear: true,
        gender: true,
      },
    });

    res.json({ success: true, demographics: user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("UpdateDemographics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/ads/campaigns/:id/analytics — Campaign performance ─────────────

export async function getCampaignAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const campaignId = req.params.id as string;
    const userId = req.user!.userId;

    const campaign = await prisma.adCampaign.findUnique({
      where: { id: campaignId },
      include: {
        adPackage: { select: { name: true, impressions: true, durationDays: true } },
      },
    });

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    if (campaign.merchantId !== userId) {
      // Check if admin
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMIN") {
        res.status(403).json({ error: "Not authorized" });
        return;
      }
    }

    // Get reward transactions for this campaign
    const rewards = await prisma.rewardTransaction.findMany({
      where: { relatedCampaignId: campaignId },
      select: { type: true, amount: true, createdAt: true },
    });

    const viewRewards = rewards.filter(r => r.type === "AD_VIEW");
    const engagementRewards = rewards.filter(r => r.type === "AD_ENGAGEMENT");

    // Get sponsored post stats
    const posts = await prisma.socialPost.findMany({
      where: { adCampaignId: campaignId },
      select: { likesCount: true, commentsCount: true, sharesCount: true, viewsCount: true },
    });

    const totalLikes = posts.reduce((s, p) => s + p.likesCount, 0);
    const totalComments = posts.reduce((s, p) => s + p.commentsCount, 0);
    const totalShares = posts.reduce((s, p) => s + p.sharesCount, 0);
    const totalViews = posts.reduce((s, p) => s + p.viewsCount, 0);

    // CTR = clicks / impressions
    const ctr = campaign.impressionsDelivered > 0
      ? ((campaign.clickCount / campaign.impressionsDelivered) * 100).toFixed(2)
      : "0.00";

    // Daily breakdown (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyImpressions = await prisma.rewardTransaction.groupBy({
      by: ["createdAt"],
      where: {
        relatedCampaignId: campaignId,
        type: "AD_VIEW",
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    // Aggregate by date
    const dailyMap = new Map<string, { views: number; engagements: number; spent: number }>();
    for (const r of rewards) {
      if (r.createdAt < thirtyDaysAgo) continue;
      const day = r.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(day) || { views: 0, engagements: 0, spent: 0 };
      if (r.type === "AD_VIEW") entry.views++;
      if (r.type === "AD_ENGAGEMENT") entry.engagements++;
      entry.spent += r.amount.toNumber();
      dailyMap.set(day, entry);
    }

    const dailyChart = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Audience demographics breakdown (who viewed the ads)
    const viewerIds = await prisma.rewardTransaction.findMany({
      where: { relatedCampaignId: campaignId, type: "AD_VIEW" },
      select: { userId: true },
      distinct: ["userId"],
    });

    const viewers = await prisma.user.findMany({
      where: { id: { in: viewerIds.map(v => v.userId) } },
      select: { interests: true, location: true, birthYear: true, gender: true },
    });

    // Gender breakdown
    const genderBreakdown: Record<string, number> = {};
    const locationBreakdown: Record<string, number> = {};
    const interestBreakdown: Record<string, number> = {};

    for (const v of viewers) {
      const g = v.gender || "unknown";
      genderBreakdown[g] = (genderBreakdown[g] || 0) + 1;

      const loc = v.location || "unknown";
      locationBreakdown[loc] = (locationBreakdown[loc] || 0) + 1;

      for (const interest of v.interests) {
        interestBreakdown[interest] = (interestBreakdown[interest] || 0) + 1;
      }
    }

    res.json({
      campaign: {
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        package: campaign.adPackage.name,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
      },
      delivery: {
        impressionsTotal: campaign.impressionsTotal,
        impressionsDelivered: campaign.impressionsDelivered,
        deliveryRate: campaign.impressionsTotal > 0
          ? ((campaign.impressionsDelivered / campaign.impressionsTotal) * 100).toFixed(1)
          : "0.0",
        clickCount: campaign.clickCount,
        ctr,
      },
      engagement: {
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        engagementRate: totalViews > 0
          ? (((totalLikes + totalComments + totalShares) / totalViews) * 100).toFixed(2)
          : "0.00",
      },
      rewards: {
        poolTotal: campaign.rewardPoolTotal,
        poolDistributed: campaign.rewardPoolDistributed,
        viewRewardCount: viewRewards.length,
        engagementRewardCount: engagementRewards.length,
        totalDistributed: rewards.reduce((s, r) => s + r.amount.toNumber(), 0).toFixed(4),
      },
      audience: {
        uniqueViewers: viewerIds.length,
        genderBreakdown,
        locationBreakdown,
        topInterests: Object.entries(interestBreakdown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
      },
      dailyChart,
    });
  } catch (err) {
    console.error("GetCampaignAnalytics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/ads/campaigns/:id/click — Track ad click ──────────────────────

export async function trackAdClick(req: Request, res: Response): Promise<void> {
  try {
    const campaignId = req.params.id as string;

    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { clickCount: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("TrackAdClick error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

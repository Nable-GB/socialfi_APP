import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import { getTier } from "../controllers/referral.controller.js";

// ─── Revenue Split Constants ────────────────────────────────────────────────
// When a merchant pays for an ad package, the reward pool is split as follows:
export const REWARD_SPLIT = {
  USERS: 0.6,       // 60% → distributed to users who view/engage
  PLATFORM: 0.25,   // 25% → platform treasury
  LIQUIDITY: 0.1,   // 10% → liquidity pool
  AFFILIATE: 0.05,  // 5%  → referral/affiliate payouts
} as const;

/**
 * Calculate the token reward allocations for a campaign.
 * Called when payment is confirmed (Stripe webhook or crypto verification).
 */
export function calculateRewardSplit(totalRewardPool: Prisma.Decimal) {
  const pool = totalRewardPool.toNumber();
  return {
    usersPool: new Prisma.Decimal(pool * REWARD_SPLIT.USERS),
    platformPool: new Prisma.Decimal(pool * REWARD_SPLIT.PLATFORM),
    liquidityPool: new Prisma.Decimal(pool * REWARD_SPLIT.LIQUIDITY),
    affiliatePool: new Prisma.Decimal(pool * REWARD_SPLIT.AFFILIATE),
  };
}

/**
 * Credit a user for viewing a sponsored post.
 * Also handles the 5% affiliate referral bonus.
 */
export async function creditAdViewReward(
  userId: string,
  postId: string,
  campaignId: string,
  rewardAmount: Prisma.Decimal,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Create the AD_VIEW reward transaction
    await tx.rewardTransaction.create({
      data: {
        userId,
        type: "AD_VIEW",
        amount: rewardAmount,
        description: "Reward for viewing sponsored content",
        relatedPostId: postId,
        relatedCampaignId: campaignId,
        status: "PENDING",
      },
    });

    // 2. Update user's off-chain balance
    await tx.user.update({
      where: { id: userId },
      data: {
        offChainBalance: { increment: rewardAmount },
        totalEarned: { increment: rewardAmount },
      },
    });

    // 3. Update campaign's distributed pool
    await tx.adCampaign.update({
      where: { id: campaignId },
      data: {
        rewardPoolDistributed: { increment: rewardAmount },
        impressionsDelivered: { increment: 1 },
      },
    });

    // 4. Handle affiliate referral bonus (5% of user's reward)
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });

    if (user?.referredById) {
      // Count how many users this referrer has referred (for tier calculation)
      const referrerReferralCount = await tx.user.count({ where: { referredById: user.referredById } });
      const tier = getTier(referrerReferralCount);
      const referralAmount = new Prisma.Decimal(rewardAmount.toNumber() * tier.rate);

      await tx.rewardTransaction.create({
        data: {
          userId: user.referredById,
          type: "REFERRAL_BONUS",
          amount: referralAmount,
          description: `${tier.label} affiliate bonus from referred user's ad view`,
          relatedPostId: postId,
          relatedCampaignId: campaignId,
          sourceUserId: userId,
          referralRate: new Prisma.Decimal(tier.rate),
          status: "PENDING",
        },
      });

      await tx.user.update({
        where: { id: user.referredById },
        data: {
          offChainBalance: { increment: referralAmount },
          totalEarned: { increment: referralAmount },
        },
      });
    }
  });
}

/**
 * Credit a user for engaging with a sponsored post (like, comment, share).
 * Engagement reward is typically higher than a view reward.
 */
export async function creditAdEngagementReward(
  userId: string,
  postId: string,
  campaignId: string,
  rewardAmount: Prisma.Decimal,
  engagementType: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.rewardTransaction.create({
      data: {
        userId,
        type: "AD_ENGAGEMENT",
        amount: rewardAmount,
        description: `Reward for ${engagementType.toLowerCase()} on sponsored content`,
        relatedPostId: postId,
        relatedCampaignId: campaignId,
        status: "PENDING",
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        offChainBalance: { increment: rewardAmount },
        totalEarned: { increment: rewardAmount },
      },
    });

    // Affiliate bonus for engagement too
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { referredById: true },
    });

    if (user?.referredById) {
      const referrerReferralCount = await tx.user.count({ where: { referredById: user.referredById } });
      const tier = getTier(referrerReferralCount);
      const referralAmount = new Prisma.Decimal(rewardAmount.toNumber() * tier.rate);

      await tx.rewardTransaction.create({
        data: {
          userId: user.referredById,
          type: "REFERRAL_BONUS",
          amount: referralAmount,
          description: `${tier.label} affiliate bonus from referred user's ad engagement`,
          relatedPostId: postId,
          relatedCampaignId: campaignId,
          sourceUserId: userId,
          referralRate: new Prisma.Decimal(tier.rate),
          status: "PENDING",
        },
      });

      await tx.user.update({
        where: { id: user.referredById },
        data: {
          offChainBalance: { increment: referralAmount },
          totalEarned: { increment: referralAmount },
        },
      });
    }
  });
}

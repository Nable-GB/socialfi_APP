import { Request, Response } from "express";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import { calculateRewardSplit } from "../services/reward.service.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

/**
 * POST /webhooks/stripe
 *
 * Secure webhook receiver. Uses raw body + Stripe signature for verification.
 * On `checkout.session.completed`:
 *   1. Activates the AdCampaign
 *   2. Calculates the token reward split (60% Users, 25% Platform, 10% Liquidity, 5% Affiliate)
 *   3. Sets per-view and per-engagement reward amounts on the sponsored post
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!rawBody) {
    res.status(400).json({ error: "Missing raw body for signature verification" });
    return;
  }

  let event: Stripe.Event;

  try {
    const sig = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  // ── Handle checkout.session.completed ─────────────────────────────────────

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { campaignId, adPackageId, merchantId } = session.metadata ?? {};

    if (!campaignId) {
      console.warn("Stripe webhook: missing campaignId in metadata");
      res.json({ received: true });
      return;
    }

    try {
      // Fetch the campaign with its ad package
      const campaign = await prisma.adCampaign.findUnique({
        where: { id: campaignId },
        include: { adPackage: true },
      });

      if (!campaign) {
        console.error(`Stripe webhook: campaign ${campaignId} not found`);
        res.json({ received: true });
        return;
      }

      // Calculate reward split
      const rewardPool = campaign.adPackage.totalRewardPool;
      const split = calculateRewardSplit(rewardPool);

      // Calculate per-impression reward amounts
      // Users get 60% of the pool, split across all impressions
      const totalImpressions = campaign.impressionsTotal;
      const perViewReward = new Prisma.Decimal(
        split.usersPool.toNumber() / totalImpressions * 0.7 // 70% of user pool for views
      );
      const perEngagementReward = new Prisma.Decimal(
        split.usersPool.toNumber() / totalImpressions * 0.3 // 30% of user pool for engagement
      );

      // Activate the campaign
      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setDate(endsAt.getDate() + campaign.adPackage.durationDays);

      await prisma.$transaction(async (tx) => {
        // 1. Update campaign status
        await tx.adCampaign.update({
          where: { id: campaignId },
          data: {
            paymentStatus: "COMPLETED",
            status: "ACTIVE",
            stripePaymentId: session.payment_intent as string,
            amountPaid: new Prisma.Decimal(
              (session.amount_total ?? 0) / 100 // Convert cents to dollars
            ),
            startsAt: now,
            endsAt,
          },
        });

        // 2. Create the sponsored post for this campaign
        await tx.socialPost.create({
          data: {
            authorId: campaign.merchantId,
            content: campaign.title + (campaign.description ? `\n\n${campaign.description}` : ""),
            type: "SPONSORED",
            adCampaignId: campaignId,
            rewardPerView: perViewReward,
            rewardPerEngagement: perEngagementReward,
          },
        });
      });

      console.log(
        `Campaign ${campaignId} activated. ` +
        `Pool: ${rewardPool} tokens | ` +
        `Users: ${split.usersPool} | Platform: ${split.platformPool} | ` +
        `Liquidity: ${split.liquidityPool} | Affiliate: ${split.affiliatePool} | ` +
        `Per-view: ${perViewReward} | Per-engagement: ${perEngagementReward}`
      );
    } catch (err) {
      console.error("Stripe webhook processing error:", err);
      // Don't return 500 — Stripe would retry. Log and acknowledge.
    }
  }

  // ── Handle payment_intent.payment_failed ──────────────────────────────────

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    // Find campaign by stripe payment ID and mark as failed
    const campaign = await prisma.adCampaign.findFirst({
      where: {
        OR: [
          { stripePaymentId: paymentIntent.id },
          { stripeSessionId: paymentIntent.id },
        ],
      },
    });

    if (campaign) {
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          paymentStatus: "FAILED",
          status: "CANCELLED",
        },
      });
      console.log(`Campaign ${campaign.id} payment failed`);
    }
  }

  // Always acknowledge receipt
  res.json({ received: true });
}

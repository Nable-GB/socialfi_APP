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

  const eventType = event.type;

  // ── Handle checkout.session.completed ─────────────────────────────────────

  if (eventType === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    // (A) Ad campaign checkout
    if (meta.campaignId) {
      try {
        const campaign = await prisma.adCampaign.findUnique({
          where: { id: meta.campaignId },
          include: { adPackage: true },
        });

        if (campaign) {
          const rewardPool = campaign.adPackage.totalRewardPool;
          const split = calculateRewardSplit(rewardPool);
          const totalImpressions = campaign.impressionsTotal;
          const perViewReward = new Prisma.Decimal(
            split.usersPool.toNumber() / totalImpressions * 0.7
          );
          const perEngagementReward = new Prisma.Decimal(
            split.usersPool.toNumber() / totalImpressions * 0.3
          );

          const now = new Date();
          const endsAt = new Date(now);
          endsAt.setDate(endsAt.getDate() + campaign.adPackage.durationDays);

          await prisma.$transaction(async (tx) => {
            await tx.adCampaign.update({
              where: { id: meta.campaignId! },
              data: {
                paymentStatus: "COMPLETED",
                status: "ACTIVE",
                stripePaymentId: session.payment_intent as string,
                amountPaid: new Prisma.Decimal((session.amount_total ?? 0) / 100),
                startsAt: now,
                endsAt,
              },
            });
            await tx.socialPost.create({
              data: {
                authorId: campaign.merchantId,
                content: campaign.title + (campaign.description ? `\n\n${campaign.description}` : ""),
                type: "SPONSORED",
                adCampaignId: meta.campaignId!,
                rewardPerView: perViewReward,
                rewardPerEngagement: perEngagementReward,
              },
            });
          });

          console.log(
            `Campaign ${meta.campaignId} activated. Pool: ${rewardPool} | Per-view: ${perViewReward} | Per-engagement: ${perEngagementReward}`
          );
        }
      } catch (err) {
        console.error("Campaign webhook error:", err);
      }
    }

    // (B) Service purchase checkout
    if (meta.type === "service_purchase" && meta.purchaseId) {
      try {
        await prisma.servicePurchase.update({
          where: { id: meta.purchaseId },
          data: {
            status: "COMPLETED",
            stripePaymentId: session.payment_intent as string,
            amountPaid: new Prisma.Decimal((session.amount_total ?? 0) / 100),
          },
        });

        if (meta.serviceType === "VERIFIED_BADGE" || meta.serviceType === "PREMIUM_BADGE") {
          await prisma.user.update({
            where: { id: meta.userId },
            data: { isVerified: true },
          });
        }

        console.log(`Service purchase ${meta.purchaseId} completed: ${meta.serviceType} for user ${meta.userId}`);
      } catch (err) {
        console.error("Service purchase webhook error:", err);
      }
    }
  }

  // ── Handle payment_intent.payment_failed ──────────────────────────────────

  if (eventType === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

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
        data: { paymentStatus: "FAILED", status: "CANCELLED" },
      });
      console.log(`Campaign ${campaign.id} payment failed`);
    }
  }

  // ── Handle customer.subscription.created / updated ────────────────────────

  if (eventType === "customer.subscription.created" || eventType === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;
    const tier = subscription.metadata?.tier as "PRO" | "PREMIUM" | undefined;

    if (userId && tier) {
      try {
        const status = subscription.status === "active" ? "ACTIVE"
          : subscription.status === "past_due" ? "PAST_DUE"
          : subscription.status === "incomplete" ? "INCOMPLETE"
          : "CANCELLED";

        await prisma.subscription.upsert({
          where: { stripeSubscriptionId: subscription.id },
          create: {
            userId,
            tier,
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: subscription.items.data[0]?.price?.id,
            status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
          update: {
            status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });

        if (status === "ACTIVE") {
          await prisma.user.update({
            where: { id: userId },
            data: { subscriptionTier: tier },
          });
        }

        console.log(`Subscription ${subscription.id} ${eventType}: user=${userId} tier=${tier} status=${status}`);
      } catch (err) {
        console.error("Subscription webhook error:", err);
      }
    }
  }

  // ── Handle customer.subscription.deleted ──────────────────────────────────

  if (eventType === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata?.userId;

    if (userId) {
      try {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: "CANCELLED" },
        });
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionTier: "FREE" },
        });
        console.log(`Subscription ${subscription.id} cancelled for user ${userId}`);
      } catch (err) {
        console.error("Subscription deletion webhook error:", err);
      }
    }
  }

  // Always acknowledge receipt
  res.json({ received: true });
}

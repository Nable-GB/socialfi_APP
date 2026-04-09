import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import { isDemoMode, sendDemoModeResponse } from "../lib/demo.js";
import { applyActiveSubscriptionEntitlements, getEffectiveSubscriptionTier, isCreatorAccessForced } from "../services/subscription.service.js";

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  return new Stripe(env.STRIPE_SECRET_KEY);
}

// ─── Tier Config ─────────────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS = {
  CREATOR: {
    name: "Creator",
    monthlyPriceUsd: 10,
    features: [
      "Upload music to the platform",
      "Mint virtual NFTs (non-dividend NFTs)",
      "Buy and sell NFTs with SMFI tokens",
      "3,000 upload credits per month (3 tracks)",
      "Create NFT Brochure for your tracks (promotional, sold once)",
      "Enter monthly competition to become a Top Artist",
      "Artist profile & branding tools",
    ],
  },
};

// ─── GET /api/subscriptions/tiers — List available tiers ─────────────────────

export async function getSubscriptionTiers(_req: Request, res: Response): Promise<void> {
  res.json({
    tiers: [
      {
        id: "FREE",
        name: "Listener",
        monthlyPriceUsd: 0,
        features: [
          "Listen to all music on the platform",
          "Buy and sell NFTs with SMFI tokens",
          "Like, comment, share, and vote",
          "Follow artists and build your feed",
        ],
      },
      { id: "CREATOR", ...SUBSCRIPTION_TIERS.CREATOR },
    ],
    topArtistInfo: {
      name: "Top Artist",
      how: "Win Top 10 in the monthly competition",
      privileges: [
        "Mint revenue-sharing Music NFTs for the winning track",
        "Platform publishes your track globally (Spotify, YouTube Music, etc.)",
        "Per-song privilege — applies to the winning track only",
      ],
    },
  });
}

// ─── GET /api/subscriptions/me — Current user subscription ───────────────────

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const [user, subscription, pendingReview] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      }),
      prisma.subscription.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findFirst({
        where: { userId, status: "INCOMPLETE", paymentMethod: "CRYPTO_USDT" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    res.json({
      tier: getEffectiveSubscriptionTier(user?.subscriptionTier),
      subscription: subscription ? {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      pendingReview: pendingReview ? {
        id: pendingReview.id,
        tier: pendingReview.tier,
        paymentMethod: pendingReview.paymentMethod,
        cryptoTxHash: pendingReview.cryptoTxHash,
        cryptoWalletAddress: pendingReview.cryptoWalletAddress,
        createdAt: pendingReview.createdAt,
        reviewedAt: pendingReview.reviewedAt,
        reviewNotes: pendingReview.reviewNotes,
      } : null,
    });
  } catch (err) {
    console.error("GetMySubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/subscriptions/checkout — Create Stripe Subscription Checkout ──

export async function createSubscriptionCheckout(req: Request, res: Response): Promise<void> {
  try {
    const { tier } = req.body;
    const userId = req.user!.userId;

    if (!tier || !["CREATOR"].includes(tier)) {
      res.status(400).json({ error: "Invalid tier. Must be CREATOR." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (isDemoMode()) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const subscription = await prisma.$transaction(async (tx) => {
        const existingActive = await tx.subscription.findFirst({
          where: {
            userId,
            status: "ACTIVE",
            tier: "CREATOR" as any,
          },
          orderBy: { createdAt: "desc" },
        });

        if (existingActive) {
          return existingActive;
        }

        const createdSubscription = await tx.subscription.create({
          data: {
            userId,
            tier: "CREATOR" as any,
            paymentMethod: "FIAT_STRIPE",
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

        await applyActiveSubscriptionEntitlements(tx, createdSubscription);

        return tx.subscription.findUniqueOrThrow({ where: { id: createdSubscription.id } });
      });

      sendDemoModeResponse(res, {
        success: true,
        message: "Creator plan activated in demo mode.",
        subscription: {
          id: subscription.id,
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        },
      });
      return;
    }

    if (isCreatorAccessForced()) {
      res.status(400).json({ error: "Creator access is already enabled for all users during testing." });
      return;
    }

    // Check if already subscribed
    if (user.subscriptionTier !== "FREE") {
      res.status(400).json({ error: `Already subscribed to ${user.subscriptionTier}. Cancel first to switch.` });
      return;
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
    // Find or create Stripe customer
    let stripeCustomerId: string;
    const existingSub = await prisma.subscription.findFirst({
      where: { userId },
      select: { stripeCustomerId: true },
      orderBy: { createdAt: "desc" },
    });

    if (existingSub?.stripeCustomerId) {
      stripeCustomerId = existingSub.stripeCustomerId;
    } else {
      const customer = await getStripe().customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id, username: user.username },
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe Checkout Session for subscription
    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      metadata: { userId, tier },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `SocialFi ${tierConfig.name} Plan`,
              description: tierConfig.features.join(" • "),
            },
            unit_amount: Math.round(tierConfig.monthlyPriceUsd * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/?tab=subscription&status=success`,
      cancel_url: `${env.FRONTEND_URL}/?tab=subscription&status=cancelled`,
    });

    res.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("CreateSubscriptionCheckout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/subscriptions/cancel — Cancel subscription ────────────────────

export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      res.status(404).json({ error: "No active subscription found" });
      return;
    }

    if (isDemoMode()) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });

      sendDemoModeResponse(res, {
        success: true,
        message: "Demo subscription marked to cancel at period end.",
        currentPeriodEnd: subscription.currentPeriodEnd,
      });
      return;
    }

    if (!subscription.stripeSubscriptionId) {
      res.status(404).json({ error: "No active subscription found" });
      return;
    }

    // Cancel at period end (user keeps access until billing cycle ends)
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    res.json({
      success: true,
      message: "Subscription will be cancelled at the end of the current billing period.",
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } catch (err) {
    console.error("CancelSubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/subscriptions/checkout-usdt — Activate via on-chain USDT ─────
// Admin manually verifies the tx hash and activates CREATOR tier for the user.
// Full on-chain verification is a future enhancement.

export async function createUsdtCheckout(req: Request, res: Response): Promise<void> {
  try {
    const { txHash, walletAddress } = req.body;
    const userId = req.user!.userId;

    if (!txHash || typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      res.status(400).json({ error: "Invalid transaction hash. Must be a 66-character hex string starting with 0x." });
      return;
    }

    if (walletAddress && (typeof walletAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress))) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [activeCreatorSubscription, pendingReviewSubscription] = await Promise.all([
      prisma.subscription.findFirst({
        where: {
          userId,
          status: "ACTIVE",
          tier: { in: ["CREATOR", "PRO", "PREMIUM"] as any },
        },
        select: { id: true },
      }),
      prisma.subscription.findFirst({
        where: {
          userId,
          paymentMethod: "CRYPTO_USDT",
          status: "INCOMPLETE",
        },
        select: { id: true },
      }),
    ]);

    if (user.subscriptionTier === "CREATOR" as any || activeCreatorSubscription) {
      res.status(400).json({ error: "Already subscribed as Creator." });
      return;
    }

    if (pendingReviewSubscription) {
      res.status(409).json({ error: "You already have a USDT subscription awaiting admin review." });
      return;
    }

    const normalizedWalletAddress = typeof walletAddress === "string"
      ? walletAddress.trim().toLowerCase()
      : user.walletAddress?.toLowerCase() ?? null;

    if (isDemoMode()) {
      const pendingSubscription = await prisma.subscription.create({
        data: {
          userId,
          tier: "CREATOR" as any,
          paymentMethod: "CRYPTO_USDT",
          cryptoTxHash: txHash,
          cryptoWalletAddress: normalizedWalletAddress,
          status: "INCOMPLETE",
        },
      });

      sendDemoModeResponse(res, {
        success: true,
        message: "Demo USDT submission recorded for admin review.",
        subscriptionId: pendingSubscription?.id,
        txHash,
        walletAddress: normalizedWalletAddress,
        status: "PENDING_REVIEW",
      });
      return;
    }

    if (isCreatorAccessForced()) {
      res.status(400).json({ error: "Creator access is already enabled for all users during testing." });
      return;
    }

    // Record the pending USDT payment for admin review
    const pendingSubscription = await prisma.subscription.create({
      data: {
        userId,
        tier: "CREATOR" as any,
        paymentMethod: "CRYPTO_USDT",
        cryptoTxHash: txHash,
        cryptoWalletAddress: normalizedWalletAddress,
        status: "INCOMPLETE", // Admin will change to ACTIVE after verification
      },
    });

    res.json({
      success: true,
      message: "USDT payment submitted for admin review. Your Creator subscription will be activated within 24 hours.",
      subscriptionId: pendingSubscription.id,
      txHash,
      walletAddress: normalizedWalletAddress,
      status: "PENDING_REVIEW",
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "This USDT transaction hash has already been submitted." });
      return;
    }
    console.error("CreateUsdtCheckout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

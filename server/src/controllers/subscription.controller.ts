import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// ─── Tier Config ─────────────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS = {
  PRO: {
    name: "Pro",
    monthlyPriceUsd: 9.99,
    features: [
      "Advanced analytics dashboard",
      "Priority ad placement",
      "Custom profile badge",
      "5x higher daily reward cap",
      "Ad-free browsing",
    ],
  },
  PREMIUM: {
    name: "Premium",
    monthlyPriceUsd: 29.99,
    features: [
      "Everything in Pro",
      "Verified badge",
      "10x higher daily reward cap",
      "Early access to features",
      "Direct merchant messaging",
      "Priority support",
      "Custom NFT minting",
    ],
  },
};

// ─── GET /api/subscriptions/tiers — List available tiers ─────────────────────

export async function getSubscriptionTiers(_req: Request, res: Response): Promise<void> {
  res.json({
    tiers: [
      { id: "FREE", name: "Free", monthlyPriceUsd: 0, features: ["Basic feed access", "Earn rewards from ads", "Standard analytics"] },
      { id: "PRO", ...SUBSCRIPTION_TIERS.PRO },
      { id: "PREMIUM", ...SUBSCRIPTION_TIERS.PREMIUM },
    ],
  });
}

// ─── GET /api/subscriptions/me — Current user subscription ───────────────────

export async function getMySubscription(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    const subscription = await prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      tier: user?.subscriptionTier || "FREE",
      subscription: subscription ? {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
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

    if (!tier || !["PRO", "PREMIUM"].includes(tier)) {
      res.status(400).json({ error: "Invalid tier. Must be PRO or PREMIUM." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
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
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id, username: user.username },
      });
      stripeCustomerId = customer.id;
    }

    // Create Stripe Checkout Session for subscription
    const session = await stripe.checkout.sessions.create({
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

    if (!subscription || !subscription.stripeSubscriptionId) {
      res.status(404).json({ error: "No active subscription found" });
      return;
    }

    // Cancel at period end (user keeps access until billing cycle ends)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
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

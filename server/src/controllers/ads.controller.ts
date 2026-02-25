import { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// ─── Validation ─────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  adPackageId: z.string().min(1),
  campaignTitle: z.string().min(1).max(200),
  campaignDescription: z.string().max(2000).optional(),
  targetUrl: z.string().url().optional(),
});

const createCampaignSchema = z.object({
  adPackageId: z.string().min(1),
  campaignTitle: z.string().min(1).max(200),
  campaignDescription: z.string().max(2000).optional(),
  targetUrl: z.string().url().optional(),
  content: z.string().min(1).max(5000).optional(),
});

// ─── GET /api/ads/packages — List available ad packages ────────────────────

export async function getAdPackages(req: Request, res: Response): Promise<void> {
  try {
    const packages = await prisma.adPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    res.json({ packages });
  } catch (err) {
    console.error("GetAdPackages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/ads/checkout — Create Stripe Checkout for ad purchase ───────

export async function createCheckout(req: Request, res: Response): Promise<void> {
  try {
    const data = checkoutSchema.parse(req.body);
    const merchantId = req.user!.userId;

    // Verify merchant role
    const merchant = await prisma.user.findUnique({ where: { id: merchantId } });
    if (!merchant || merchant.role !== "MERCHANT") {
      res.status(403).json({ error: "Only merchants can purchase ad packages" });
      return;
    }

    // Fetch the ad package
    const adPackage = await prisma.adPackage.findUnique({
      where: { id: data.adPackageId },
    });
    if (!adPackage || !adPackage.isActive) {
      res.status(404).json({ error: "Ad package not found" });
      return;
    }

    // Create a DRAFT campaign
    const campaign = await prisma.adCampaign.create({
      data: {
        merchantId,
        adPackageId: adPackage.id,
        title: data.campaignTitle,
        description: data.campaignDescription,
        targetUrl: data.targetUrl,
        paymentMethod: "FIAT_STRIPE",
        paymentStatus: "PENDING",
        impressionsTotal: adPackage.impressions,
        rewardPoolTotal: adPackage.totalRewardPool,
        status: "PENDING_PAYMENT",
      },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: merchant.email ?? undefined,
      metadata: {
        campaignId: campaign.id,
        adPackageId: adPackage.id,
        merchantId: merchant.id,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Ad Package: ${adPackage.name}`,
              description: `${adPackage.impressions.toLocaleString()} impressions, ${adPackage.durationDays} days`,
            },
            unit_amount: Math.round(adPackage.priceFiat.toNumber() * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/merchant/campaigns/${campaign.id}?status=success`,
      cancel_url: `${env.FRONTEND_URL}/merchant/campaigns/${campaign.id}?status=cancelled`,
    });

    // Store Stripe session ID on the campaign
    await prisma.adCampaign.update({
      where: { id: campaign.id },
      data: { stripeSessionId: session.id },
    });

    res.json({
      checkoutUrl: session.url,
      campaignId: campaign.id,
      sessionId: session.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("CreateCheckout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/ads/campaigns — Create campaign directly (no Stripe) ────────

export async function createCampaign(req: Request, res: Response): Promise<void> {
  try {
    const data = createCampaignSchema.parse(req.body);
    const userId = req.user!.userId;

    // Fetch the ad package
    const adPackage = await prisma.adPackage.findUnique({
      where: { id: data.adPackageId },
    });
    if (!adPackage || !adPackage.isActive) {
      res.status(404).json({ error: "Ad package not found" });
      return;
    }

    // Create campaign (ACTIVE immediately for demo)
    const campaign = await prisma.adCampaign.create({
      data: {
        merchantId: userId,
        adPackageId: adPackage.id,
        title: data.campaignTitle,
        description: data.campaignDescription,
        targetUrl: data.targetUrl,
        paymentMethod: "CRYPTO_USDT",
        paymentStatus: "COMPLETED",
        amountPaid: adPackage.priceFiat,
        impressionsTotal: adPackage.impressions,
        rewardPoolTotal: adPackage.totalRewardPool,
        status: "ACTIVE",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + adPackage.durationDays * 24 * 60 * 60 * 1000),
      },
      include: {
        adPackage: { select: { name: true, impressions: true, durationDays: true } },
      },
    });

    // Optionally create a sponsored post
    if (data.content) {
      await prisma.socialPost.create({
        data: {
          authorId: userId,
          content: data.content,
          type: "SPONSORED",
          adCampaignId: campaign.id,
          rewardPerView: adPackage.totalRewardPool.div(adPackage.impressions > 0 ? adPackage.impressions : 1),
          rewardPerEngagement: adPackage.totalRewardPool.div(adPackage.impressions > 0 ? adPackage.impressions / 5 : 1),
        },
      });
    }

    res.json({
      success: true,
      campaign,
      message: `Campaign "${campaign.title}" created successfully!`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("CreateCampaign error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/ads/campaigns — List user's own campaigns ─────────────────────

export async function getMyCampaigns(req: Request, res: Response): Promise<void> {
  try {
    const merchantId = req.user!.userId;

    const campaigns = await prisma.adCampaign.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
      include: {
        adPackage: { select: { name: true, impressions: true, durationDays: true } },
        _count: { select: { posts: true } },
      },
    });

    res.json({ campaigns });
  } catch (err) {
    console.error("GetMyCampaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

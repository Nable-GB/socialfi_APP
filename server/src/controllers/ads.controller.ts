import { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// ─── Validation ─────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  adPackageId: z.string().uuid(),
  campaignTitle: z.string().min(1).max(200),
  campaignDescription: z.string().max(2000).optional(),
  targetUrl: z.string().url().optional(),
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

// ─── GET /api/ads/campaigns — List merchant's own campaigns ────────────────

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

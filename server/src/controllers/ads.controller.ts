import { Request, Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import { sanitizeText } from "../middleware/sanitize.js";

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  return new Stripe(env.STRIPE_SECRET_KEY);
}

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
  targetInterests: z.array(z.string().max(50)).max(20).optional(),
  targetLocation: z.string().max(100).optional(),
  targetGender: z.enum(["male", "female", "other"]).optional(),
  targetAgeMin: z.number().int().min(13).max(100).optional(),
  targetAgeMax: z.number().int().min(13).max(100).optional(),
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
    const session = await getStripe().checkout.sessions.create({
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

    const merchant = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, offChainBalance: true },
    });
    if (!merchant) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (merchant.role !== "MERCHANT") {
      res.status(403).json({ error: "Only merchants can create ad campaigns" });
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

    if (merchant.offChainBalance.lessThan(adPackage.priceCrypto)) {
      res.status(400).json({
        error: `Insufficient balance. Need ${adPackage.priceCrypto} SFT, have ${merchant.offChainBalance} SFT`,
      });
      return;
    }

    const pool = adPackage.totalRewardPool.toNumber();
    const impr = adPackage.impressions > 0 ? adPackage.impressions : 1;
    const perView = pool / impr;
    const perEngagement = pool / (impr / 5);
    const rawContent = data.content || `🔥 SPONSORED | ${data.campaignTitle}\n\n${data.campaignDescription || "Check out this campaign!"}\n\n${data.targetUrl ? `👉 ${data.targetUrl}` : ""}`;
    const postContent = sanitizeText(rawContent);

    const campaign = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { offChainBalance: { decrement: adPackage.priceCrypto } },
      });

      const createdCampaign = await tx.adCampaign.create({
        data: {
          merchantId: userId,
          adPackageId: adPackage.id,
          title: sanitizeText(data.campaignTitle),
          description: data.campaignDescription ? sanitizeText(data.campaignDescription) : undefined,
          targetUrl: data.targetUrl,
          paymentMethod: "CRYPTO_USDT",
          paymentStatus: "COMPLETED",
          amountPaid: adPackage.priceCrypto,
          impressionsTotal: adPackage.impressions,
          rewardPoolTotal: adPackage.totalRewardPool,
          targetInterests: data.targetInterests ?? [],
          targetLocation: data.targetLocation,
          targetGender: data.targetGender,
          targetAgeMin: data.targetAgeMin,
          targetAgeMax: data.targetAgeMax,
          status: "ACTIVE",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + adPackage.durationDays * 24 * 60 * 60 * 1000),
        },
        include: {
          adPackage: { select: { name: true, impressions: true, durationDays: true } },
        },
      });

      await tx.socialPost.create({
        data: {
          authorId: userId,
          content: postContent,
          type: "SPONSORED",
          adCampaignId: createdCampaign.id,
          rewardPerView: perView,
          rewardPerEngagement: perEngagement,
        },
      });

      return createdCampaign;
    });

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

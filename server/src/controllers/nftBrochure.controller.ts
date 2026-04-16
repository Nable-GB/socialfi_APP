import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { hasCreatorTier } from "../services/subscription.service.js";

// ─── POST /api/brochures — Create NFT Brochure (CREATOR tier, 1 per track) ───

export async function createBrochure(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { trackId, name, description, coverUrl, isFractionalized, maxSupply, pricePerFraction } = req.body;

    if (!trackId || !name || pricePerFraction === undefined) {
      res.status(400).json({ error: "trackId, name, and pricePerFraction are required" });
      return;
    }

    const parsedPricePerFraction = Number(pricePerFraction);
    const parsedMaxSupply = Number(maxSupply);
    const fractionalized = Boolean(isFractionalized);
    const normalizedMaxSupply = fractionalized
      ? (Number.isFinite(parsedMaxSupply) ? Math.min(Math.max(Math.floor(parsedMaxSupply), 1), 10000) : 100)
      : 1;

    if (!Number.isFinite(parsedPricePerFraction) || parsedPricePerFraction < 0.01) {
      res.status(400).json({ error: "pricePerFraction must be a positive number" });
      return;
    }

    const totalPrice = parsedPricePerFraction * normalizedMaxSupply;

    // Validate track ownership
    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }
    if (track.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }

    // Check CREATOR tier
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
    if (!user || !hasCreatorTier(user.subscriptionTier)) {
      res.status(403).json({ error: "Creator subscription required to create NFT Brochures" });
      return;
    }

    // One brochure per track (enforced by @@unique on trackId in schema)
    const existing = await (prisma as any).nFTBrochure.findUnique({ where: { trackId } });
    if (existing) {
      res.status(409).json({ error: "A brochure already exists for this track" });
      return;
    }

    const brochure = await (prisma as any).nFTBrochure.create({
      data: {
        trackId,
        artistId: userId,
        name,
        description,
        coverUrl: coverUrl || track.coverUrl,
        isFractionalized: fractionalized,
        maxSupply: normalizedMaxSupply,
        pricePerFraction: parsedPricePerFraction,
        totalPrice,
      },
      include: {
        track: { select: { id: true, title: true, genre: true } },
        artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ success: true, brochure });
  } catch (err) {
    console.error("createBrochure error:", err);
    res.status(500).json({ error: "Failed to create NFT Brochure" });
  }
}

// ─── GET /api/brochures — Browse available brochures ─────────────────────────

export async function getBrochures(req: Request, res: Response): Promise<void> {
  try {
    const page  = Math.max(parseInt(String(req.query.page || "1")), 1);
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);

    const [brochures, total] = await Promise.all([
      (prisma as any).nFTBrochure.findMany({
        where: { isSold: false },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          track: { select: { id: true, title: true, genre: true, playCount: true } },
          artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      (prisma as any).nFTBrochure.count({ where: { isSold: false } }),
    ]);

    res.json({ brochures, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("getBrochures error:", err);
    res.status(500).json({ error: "Failed to fetch brochures" });
  }
}

// ─── GET /api/brochures/mine — Brochures owned or created by user ─────────────

export async function getMyBrochures(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const [created, owned] = await Promise.all([
      (prisma as any).nFTBrochure.findMany({
        where: { artistId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          track: { select: { id: true, title: true, genre: true } },
          buyer: { select: { id: true, username: true, displayName: true } },
        },
      }),
      (prisma as any).nFTBrochure.findMany({
        where: { buyerId: userId },
        orderBy: { soldAt: "desc" },
        include: {
          track: { select: { id: true, title: true, genre: true } },
          artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
    ]);

    res.json({ created, owned });
  } catch (err) {
    console.error("getMyBrochures error:", err);
    res.status(500).json({ error: "Failed to fetch brochures" });
  }
}

// ─── POST /api/brochures/:id/buy — Purchase a brochure (one-time sale) ───────

export async function buyBrochure(req: Request, res: Response): Promise<void> {
  try {
    const userId    = req.user!.userId;
    const brochureId = req.params.id;

    const brochure = await (prisma as any).nFTBrochure.findUnique({ where: { id: brochureId } });
    if (!brochure) { res.status(404).json({ error: "Brochure not found" }); return; }
    if (brochure.isSold) { res.status(400).json({ error: "This brochure has already been sold" }); return; }
    if (brochure.artistId === userId) { res.status(400).json({ error: "Cannot buy your own brochure" }); return; }

    // Check buyer balance
    const buyer = await prisma.user.findUnique({ where: { id: userId }, select: { offChainBalance: true } });
    if (!buyer) { res.status(404).json({ error: "User not found" }); return; }

    const price = Number(brochure.totalPrice);
    if (Number(buyer.offChainBalance) < price) {
      res.status(400).json({ error: `Insufficient balance. Need ${price} SMFI, have ${buyer.offChainBalance} SMFI` });
      return;
    }

    // Atomic: debit buyer, credit artist, mark sold
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { offChainBalance: { decrement: price } } }),
      prisma.user.update({ where: { id: brochure.artistId }, data: { offChainBalance: { increment: price }, totalEarned: { increment: price } } }),
      (prisma as any).nFTBrochure.update({
        where: { id: brochureId },
        data: { isSold: true, buyerId: userId, soldAt: new Date() },
      }),
    ]);

    res.json({
      success: true,
      message: `You purchased the NFT Brochure for "${brochure.name}"!`,
      brochureId,
      pricePaid: price,
    });
  } catch (err) {
    console.error("buyBrochure error:", err);
    res.status(500).json({ error: "Failed to purchase brochure" });
  }
}

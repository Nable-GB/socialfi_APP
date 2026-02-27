import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// ─── POST /api/music/nfts — Mint a Music NFT from a track ───────────────────

export async function mintMusicNFT(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { trackId, name, description, coverUrl, totalSupply, pricePerFraction, royaltyPercent } = req.body;

    if (!trackId || !name) {
      res.status(400).json({ error: "trackId and name are required" });
      return;
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }
    if (track.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }
    if (track.status !== "PUBLISHED" && track.status !== "RELEASE_CANDIDATE") {
      res.status(400).json({ error: "Track must be published or release candidate" });
      return;
    }

    // Check if already minted
    const existing = await (prisma as any).musicNFT.findFirst({ where: { trackId } });
    if (existing) {
      res.status(409).json({ error: "NFT already exists for this track" });
      return;
    }

    const supply = Math.min(Math.max(totalSupply || 100, 1), 10000);
    const nft = await (prisma as any).musicNFT.create({
      data: {
        trackId,
        artistId: userId,
        name,
        description,
        coverUrl: coverUrl || track.coverUrl,
        totalSupply: supply,
        availableSupply: supply,
        pricePerFraction: pricePerFraction || 0,
        royaltyPercent: Math.min(royaltyPercent || 10, 50),
        isMinted: true,
      },
    });

    res.status(201).json({ success: true, nft });
  } catch (err) {
    console.error("mintMusicNFT error:", err);
    res.status(500).json({ error: "Failed to mint Music NFT" });
  }
}

// ─── GET /api/music/nfts — List music NFTs ───────────────────────────────────

export async function getMusicNFTs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(parseInt(String(req.query.page || "1")), 1);
    const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);

    const [nfts, total] = await Promise.all([
      (prisma as any).musicNFT.findMany({
        where: { isListed: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          track: { select: { id: true, title: true, coverUrl: true, audioUrl: true, playCount: true, genre: true } },
          artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          _count: { select: { holders: true } },
        },
      }),
      (prisma as any).musicNFT.count({ where: { isListed: true } }),
    ]);

    res.json({ nfts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("getMusicNFTs error:", err);
    res.status(500).json({ error: "Failed to fetch Music NFTs" });
  }
}

// ─── GET /api/music/nfts/:id — Single NFT detail ────────────────────────────

export async function getMusicNFT(req: Request, res: Response): Promise<void> {
  try {
    const nft = await (prisma as any).musicNFT.findUnique({
      where: { id: String(req.params.id) },
      include: {
        track: { select: { id: true, title: true, coverUrl: true, audioUrl: true, playCount: true, likeCount: true, genre: true, duration: true } },
        artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        holders: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          orderBy: { fractions: "desc" },
          take: 50,
        },
        _count: { select: { holders: true } },
      },
    });
    if (!nft) { res.status(404).json({ error: "Music NFT not found" }); return; }

    res.json(nft);
  } catch (err) {
    console.error("getMusicNFT error:", err);
    res.status(500).json({ error: "Failed to fetch Music NFT" });
  }
}

// ─── POST /api/music/nfts/:id/buy — Buy fractions of a Music NFT ────────────

export async function buyMusicNFT(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const nftId = String(req.params.id);
    const { fractions = 1 } = req.body;
    const qty = Math.max(Math.floor(fractions), 1);

    const nft = await (prisma as any).musicNFT.findUnique({ where: { id: nftId } });
    if (!nft) { res.status(404).json({ error: "NFT not found" }); return; }
    if (!nft.isListed) { res.status(400).json({ error: "NFT not listed for sale" }); return; }
    if (nft.availableSupply < qty) {
      res.status(400).json({ error: `Only ${nft.availableSupply} fractions available` });
      return;
    }

    const totalCost = Number(nft.pricePerFraction) * qty;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { offChainBalance: true } });
    if (!user || Number(user.offChainBalance) < totalCost) {
      res.status(400).json({ error: `Insufficient balance. Need ${totalCost} tokens.` });
      return;
    }

    // Existing holding?
    const existingHolding = await (prisma as any).musicNFTHolder.findUnique({
      where: { musicNftId_userId: { musicNftId: nftId, userId } },
    });

    const txOps: any[] = [
      // Deduct buyer balance
      prisma.user.update({ where: { id: userId }, data: { offChainBalance: { decrement: totalCost } } }),
      // Credit artist
      prisma.user.update({ where: { id: nft.artistId }, data: { offChainBalance: { increment: totalCost }, totalEarned: { increment: totalCost } } }),
      // Decrease supply
      (prisma as any).musicNFT.update({ where: { id: nftId }, data: { availableSupply: { decrement: qty } } }),
    ];

    if (existingHolding) {
      txOps.push(
        (prisma as any).musicNFTHolder.update({
          where: { id: existingHolding.id },
          data: { fractions: { increment: qty }, purchasePrice: { increment: totalCost } },
        })
      );
    } else {
      txOps.push(
        (prisma as any).musicNFTHolder.create({
          data: { musicNftId: nftId, userId, fractions: qty, purchasePrice: totalCost },
        })
      );
    }

    await prisma.$transaction(txOps);

    res.json({ success: true, fractionsBought: qty, totalCost, message: `Bought ${qty} fraction(s)!` });
  } catch (err) {
    console.error("buyMusicNFT error:", err);
    res.status(500).json({ error: "Failed to buy Music NFT" });
  }
}

// ─── POST /api/music/nfts/:id/stake — Toggle staking ────────────────────────

export async function toggleStake(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const nftId = String(req.params.id);

    const holding = await (prisma as any).musicNFTHolder.findUnique({
      where: { musicNftId_userId: { musicNftId: nftId, userId } },
    });
    if (!holding) { res.status(404).json({ error: "You don't own this NFT" }); return; }

    const newStaked = !holding.isStaked;
    await (prisma as any).musicNFTHolder.update({
      where: { id: holding.id },
      data: { isStaked: newStaked, stakedAt: newStaked ? new Date() : null },
    });

    res.json({ success: true, isStaked: newStaked });
  } catch (err) {
    console.error("toggleStake error:", err);
    res.status(500).json({ error: "Failed to toggle stake" });
  }
}

// ─── GET /api/music/my-nfts — User's held music NFTs ────────────────────────

export async function getMyMusicNFTs(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const holdings = await (prisma as any).musicNFTHolder.findMany({
      where: { userId },
      include: {
        musicNft: {
          include: {
            track: { select: { id: true, title: true, coverUrl: true, audioUrl: true, genre: true } },
            artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { purchasedAt: "desc" },
    });

    res.json({ holdings });
  } catch (err) {
    console.error("getMyMusicNFTs error:", err);
    res.status(500).json({ error: "Failed to fetch holdings" });
  }
}

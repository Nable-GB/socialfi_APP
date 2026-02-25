import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { createNotification } from "../services/notification.service.js";

// ─── Validation schemas ───────────────────────────────────────────────────────

const mintSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url(),
  collection: z.string().max(100).optional(),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional(),
  attributes: z.array(z.object({ trait_type: z.string(), value: z.string() })).optional(),
});

const listSchema = z.object({
  price: z.coerce.number().positive(),
});

const marketQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]).optional(),
  collection: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rarity"]).default("newest"),
});

const myNftsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// ─── POST /api/nfts/mint ─────────────────────────────────────────────────────

export async function mintNft(req: Request, res: Response): Promise<void> {
  try {
    const data = mintSchema.parse(req.body);
    const userId = req.user!.userId;

    const nft = await prisma.nft.create({
      data: {
        ownerId: userId,
        minterId: userId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        collection: data.collection ?? "SocialFi Genesis",
        rarity: data.rarity ?? "COMMON",
        attributes: data.attributes ?? [],
      },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ nft });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("MintNft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/nfts/:id/list ─────────────────────────────────────────────────

export async function listNftForSale(req: Request, res: Response): Promise<void> {
  try {
    const nftId = req.params.id as string;
    const data = listSchema.parse(req.body);
    const userId = req.user!.userId;

    const nft = await prisma.nft.findUnique({ where: { id: nftId } });
    if (!nft) { res.status(404).json({ error: "NFT not found" }); return; }
    if (nft.ownerId !== userId) { res.status(403).json({ error: "You do not own this NFT" }); return; }

    // Cancel any existing active listing first
    await prisma.nftListing.updateMany({
      where: { nftId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });

    const listing = await prisma.nftListing.create({
      data: {
        nftId,
        sellerId: userId,
        price: new Prisma.Decimal(data.price),
        status: "ACTIVE",
      },
      include: {
        nft: true,
        seller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ listing });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("ListNft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── DELETE /api/nfts/listings/:id — Cancel listing ─────────────────────────

export async function cancelListing(req: Request, res: Response): Promise<void> {
  try {
    const listingId = req.params.id as string;
    const userId = req.user!.userId;

    const listing = await prisma.nftListing.findUnique({ where: { id: listingId } });
    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
    if (listing.sellerId !== userId) { res.status(403).json({ error: "Not your listing" }); return; }
    if (listing.status !== "ACTIVE") { res.status(400).json({ error: "Listing is not active" }); return; }

    await prisma.nftListing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });
    res.json({ success: true });
  } catch (err) {
    console.error("CancelListing error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/nfts/listings/:id/buy ─────────────────────────────────────────

export async function buyNft(req: Request, res: Response): Promise<void> {
  try {
    const listingId = req.params.id as string;
    const buyerId = req.user!.userId;

    const listing = await prisma.nftListing.findUnique({
      where: { id: listingId },
      include: { nft: true, seller: { select: { id: true, username: true } } },
    });

    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
    if (listing.status !== "ACTIVE") { res.status(400).json({ error: "Listing is not active" }); return; }
    if (listing.sellerId === buyerId) { res.status(400).json({ error: "Cannot buy your own NFT" }); return; }

    // Check buyer balance
    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { offChainBalance: true, username: true },
    });
    if (!buyer) { res.status(404).json({ error: "Buyer not found" }); return; }

    if (buyer.offChainBalance.lessThan(listing.price)) {
      res.status(400).json({ error: `Insufficient balance. Need ${listing.price} SFT, have ${buyer.offChainBalance} SFT` });
      return;
    }

    // Atomic: debit buyer, credit seller, transfer ownership, mark sold
    await prisma.$transaction([
      // Debit buyer
      prisma.user.update({
        where: { id: buyerId },
        data: { offChainBalance: { decrement: listing.price } },
      }),
      // Credit seller
      prisma.user.update({
        where: { id: listing.sellerId },
        data: {
          offChainBalance: { increment: listing.price },
          totalEarned: { increment: listing.price },
        },
      }),
      // Transfer NFT ownership
      prisma.nft.update({
        where: { id: listing.nftId },
        data: { ownerId: buyerId },
      }),
      // Mark listing sold
      prisma.nftListing.update({
        where: { id: listingId },
        data: { status: "SOLD", buyerId, soldAt: new Date() },
      }),
    ]);

    // Notify seller
    createNotification({
      userId: listing.sellerId,
      type: "REWARD_EARNED",
      title: "NFT Sold! 🎉",
      message: `@${buyer.username} bought your "${listing.nft.name}" for ${listing.price} SFT`,
    }).catch(() => {});

    res.json({
      success: true,
      nftId: listing.nftId,
      price: listing.price.toString(),
      message: `You bought "${listing.nft.name}" for ${listing.price} SFT!`,
    });
  } catch (err) {
    console.error("BuyNft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/nfts/market — Browse marketplace listings ──────────────────────

export async function getMarketListings(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit, rarity, collection, minPrice, maxPrice, sort } = marketQuerySchema.parse(req.query);

    const cursorDate = cursor
      ? (await prisma.nftListing.findUnique({ where: { id: cursor } }))?.listedAt
      : undefined;

    const orderBy: Prisma.NftListingOrderByWithRelationInput =
      sort === "price_asc"  ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      sort === "rarity"     ? { nft: { rarity: "desc" } } :
      { listedAt: "desc" };

    const listings = await prisma.nftListing.findMany({
      where: {
        status: "ACTIVE",
        ...(rarity ? { nft: { rarity } } : {}),
        ...(collection ? { nft: { collection: { contains: collection, mode: "insensitive" } } } : {}),
        ...(minPrice !== undefined ? { price: { gte: new Prisma.Decimal(minPrice) } } : {}),
        ...(maxPrice !== undefined ? { price: { lte: new Prisma.Decimal(maxPrice) } } : {}),
        ...(cursorDate ? { listedAt: { lt: cursorDate } } : {}),
      },
      orderBy,
      take: limit,
      include: {
        nft: {
          include: {
            owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
        seller: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    const nextCursor = listings.length === limit ? listings[listings.length - 1]?.id : null;
    res.json({ listings, nextCursor, hasMore: listings.length === limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    console.error("GetMarket error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/nfts/my — Current user's NFT collection ────────────────────────

export async function getMyNfts(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit } = myNftsQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const cursorDate = cursor
      ? (await prisma.nft.findUnique({ where: { id: cursor } }))?.createdAt
      : undefined;

    const nfts = await prisma.nft.findMany({
      where: {
        ownerId: userId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        listings: {
          where: { status: "ACTIVE" },
          orderBy: { listedAt: "desc" },
          take: 1,
        },
      },
    });

    const nextCursor = nfts.length === limit ? nfts[nfts.length - 1]?.id : null;
    res.json({ nfts, nextCursor, hasMore: nfts.length === limit });
  } catch (err) {
    console.error("GetMyNfts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/nfts/:id — Single NFT detail ───────────────────────────────────

export async function getNft(req: Request, res: Response): Promise<void> {
  try {
    const nftId = req.params.id as string;

    const nft = await prisma.nft.findUnique({
      where: { id: nftId },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        minter: { select: { id: true, username: true, displayName: true } },
        listings: {
          orderBy: { listedAt: "desc" },
          take: 5,
          include: {
            seller: { select: { id: true, username: true } },
            buyer: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!nft) { res.status(404).json({ error: "NFT not found" }); return; }
    res.json({ nft });
  } catch (err) {
    console.error("GetNft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/nfts/users/:id — Public collection of a user ───────────────────

export async function getUserNfts(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id as string;
    const { limit } = myNftsQuerySchema.parse(req.query);

    const nfts = await prisma.nft.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        listings: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
    });

    res.json({ nfts });
  } catch (err) {
    console.error("GetUserNfts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

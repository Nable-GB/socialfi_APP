import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

const p = prisma as any;

// ─── POST /api/music/tracks/:id/distribute — Submit for global distribution ─

export async function submitDistribution(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);
    const { platform } = req.body; // YOUTUBE_MUSIC, SPOTIFY, APPLE_MUSIC, etc.

    if (!platform) { res.status(400).json({ error: "platform is required" }); return; }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }
    if (track.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }
    if (track.status !== "PUBLISHED" && track.status !== "RELEASE_CANDIDATE") {
      res.status(400).json({ error: "Track must be published or release candidate" });
      return;
    }

    // Check existing submission for this platform
    const existing = await p.distributionSubmission.findUnique({
      where: { trackId_platform: { trackId, platform } },
    });
    if (existing) {
      res.status(409).json({ error: `Already submitted to ${platform}`, submission: existing });
      return;
    }

    const submission = await p.distributionSubmission.create({
      data: {
        trackId,
        platform,
        submittedById: userId,
        status: "PENDING",
      },
    });

    // Mark track as RELEASE_CANDIDATE if not already
    if (track.status === "PUBLISHED") {
      await p.track.update({ where: { id: trackId }, data: { status: "RELEASE_CANDIDATE" } });
    }

    res.status(201).json({ success: true, submission, message: `Submitted to ${platform}` });
  } catch (err) {
    console.error("submitDistribution error:", err);
    res.status(500).json({ error: "Failed to submit distribution" });
  }
}

// ─── GET /api/music/tracks/:id/distributions — Get all distribution statuses ─

export async function getDistributions(req: Request, res: Response): Promise<void> {
  try {
    const trackId = String(req.params.id);
    const submissions = await p.distributionSubmission.findMany({
      where: { trackId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ submissions });
  } catch (err) {
    console.error("getDistributions error:", err);
    res.status(500).json({ error: "Failed to fetch distributions" });
  }
}

// ─── POST /api/music/tracks/:id/vote — Fan voting for release ───────────────

export async function voteForRelease(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);
    const { voteType = "RELEASE" } = req.body; // RELEASE or SKIP

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }

    // Check existing vote
    const existing = await p.releaseVote.findUnique({
      where: { trackId_voterId: { trackId, voterId: userId } },
    });
    if (existing) {
      // Update vote
      await p.releaseVote.update({ where: { id: existing.id }, data: { voteType } });
      res.json({ success: true, message: "Vote updated" });
      return;
    }

    // Higher weight for NFT holders
    let weight = 1;
    const nftHolding = await p.musicNFTHolder.findFirst({
      where: { userId, musicNft: { trackId } },
    });
    if (nftHolding) {
      weight = nftHolding.isStaked ? 3 : 2;
    }

    await p.releaseVote.create({
      data: { trackId, voterId: userId, voteType, weight },
    });

    res.status(201).json({ success: true, weight, message: `Voted to ${voteType.toLowerCase()}` });
  } catch (err) {
    console.error("voteForRelease error:", err);
    res.status(500).json({ error: "Failed to vote" });
  }
}

// ─── GET /api/music/tracks/:id/votes — Get vote tally ───────────────────────

export async function getVotes(req: Request, res: Response): Promise<void> {
  try {
    const trackId = String(req.params.id);

    const votes = await p.releaseVote.findMany({ where: { trackId } });
    const releaseWeight = votes.filter((v: any) => v.voteType === "RELEASE").reduce((s: number, v: any) => s + v.weight, 0);
    const skipWeight = votes.filter((v: any) => v.voteType === "SKIP").reduce((s: number, v: any) => s + v.weight, 0);

    let userVote = null;
    if (req.user?.userId) {
      userVote = await p.releaseVote.findUnique({
        where: { trackId_voterId: { trackId, voterId: req.user.userId } },
      });
    }

    res.json({
      totalVoters: votes.length,
      releaseWeight,
      skipWeight,
      releasePercent: (releaseWeight + skipWeight) > 0 ? Math.round((releaseWeight / (releaseWeight + skipWeight)) * 100) : 0,
      userVote: userVote?.voteType || null,
    });
  } catch (err) {
    console.error("getVotes error:", err);
    res.status(500).json({ error: "Failed to get votes" });
  }
}

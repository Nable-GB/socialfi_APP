import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// ─── Scoring weights ──────────────────────────────────────────────────────────
const VOTE_WEIGHT   = 0.40;
const LISTEN_WEIGHT = 0.35;
const LIKE_WEIGHT   = 0.25;

// ─── Helper: get or create the current month's competition ───────────────────

async function getOrCreateCurrentCompetition() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1–12

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day of month

  return prisma.monthlyCompetition.upsert({
    where: { year_month: { year, month } },
    create: { year, month, startDate, endDate, status: "OPEN" },
    update: {},
  });
}

// ─── GET /api/competitions/current ───────────────────────────────────────────

export async function getCurrentCompetition(req: Request, res: Response): Promise<void> {
  try {
    const competition = await getOrCreateCurrentCompetition();

    const entries = await prisma.competitionEntry.findMany({
      where: { competitionId: competition.id },
      orderBy: { totalScore: "desc" },
      take: 50,
      include: {
        track: {
          select: {
            id: true, title: true, coverUrl: true, audioUrl: true,
            genre: true, playCount: true, likeCount: true,
            artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.json({
      competition,
      entries,
      scoring: { voteWeight: VOTE_WEIGHT, listenWeight: LISTEN_WEIGHT, likeWeight: LIKE_WEIGHT },
    });
  } catch (err) {
    console.error("getCurrentCompetition error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/competitions/past ───────────────────────────────────────────────

export async function getPastCompetitions(_req: Request, res: Response): Promise<void> {
  try {
    const competitions = await prisma.monthlyCompetition.findMany({
      where: { status: "FINALIZED" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
      include: {
        entries: {
          where: { isWinner: true },
          orderBy: { rank: "asc" },
          take: 10,
          include: {
            track: {
              select: {
                id: true, title: true, coverUrl: true, genre: true,
                artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });

    res.json({ competitions });
  } catch (err) {
    console.error("getPastCompetitions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/competitions/:id/leaderboard ────────────────────────────────────

export async function getCompetitionLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(String(req.query.limit || "50")), 100);

    const competition = await prisma.monthlyCompetition.findUnique({ where: { id } });
    if (!competition) { res.status(404).json({ error: "Competition not found" }); return; }

    const entries = await prisma.competitionEntry.findMany({
      where: { competitionId: id },
      orderBy: { totalScore: "desc" },
      take: limit,
      include: {
        track: {
          select: {
            id: true, title: true, coverUrl: true, audioUrl: true,
            genre: true, playCount: true, likeCount: true,
            artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({ competition, entries, total: entries.length });
  } catch (err) {
    console.error("getCompetitionLeaderboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/competitions/enter — Enter a track into current competition ───

export async function enterCompetition(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { trackId } = req.body;

    if (!trackId) {
      res.status(400).json({ error: "trackId is required" });
      return;
    }

    // Validate track ownership
    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }
    if (track.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }
    if (track.status !== "PUBLISHED") { res.status(400).json({ error: "Track must be published to enter competition" }); return; }

    // Validate user is CREATOR tier
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
    const validTiers = ["CREATOR", "PRO", "PREMIUM"]; // PRO/PREMIUM legacy support
    if (!user || !validTiers.includes(user.subscriptionTier as string)) {
      res.status(403).json({
        error: "Creator subscription required to enter competitions",
        requiredTier: "CREATOR",
        currentTier: user?.subscriptionTier ?? "FREE",
      });
      return;
    }

    const competition = await getOrCreateCurrentCompetition();

    if (competition.status !== "OPEN" && competition.status !== "VOTING") {
      res.status(400).json({ error: "This month's competition is no longer accepting entries" });
      return;
    }

    // Check if already entered
    const existing = await prisma.competitionEntry.findUnique({
      where: { competitionId_trackId: { competitionId: competition.id, trackId } },
    });
    if (existing) {
      res.status(409).json({ error: "This track is already entered in the current competition" });
      return;
    }

    // Seed initial scores from existing track stats
    const listenScore = track.playCount * LISTEN_WEIGHT;
    const likeScore   = track.likeCount * LIKE_WEIGHT;

    // Count existing votes for this track
    const voteCount = await prisma.releaseVote.count({ where: { trackId } });
    const voteScore = voteCount * VOTE_WEIGHT;
    const totalScore = voteScore + listenScore + likeScore;

    const entry = await prisma.competitionEntry.create({
      data: {
        competitionId: competition.id,
        trackId,
        userId,
        voteScore,
        listenScore,
        likeScore,
        totalScore,
      },
      include: {
        track: { select: { id: true, title: true, coverUrl: true, genre: true } },
        competition: { select: { year: true, month: true, status: true } },
      },
    });

    res.status(201).json({ success: true, entry });
  } catch (err) {
    console.error("enterCompetition error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/competitions/:id/finalize — Admin: finalize & award Top 10 ────

export async function finalizeCompetition(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const competition = await prisma.monthlyCompetition.findUnique({ where: { id } });
    if (!competition) { res.status(404).json({ error: "Competition not found" }); return; }
    if (competition.status === "FINALIZED") {
      res.status(400).json({ error: "Competition is already finalized" }); return;
    }

    // Recompute all scores from live data
    const entries = await prisma.competitionEntry.findMany({
      where: { competitionId: id },
      include: { track: { select: { playCount: true, likeCount: true } } },
    });

    // Get vote counts for all entered tracks
    const trackIds = entries.map(e => e.trackId);
    const voteCounts = await prisma.releaseVote.groupBy({
      by: ["trackId"],
      where: { trackId: { in: trackIds } },
      _count: true,
    });
    const voteMap = new Map(voteCounts.map(v => [v.trackId, v._count]));

    // Compute final scores in memory, then sort
    const scored = entries.map(entry => {
      const votes   = voteMap.get(entry.trackId) ?? 0;
      const voteScore   = votes * VOTE_WEIGHT;
      const listenScore = entry.track.playCount * LISTEN_WEIGHT;
      const likeScore   = entry.track.likeCount * LIKE_WEIGHT;
      const totalScore  = voteScore + listenScore + likeScore;
      return { ...entry, voteScore, listenScore, likeScore, totalScore };
    }).sort((a, b) => b.totalScore - a.totalScore);

    const winners = scored.slice(0, 10);

    // Update all entries with final scores/ranks in a transaction
    await prisma.$transaction(async (tx) => {
      // Update scores and ranks
      for (let i = 0; i < scored.length; i++) {
        const e = scored[i];
        await tx.competitionEntry.update({
          where: { id: e.id },
          data: {
            voteScore:   e.voteScore,
            listenScore: e.listenScore,
            likeScore:   e.likeScore,
            totalScore:  e.totalScore,
            rank:        i + 1,
            isWinner:    i < 10,
          },
        });
      }

      // Grant Top Artist privileges to Top 10 winners
      for (const winner of winners) {
        for (const privilege of ["MINT_NFT", "DISTRIBUTION"] as const) {
          await tx.topArtistGrant.upsert({
            where: { userId_trackId_privilege: { userId: winner.userId, trackId: winner.trackId, privilege } },
            create: { userId: winner.userId, trackId: winner.trackId, competitionId: id, privilege },
            update: {},
          });
        }
        // Mark user as top artist
        await tx.user.update({
          where: { id: winner.userId },
          data: { isTopArtist: true, topArtistSince: new Date() },
        });
      }

      // Finalize competition
      await tx.monthlyCompetition.update({
        where: { id },
        data: { status: "FINALIZED", finalizedAt: new Date() },
      });
    });

    res.json({
      success: true,
      message: `Competition finalized. ${winners.length} winners granted Top Artist privileges.`,
      winners: winners.map((w, i) => ({
        rank: i + 1,
        userId: w.userId,
        trackId: w.trackId,
        totalScore: w.totalScore,
      })),
    });
  } catch (err) {
    console.error("finalizeCompetition error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/competitions/my-entries — User's own competition entries ────────

export async function getMyEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const entries = await prisma.competitionEntry.findMany({
      where: { userId },
      orderBy: { enteredAt: "desc" },
      include: {
        competition: { select: { year: true, month: true, status: true } },
        track: {
          select: {
            id: true, title: true, coverUrl: true, genre: true, playCount: true, likeCount: true,
          },
        },
      },
    });

    res.json({ entries });
  } catch (err) {
    console.error("getMyEntries error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/competitions/:id/score-update — Internal: update entry scores ─
// Called from play/like/vote hooks to keep scores live during competition.

export async function updateEntryScore(trackId: string): Promise<void> {
  try {
    const competition = await getOrCreateCurrentCompetition();
    if (competition.status === "FINALIZED") return;

    const entry = await prisma.competitionEntry.findUnique({
      where: { competitionId_trackId: { competitionId: competition.id, trackId } },
      include: { track: { select: { playCount: true, likeCount: true } } },
    });
    if (!entry) return;

    const voteCount  = await prisma.releaseVote.count({ where: { trackId } });
    const voteScore   = voteCount * VOTE_WEIGHT;
    const listenScore = entry.track.playCount * LISTEN_WEIGHT;
    const likeScore   = entry.track.likeCount * LIKE_WEIGHT;
    const totalScore  = voteScore + listenScore + likeScore;

    await prisma.competitionEntry.update({
      where: { id: entry.id },
      data: { voteScore, listenScore, likeScore, totalScore },
    });
  } catch {
    // Non-critical — score update failures shouldn't break the play/like flow
  }
}

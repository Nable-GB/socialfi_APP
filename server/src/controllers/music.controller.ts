import { Request, Response } from "express";
import prisma from "../lib/prisma.js";

// ─── GET /api/music/tracks — Discover / Feed ─────────────────────────────────

export async function getTracks(req: Request, res: Response): Promise<void> {
  try {
    const page = String(req.query.page || "1");
    const limit = String(req.query.limit || "20");
    const genre = req.query.genre ? String(req.query.genre) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const sort = String(req.query.sort || "latest");
    const artistId = req.query.artistId ? String(req.query.artistId) : undefined;

    const take = Math.min(parseInt(limit) || 20, 50);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const where: any = { status: "PUBLISHED" };
    if (genre) where.genre = genre;
    if (artistId) where.artistId = artistId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search.toLowerCase()] } },
        { artist: { username: { contains: search, mode: "insensitive" } } },
      ];
    }

    let orderBy: any = { publishedAt: "desc" };
    if (sort === "trending") orderBy = { playCount: "desc" };
    if (sort === "top") orderBy = { likeCount: "desc" };

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          artist: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
          _count: { select: { plays: true, likes: true, comments: true } },
        },
      }),
      prisma.track.count({ where }),
    ]);

    // Check if current user liked each track
    const userId = req.user?.userId;
    let likedTrackIds: Set<string> = new Set();
    if (userId && tracks.length > 0) {
      const likes = await prisma.trackLike.findMany({
        where: { userId, trackId: { in: tracks.map(t => t.id) } },
        select: { trackId: true },
      });
      likedTrackIds = new Set(likes.map(l => l.trackId));
    }

    res.json({
      tracks: tracks.map(t => ({
        ...t,
        isLiked: likedTrackIds.has(t.id),
        _count: undefined,
        plays: t._count.plays,
        likesCount: t._count.likes,
        commentsCount: t._count.comments,
      })),
      pagination: { page: parseInt(page) || 1, limit: take, total, pages: Math.ceil(total / take) },
    });
  } catch (err) {
    console.error("getTracks error:", err);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
}

// ─── GET /api/music/tracks/:id — Single track detail ─────────────────────────

export async function getTrack(req: Request, res: Response): Promise<void> {
  try {
    const track = await prisma.track.findUnique({
      where: { id: String(req.params.id) },
      include: {
        artist: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        album: { select: { id: true, title: true, coverUrl: true } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        distributions: { select: { id: true, status: true, youtubeUrl: true, submittedAt: true, liveAt: true } },
        _count: { select: { plays: true, likes: true, comments: true } },
      },
    });

    if (!track) { res.status(404).json({ error: "Track not found" }); return; }

    let isLiked = false;
    if (req.user?.userId) {
      const like = await prisma.trackLike.findUnique({
        where: { trackId_userId: { trackId: track.id, userId: req.user.userId } },
      });
      isLiked = !!like;
    }

    const t = track as any;
    res.json({ ...track, isLiked, plays: t._count?.plays ?? 0, likesCount: t._count?.likes ?? 0, commentsCount: t._count?.comments ?? 0 });
  } catch (err) {
    console.error("getTrack error:", err);
    res.status(500).json({ error: "Failed to fetch track" });
  }
}

// ─── POST /api/music/tracks — Create a new track ─────────────────────────────

export async function createTrack(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, description, genre, tags, bpm, key, duration, isAiGenerated, aiModel, aiPrompt, audioUrl, coverUrl, albumId, status } = req.body;

    if (!title || !audioUrl) {
      res.status(400).json({ error: "title and audioUrl are required" });
      return;
    }

    const track = await prisma.track.create({
      data: {
        title,
        description,
        genre: genre || "OTHER",
        tags: tags || [],
        bpm: bpm ? parseInt(bpm) : null,
        key: key || null,
        duration: duration ? parseInt(duration) : null,
        isAiGenerated: isAiGenerated ?? true,
        aiModel,
        aiPrompt,
        audioUrl,
        coverUrl,
        albumId: albumId || null,
        artistId: userId,
        status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
      include: {
        artist: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ success: true, track });
  } catch (err) {
    console.error("createTrack error:", err);
    res.status(500).json({ error: "Failed to create track" });
  }
}

// ─── PATCH /api/music/tracks/:id — Update track ──────────────────────────────

export async function updateTrack(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);
    const existing = await prisma.track.findUnique({ where: { id: trackId } });
    if (!existing) { res.status(404).json({ error: "Track not found" }); return; }
    if (existing.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }

    const b = req.body;
    const data: any = {};
    if (b.title !== undefined) data.title = b.title;
    if (b.description !== undefined) data.description = b.description;
    if (b.genre !== undefined) data.genre = b.genre;
    if (b.tags !== undefined) data.tags = b.tags;
    if (b.bpm !== undefined) data.bpm = b.bpm ? parseInt(b.bpm) : null;
    if (b.key !== undefined) data.key = b.key;
    if (b.duration !== undefined) data.duration = b.duration ? parseInt(b.duration) : null;
    if (b.isAiGenerated !== undefined) data.isAiGenerated = b.isAiGenerated;
    if (b.aiModel !== undefined) data.aiModel = b.aiModel;
    if (b.aiPrompt !== undefined) data.aiPrompt = b.aiPrompt;
    if (b.coverUrl !== undefined) data.coverUrl = b.coverUrl;
    if (b.status !== undefined) {
      data.status = b.status;
      if (b.status === "PUBLISHED" && !existing.publishedAt) data.publishedAt = new Date();
    }

    const track = await prisma.track.update({ where: { id: trackId }, data });
    res.json({ success: true, track });
  } catch (err) {
    console.error("updateTrack error:", err);
    res.status(500).json({ error: "Failed to update track" });
  }
}

// ─── DELETE /api/music/tracks/:id ─────────────────────────────────────────────

export async function deleteTrack(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);
    const existing = await prisma.track.findUnique({ where: { id: trackId } });
    if (!existing) { res.status(404).json({ error: "Track not found" }); return; }
    if (existing.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }

    await prisma.track.delete({ where: { id: trackId } });
    res.json({ success: true });
  } catch (err) {
    console.error("deleteTrack error:", err);
    res.status(500).json({ error: "Failed to delete track" });
  }
}

// ─── POST /api/music/tracks/:id/play — Record a play ─────────────────────────

export async function recordPlay(req: Request, res: Response): Promise<void> {
  try {
    const { durationPlayed, completedFull } = req.body;

    await prisma.$transaction([
      prisma.trackPlay.create({
        data: {
          trackId: String(req.params.id),
          listenerId: req.user?.userId ?? null,
          durationPlayed: durationPlayed ? parseInt(durationPlayed) : null,
          completedFull: completedFull ?? false,
        },
      }),
      prisma.track.update({
        where: { id: String(req.params.id) },
        data: { playCount: { increment: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("recordPlay error:", err);
    res.status(500).json({ error: "Failed to record play" });
  }
}

// ─── POST /api/music/tracks/:id/like — Toggle like ───────────────────────────

export async function toggleLike(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const trackId = String(req.params.id);

    const existing = await prisma.trackLike.findUnique({
      where: { trackId_userId: { trackId, userId } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.trackLike.delete({ where: { id: existing.id } }),
        prisma.track.update({ where: { id: trackId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      res.json({ liked: false });
    } else {
      await prisma.$transaction([
        prisma.trackLike.create({ data: { trackId, userId } }),
        prisma.track.update({ where: { id: trackId }, data: { likeCount: { increment: 1 } } }),
      ]);
      res.json({ liked: true });
    }
  } catch (err) {
    console.error("toggleLike error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
}

// ─── POST /api/music/tracks/:id/comment — Add comment ────────────────────────

export async function addComment(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { content, timestampSec } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

    const [comment] = await prisma.$transaction([
      prisma.trackComment.create({
        data: {
          trackId: String(req.params.id),
          userId,
          content: content.trim(),
          timestampSec: timestampSec ? parseInt(timestampSec) : null,
        },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      }),
      prisma.track.update({ where: { id: String(req.params.id) }, data: { commentCount: { increment: 1 } } }),
    ]);

    res.status(201).json({ success: true, comment });
  } catch (err) {
    console.error("addComment error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
}

// ─── GET /api/music/my-tracks — Get current user's tracks ────────────────────

export async function getMyTracks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const tracks = await prisma.track.findMany({
      where: { artistId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        album: { select: { id: true, title: true } },
        _count: { select: { plays: true, likes: true, comments: true } },
        distributions: { select: { id: true, status: true, youtubeUrl: true } },
      },
    });

    res.json({
      tracks: tracks.map(t => ({
        ...t,
        plays: t._count.plays,
        likesCount: t._count.likes,
        commentsCount: t._count.comments,
        _count: undefined,
      })),
    });
  } catch (err) {
    console.error("getMyTracks error:", err);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
}

// ─── POST /api/music/tracks/:id/distribute — Submit to YouTube Music ─────────

export async function submitToYouTube(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const track = await prisma.track.findUnique({ where: { id: String(req.params.id) } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }
    if (track.artistId !== userId) { res.status(403).json({ error: "Not your track" }); return; }
    if (track.status !== "PUBLISHED") { res.status(400).json({ error: "Track must be published first" }); return; }

    // Check if already submitted
    const existing = await prisma.youTubeDistribution.findFirst({
      where: { trackId: track.id, status: { in: ["PENDING", "SUBMITTED", "LIVE"] } },
    });
    if (existing) {
      res.status(409).json({ error: "Already submitted", distribution: existing });
      return;
    }

    const distribution = await prisma.youTubeDistribution.create({
      data: {
        trackId: track.id,
        status: "PENDING",
        submittedAt: new Date(),
      },
    });

    // NOTE: Actual YouTube upload would be done via a background worker
    // using YouTube Data API v3. For now we create the distribution record.

    res.status(201).json({ success: true, distribution, message: "Track queued for YouTube Music distribution" });
  } catch (err) {
    console.error("submitToYouTube error:", err);
    res.status(500).json({ error: "Failed to submit to YouTube" });
  }
}

// ─── Albums CRUD ──────────────────────────────────────────────────────────────

export async function getAlbums(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const albums = await prisma.album.findMany({
      where: { artistId: userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tracks: true } } },
    });
    res.json({ albums });
  } catch (err) {
    console.error("getAlbums error:", err);
    res.status(500).json({ error: "Failed to fetch albums" });
  }
}

export async function createAlbum(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { title, description, coverUrl, genre } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "Album title is required" }); return; }

    const album = await prisma.album.create({
      data: { title: title.trim(), description, coverUrl, genre: genre || "OTHER", artistId: userId },
    });
    res.status(201).json({ success: true, album });
  } catch (err) {
    console.error("createAlbum error:", err);
    res.status(500).json({ error: "Failed to create album" });
  }
}

import { Request, Response } from "express";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import {
  uploadToS3,
  isS3Configured,
  isAllowedImageType,
  isAllowedMediaType,
  isAllowedAudioType,
} from "../services/upload.service.js";

// ─── Multer config (memory storage → buffer → S3) ────────────────────────────

const storage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for avatars
  fileFilter: (_req, file, cb) => {
    if (isAllowedImageType(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, GIF, WebP, SVG images are allowed"));
  },
}).single("avatar");

export const uploadMedia = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE }, // 10MB default
  fileFilter: (_req, file, cb) => {
    if (isAllowedMediaType(file.mimetype)) cb(null, true);
    else cb(new Error("Only images and videos (MP4, WebM) are allowed"));
  },
}).single("media");

// ─── POST /api/uploads/avatar — Upload avatar + update user profile ──────────

export async function handleAvatarUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!isS3Configured()) {
      res.status(503).json({ error: "File upload not configured. Set S3 environment variables." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided. Use form field 'avatar'." });
      return;
    }

    const userId = req.user!.userId;
    const result = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, "avatars");

    // Update user avatarUrl
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.url },
      select: { id: true, username: true, avatarUrl: true },
    });

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      size: result.size,
      user,
    });
  } catch (err: any) {
    if (err.message?.includes("Only")) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("AvatarUpload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
}

// ─── POST /api/uploads/media — Upload post media (image/video) ───────────────

export async function handleMediaUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!isS3Configured()) {
      res.status(503).json({ error: "File upload not configured. Set S3 environment variables." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided. Use form field 'media'." });
      return;
    }

    const result = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, "posts");

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (err: any) {
    if (err.message?.includes("Only")) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("MediaUpload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
}

// ─── POST /api/uploads/nft — Upload NFT image ───────────────────────────────

export async function handleNftUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!isS3Configured()) {
      res.status(503).json({ error: "File upload not configured. Set S3 environment variables." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided. Use form field 'media'." });
      return;
    }

    const result = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, "nfts");

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (err: any) {
    if (err.message?.includes("Only")) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("NftUpload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
}

// ─── Audio upload (50MB, audio only) ─────────────────────────────────────────

export const uploadAudio = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio
  fileFilter: (_req, file, cb) => {
    if (isAllowedAudioType(file.mimetype)) cb(null, true);
    else cb(new Error("Only audio files (MP3, WAV, OGG, FLAC, AAC) are allowed"));
  },
}).single("audio");

export async function handleAudioUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!isS3Configured()) {
      res.status(503).json({ error: "File upload not configured. Set S3 environment variables." });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided. Use form field 'audio'." });
      return;
    }

    const result = await uploadToS3(req.file.buffer, req.file.originalname, req.file.mimetype, "tracks");

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (err: any) {
    if (err.message?.includes("Only")) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("AudioUpload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
}

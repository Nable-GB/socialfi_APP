import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import crypto from "node:crypto";
import path from "node:path";

// ─── S3 Client ────────────────────────────────────────────────────────────────

let s3: S3Client | null = null;

function getS3(): S3Client {
  if (!s3) {
    if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error("S3 not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.");
    }
    s3 = new S3Client({
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3;
}

export function isS3Configured(): boolean {
  return !!(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

// ─── Allowed file types ───────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/webm", "video/quicktime",
]);

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mime);
}

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg",
  "audio/flac", "audio/aac", "audio/mp4", "audio/webm",
]);

export function isAllowedMediaType(mime: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(mime) || ALLOWED_VIDEO_TYPES.has(mime);
}

export function isAllowedAudioType(mime: string): boolean {
  return ALLOWED_AUDIO_TYPES.has(mime);
}

// ─── Upload to S3 ─────────────────────────────────────────────────────────────

interface UploadResult {
  key: string;       // S3 object key
  url: string;       // Full public URL (CDN or S3 direct)
  size: number;
  contentType: string;
}

export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder: string, // "avatars" | "posts" | "nfts"
): Promise<UploadResult> {
  const client = getS3();
  const ext = path.extname(originalName) || ".jpg";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const key = `${folder}/${uniqueName}`;

  await client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  const url = env.S3_CDN_URL
    ? `${env.S3_CDN_URL}/${key}`
    : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;

  return { key, url, size: buffer.length, contentType };
}

// ─── Delete from S3 ──────────────────────────────────────────────────────────

export async function deleteFromS3(key: string): Promise<void> {
  try {
    const client = getS3();
    await client.send(new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }));
  } catch (err) {
    console.error("S3 delete error:", err);
  }
}

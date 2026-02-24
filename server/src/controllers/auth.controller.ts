import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SiweMessage } from "siwe";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import type { JwtPayload } from "../middleware/auth.js";
import crypto from "node:crypto";

// ─── Helpers ────────────────────────────────────────────────────────────────

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8-char code
}

// ─── Validation Schemas ─────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(30),
  displayName: z.string().optional(),
  referralCode: z.string().optional(), // Code of the person who referred them
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const siweVerifySchema = z.object({
  message: z.string(),
  signature: z.string(),
});

// ─── Web2: Register ─────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      res.status(409).json({ error: "Email or username already taken" });
      return;
    }

    // Resolve referrer
    let referredById: string | undefined;
    if (data.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: data.referralCode },
      });
      if (referrer) referredById = referrer.id;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        username: data.username,
        displayName: data.displayName ?? data.username,
        authProvider: "EMAIL",
        referralCode: generateReferralCode(),
        referredById,
      },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Web2: Login ────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({ userId: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        walletAddress: user.walletAddress,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Web3: Get Nonce (for SIWE) ────────────────────────────────────────────

export async function getNonce(req: Request, res: Response): Promise<void> {
  try {
    const { address } = req.params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }

    const nonce = crypto.randomBytes(16).toString("hex");

    // Upsert: create wallet-based user if new, or update nonce
    await prisma.user.upsert({
      where: { walletAddress: address.toLowerCase() },
      update: { nonce },
      create: {
        walletAddress: address.toLowerCase(),
        nonce,
        username: `user_${address.slice(2, 8).toLowerCase()}`,
        authProvider: "WALLET",
        referralCode: generateReferralCode(),
      },
    });

    res.json({ nonce });
  } catch (err) {
    console.error("GetNonce error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Web3: Verify SIWE Signature ───────────────────────────────────────────

export async function verifySiwe(req: Request, res: Response): Promise<void> {
  try {
    const { message, signature } = siweVerifySchema.parse(req.body);

    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    const user = await prisma.user.findUnique({
      where: { walletAddress: fields.address.toLowerCase() },
    });

    if (!user) {
      res.status(404).json({ error: "Wallet not found. Request a nonce first." });
      return;
    }

    // Verify nonce matches
    if (user.nonce !== fields.nonce) {
      res.status(401).json({ error: "Invalid nonce" });
      return;
    }

    // Rotate nonce after successful auth
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nonce: crypto.randomBytes(16).toString("hex"),
        lastLoginAt: new Date(),
      },
    });

    const token = signToken({ userId: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        walletAddress: user.walletAddress,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("SIWE verify error:", err);
    res.status(401).json({ error: "Signature verification failed" });
  }
}

// ─── Get Current User Profile ───────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        walletAddress: true,
        referralCode: true,
        offChainBalance: true,
        totalEarned: true,
        totalWithdrawn: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error("GetMe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SiweMessage } from "siwe";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";
import type { JwtPayload } from "../middleware/auth.js";
import crypto from "node:crypto";
import { sendEmail, emailVerificationTemplate, passwordResetTemplate, welcomeEmailTemplate } from "../services/email.service.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as any);
}

function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as any);
}

function issueTokens(payload: JwtPayload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
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

    const tokens = issueTokens({ userId: user.id, role: user.role });

    res.status(201).json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

    const tokens = issueTokens({ userId: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined });

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
    const address = req.params.address as string;

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

    const tokens = issueTokens({ userId: user.id, role: user.role, walletAddress: user.walletAddress ?? undefined });

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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

// ─── POST /api/auth/refresh — Exchange refresh token for new token pair ─────

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function refreshTokenHandler(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    // Verify the refresh token
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Issue new token pair
    const tokens = issueTokens({
      userId: user.id,
      role: user.role,
      walletAddress: user.walletAddress ?? undefined,
    });

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("RefreshToken error:", err);
    res.status(500).json({ error: "Internal server error" });
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

// ─── POST /api/auth/send-verification — Send email verification link ─────────

export async function sendVerificationEmail(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.email) {
      res.status(400).json({ error: "No email address on this account" });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ error: "Email already verified" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifyToken: token, emailVerifyExpiresAt: expiresAt },
    });

    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
    const tpl = emailVerificationTemplate(user.username, verifyUrl);
    await sendEmail({ to: user.email, ...tpl });

    res.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    console.error("SendVerification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/auth/verify-email?token=… — Verify email ─────────────────────

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });

    if (!user) {
      res.status(400).json({ error: "Invalid or expired verification token" });
      return;
    }
    if (user.emailVerifyExpiresAt && user.emailVerifyExpiresAt < new Date()) {
      res.status(400).json({ error: "Verification link has expired. Please request a new one." });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
      },
    });

    // Send welcome email after verification
    if (user.email) {
      const tpl = welcomeEmailTemplate(user.username, env.FRONTEND_URL);
      await sendEmail({ to: user.email, ...tpl }).catch(() => {}); // non-blocking
    }

    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("VerifyEmail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/auth/forgot-password — Request password reset ─────────────────

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent user enumeration
    if (!user || !user.passwordHash) {
      res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    const tpl = passwordResetTemplate(user.username, resetUrl);
    await sendEmail({ to: user.email!, ...tpl });

    res.json({ success: true, message: "If an account exists with this email, a reset link has been sent." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    console.error("ForgotPassword error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/auth/reset-password — Set new password with token ─────────────

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { passwordResetToken: token } });

    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      res.status(400).json({ error: "Reset link has expired. Please request a new one." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("ResetPassword error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

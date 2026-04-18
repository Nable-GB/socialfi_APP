import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { sendTokens, isOnChainEnabled, getOperatorBalance } from "../services/onchain.service.js";
import { env } from "../config/env.js";
import { notifyAirdrop } from "../services/notification.service.js";
import {
  applyActiveSubscriptionEntitlements,
  generateCreatorCodeValue,
  normalizeCreatorCodeValue,
  syncUserSubscriptionTier,
} from "../services/subscription.service.js";

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalCampaigns,
      activeCampaigns,
      totalRewardsPaid,
      pendingWithdrawals,
      totalRevenueFiat,
      postsCount,
      recentSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.adCampaign.count(),
      prisma.adCampaign.count({ where: { status: "ACTIVE" } }),
      prisma.rewardTransaction.aggregate({
        where: { type: { in: ["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS", "AIRDROP", "SIGNUP_BONUS"] } },
        _sum: { amount: true },
      }),
      prisma.rewardTransaction.aggregate({
        where: { type: "WITHDRAWAL", status: "CONFIRMED" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.adCampaign.aggregate({
        where: { paymentStatus: "COMPLETED" },
        _sum: { amountPaid: true },
      }),
      prisma.socialPost.count({ where: { isActive: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 7,
        select: { createdAt: true },
      }),
    ]);

    // Signups per day (last 7 days)
    const signupsByDay = recentSignups.reduce((acc: Record<string, number>, u) => {
      const day = new Date(u.createdAt).toISOString().slice(0, 10);
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
      },
      rewards: {
        totalPaid: totalRewardsPaid._sum.amount?.toString() ?? "0",
        pendingWithdrawals: {
          count: pendingWithdrawals._count,
          amount: pendingWithdrawals._sum.amount?.abs().toString() ?? "0",
        },
      },
      revenue: {
        totalFiat: totalRevenueFiat._sum?.amountPaid?.toString() ?? "0",
      },
      posts: { total: postsCount },
      signupsByDay,
      onChainEnabled: isOnChainEnabled(),
    });
  } catch (err) {
    console.error("AdminStats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

const usersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().optional(),
  role: z.enum(["USER", "MERCHANT", "ADMIN"]).optional(),
});

export async function getUsers(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, search, role } = usersQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = {
      ...(role ? { role } : {}),
      ...(search ? {
        OR: [
          { username: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { displayName: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isVerified: true,
          emailVerified: true,
          walletAddress: true,
          offChainBalance: true,
          totalEarned: true,
          totalWithdrawn: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { posts: true, rewards: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    console.error("AdminGetUsers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────

const updateRoleSchema = z.object({
  role: z.enum(["USER", "MERCHANT", "ADMIN"]),
});

export async function updateUserRole(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.id as string;
    const { role } = updateRoleSchema.parse(req.body);
    const adminId = req.user!.userId;

    // Prevent self-demotion
    if (userId === adminId && role !== "ADMIN") {
      res.status(400).json({ error: "Cannot change your own admin role" });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });

    res.json({ user, message: `Role updated to ${role}` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    console.error("AdminUpdateRole error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/admin/campaigns ─────────────────────────────────────────────────

const campaignsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  status: z.enum(["DRAFT", "PENDING_PAYMENT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
});

export async function getCampaigns(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, status } = campaignsQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [campaigns, total] = await Promise.all([
      prisma.adCampaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          paymentStatus: true,
          amountPaid: true,
          rewardPoolTotal: true,
          rewardPoolDistributed: true,
          impressionsTotal: true,
          impressionsDelivered: true,
          createdAt: true,
          startsAt: true,
          endsAt: true,
          merchant: {
            select: { id: true, username: true, email: true },
          },
        },
      }),
      prisma.adCampaign.count({ where }),
    ]);

    res.json({ campaigns, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    console.error("AdminGetCampaigns error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── PATCH /api/admin/campaigns/:id/status ────────────────────────────────────

const updateCampaignStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "CANCELLED", "COMPLETED"]),
});

export async function updateCampaignStatus(req: Request, res: Response): Promise<void> {
  try {
    const campaignId = req.params.id as string;
    const { status } = updateCampaignStatusSchema.parse(req.body);

    const campaign = await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status },
      select: { id: true, title: true, status: true },
    });

    res.json({ campaign, message: `Campaign status updated to ${status}` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    console.error("AdminUpdateCampaignStatus error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/admin/subscriptions/usdt-pending — Review queue ───────────────

const pendingUsdtSubscriptionsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const reviewUsdtSubscriptionSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});

const creatorCodesQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  search: z.string().trim().optional(),
  active: z.enum(["true", "false"]).optional(),
});

const creatorCodeValueSchema = z.string().trim().min(4).max(32).regex(/^[A-Za-z0-9-]+$/);

const createCreatorCodeSchema = z.object({
  code: creatorCodeValueSchema.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxRedemptions: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

const updateCreatorCodeSchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxRedemptions: z.coerce.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const revokeCreatorCodeRedemptionSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

async function createUniqueCreatorCodeValue(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateCreatorCodeValue();
    const existing = await prisma.creatorCode.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique Creator code.");
}

export async function getPendingUsdtSubscriptions(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = pendingUsdtSubscriptionsQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const where = { paymentMethod: "CRYPTO_USDT" as any, status: "INCOMPLETE" as any };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          tier: true,
          cryptoTxHash: true,
          cryptoWalletAddress: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              walletAddress: true,
              subscriptionTier: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    res.json({ subscriptions, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    console.error("GetPendingUsdtSubscriptions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function approveUsdtSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscriptionId = req.params.id as string;
    const adminId = req.user!.userId;
    const { notes } = reviewUsdtSubscriptionSchema.parse(req.body ?? {});

    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: {
        id: true,
        userId: true,
        tier: true,
        status: true,
        paymentMethod: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        creditsGrantedThrough: true,
        cryptoTxHash: true,
      },
    });

    if (!existing || existing.paymentMethod !== "CRYPTO_USDT") {
      res.status(404).json({ error: "USDT subscription request not found" });
      return;
    }

    if (existing.status !== "INCOMPLETE") {
      res.status(400).json({ error: `Subscription request is already ${existing.status}` });
      return;
    }

    const duplicateActive = await prisma.subscription.findFirst({
      where: {
        userId: existing.userId,
        id: { not: existing.id },
        status: "ACTIVE",
        tier: { in: ["CREATOR", "PRO", "PREMIUM"] as any },
      },
      select: { id: true },
    });

    if (duplicateActive) {
      res.status(400).json({ error: "User already has an active Creator subscription." });
      return;
    }

    const approvedAt = new Date();
    const periodEnd = new Date(approvedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const approvedSubscription = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "ACTIVE",
          currentPeriodStart: approvedAt,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          reviewedAt: approvedAt,
          reviewedBy: adminId,
          reviewNotes: notes ?? null,
        },
      });

      const entitlement = await applyActiveSubscriptionEntitlements(tx, approvedSubscription as any);
      return { approvedSubscription, entitlement };
    });

    res.json({
      success: true,
      subscription: result.approvedSubscription,
      creditsGranted: result.entitlement.creditsGranted,
      message: "USDT Creator subscription approved successfully.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid approval payload" });
      return;
    }
    console.error("ApproveUsdtSubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function rejectUsdtSubscription(req: Request, res: Response): Promise<void> {
  try {
    const subscriptionId = req.params.id as string;
    const adminId = req.user!.userId;
    const { notes } = reviewUsdtSubscriptionSchema.parse(req.body ?? {});

    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, userId: true, paymentMethod: true, status: true },
    });

    if (!existing || existing.paymentMethod !== "CRYPTO_USDT") {
      res.status(404).json({ error: "USDT subscription request not found" });
      return;
    }

    if (existing.status !== "INCOMPLETE") {
      res.status(400).json({ error: `Subscription request is already ${existing.status}` });
      return;
    }

    const reviewedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const rejectedSubscription = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "CANCELLED",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          reviewedAt,
          reviewedBy: adminId,
          reviewNotes: notes ?? null,
        },
      });

      const nextTier = await syncUserSubscriptionTier(tx, existing.userId);
      return { rejectedSubscription, nextTier };
    });

    res.json({
      success: true,
      subscription: result.rejectedSubscription,
      tier: result.nextTier,
      message: "USDT subscription request rejected.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid rejection payload" });
      return;
    }
    console.error("RejectUsdtSubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCreatorCodes(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, search, active } = creatorCodesQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;
    const where = {
      ...(search ? { code: { contains: search, mode: "insensitive" as const } } : {}),
      ...(active ? { isActive: active === "true" } : {}),
    };

    const [codes, total] = await Promise.all([
      prisma.creatorCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          tier: true,
          isActive: true,
          expiresAt: true,
          maxRedemptions: true,
          redemptionCount: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { id: true, username: true, displayName: true },
          },
          redemptions: {
            orderBy: { redeemedAt: "desc" },
            take: 10,
            select: {
              id: true,
              redeemedAt: true,
              revokedAt: true,
              revokedBy: true,
              revokeReason: true,
              subscriptionId: true,
              user: {
                select: { id: true, username: true, displayName: true, email: true },
              },
            },
          },
        },
      }),
      prisma.creatorCode.count({ where }),
    ]);

    res.json({ codes, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    console.error("GetCreatorCodes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCreatorCode(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const { code, expiresAt, maxRedemptions, notes } = createCreatorCodeSchema.parse(req.body ?? {});
    const normalizedCode = code ? normalizeCreatorCodeValue(code) : await createUniqueCreatorCodeValue();

    const creatorCode = await prisma.creatorCode.create({
      data: {
        code: normalizedCode,
        tier: "CREATOR",
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxRedemptions,
        notes: notes ?? null,
        createdById: adminId,
      },
      select: {
        id: true,
        code: true,
        tier: true,
        isActive: true,
        expiresAt: true,
        maxRedemptions: true,
        redemptionCount: true,
        notes: true,
        createdAt: true,
      },
    });

    res.status(201).json({ success: true, creatorCode, message: "Creator code created successfully." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid creator code payload" });
      return;
    }

    if (err instanceof Error && err.message === "Failed to generate a unique Creator code.") {
      res.status(500).json({ error: err.message });
      return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "Creator code already exists." });
      return;
    }

    console.error("CreateCreatorCode error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateCreatorCode(req: Request, res: Response): Promise<void> {
  try {
    const codeId = req.params.id as string;
    const { isActive, expiresAt, maxRedemptions, notes } = updateCreatorCodeSchema.parse(req.body ?? {});

    const existing = await prisma.creatorCode.findUnique({ where: { id: codeId }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ error: "Creator code not found" });
      return;
    }

    const creatorCode = await prisma.creatorCode.update({
      where: { id: codeId },
      data: {
        ...(isActive !== undefined ? { isActive } : {}),
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        ...(maxRedemptions !== undefined ? { maxRedemptions } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      select: {
        id: true,
        code: true,
        tier: true,
        isActive: true,
        expiresAt: true,
        maxRedemptions: true,
        redemptionCount: true,
        notes: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, creatorCode, message: "Creator code updated successfully." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid creator code payload" });
      return;
    }
    console.error("UpdateCreatorCode error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function revokeCreatorCodeRedemption(req: Request, res: Response): Promise<void> {
  try {
    const redemptionId = req.params.id as string;
    const adminId = req.user!.userId;
    const { reason } = revokeCreatorCodeRedemptionSchema.parse(req.body ?? {});

    const existing = await prisma.creatorCodeRedemption.findUnique({
      where: { id: redemptionId },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        subscriptionId: true,
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Creator code redemption not found" });
      return;
    }

    if (existing.revokedAt) {
      res.status(400).json({ error: "Creator code redemption has already been revoked" });
      return;
    }

    const revokedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const redemption = await tx.creatorCodeRedemption.update({
        where: { id: redemptionId },
        data: {
          revokedAt,
          revokedBy: adminId,
          revokeReason: reason,
        },
      });

      if (existing.subscriptionId) {
        await tx.subscription.update({
          where: { id: existing.subscriptionId },
          data: {
            status: "CANCELLED",
            cancelAtPeriodEnd: false,
            reviewNotes: `Creator code access revoked: ${reason}`,
          },
        });
      }

      const tier = await syncUserSubscriptionTier(tx, existing.userId);
      return { redemption, tier };
    });

    res.json({ success: true, redemption: result.redemption, tier: result.tier, message: "Creator code access revoked successfully." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid revoke payload" });
      return;
    }
    console.error("RevokeCreatorCodeRedemption error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/admin/rewards/distribute — Batch process queued withdrawals ────

export async function distributeRewards(req: Request, res: Response): Promise<void> {
  try {
    // Find all CONFIRMED (queued) withdrawals
    const pending = await prisma.rewardTransaction.findMany({
      where: { type: "WITHDRAWAL", status: "CONFIRMED" },
      include: { user: { select: { id: true, username: true, walletAddress: true } } },
      take: 50, // Process max 50 at a time
    });

    if (pending.length === 0) {
      res.json({ success: true, processed: 0, message: "No queued withdrawals" });
      return;
    }

    if (!isOnChainEnabled()) {
      res.status(400).json({ error: "On-chain transfer not configured. Set RPC_URL, TOKEN_CONTRACT_ADDRESS, and OPERATOR_PRIVATE_KEY." });
      return;
    }

    let distributed = 0;
    let failed = 0;
    const results: { userId: string; amount: string; txHash: string | null; status: string }[] = [];

    for (const tx of pending) {
      if (!tx.user.walletAddress) {
        await prisma.rewardTransaction.update({
          where: { id: tx.id },
          data: { status: "FAILED", description: "No wallet address on account" },
        });
        failed++;
        results.push({ userId: tx.user.id, amount: tx.amount.abs().toString(), txHash: null, status: "failed_no_wallet" });
        continue;
      }

      try {
        const amount = tx.amount.abs().toString();
        const result = await sendTokens(tx.user.walletAddress, amount);
        await prisma.rewardTransaction.update({
          where: { id: tx.id },
          data: { status: "DISTRIBUTED", onChainTxHash: result.txHash },
        });
        distributed++;
        results.push({ userId: tx.user.id, amount, txHash: result.txHash, status: "distributed" });
      } catch (chainErr: any) {
        await prisma.rewardTransaction.update({
          where: { id: tx.id },
          data: { status: "FAILED", description: `Chain error: ${chainErr.message}` },
        });
        // Refund user balance
        await prisma.user.update({
          where: { id: tx.user.id },
          data: {
            offChainBalance: { increment: tx.amount.abs() },
            totalWithdrawn: { decrement: tx.amount.abs() },
          },
        });
        failed++;
        results.push({ userId: tx.user.id, amount: tx.amount.abs().toString(), txHash: null, status: "failed" });
      }
    }

    res.json({
      success: true,
      processed: pending.length,
      distributed,
      failed,
      results,
    });
  } catch (err) {
    console.error("AdminDistribute error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/admin/rewards/airdrop — Airdrop tokens to user(s) ─────────────

const airdropSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
});

const grantRewardSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
});

export async function airdropTokens(req: Request, res: Response): Promise<void> {
  try {
    const { userIds, amount, description } = airdropSchema.parse(req.body);
    const amountDecimal = new Prisma.Decimal(amount);

    const results = await prisma.$transaction(
      userIds.map(userId =>
        prisma.rewardTransaction.create({
          data: {
            userId,
            type: "AIRDROP",
            amount: amountDecimal,
            description: description ?? `Admin airdrop of ${amount} SMFI`,
            status: "CONFIRMED",
          },
        })
      )
    );

    // Update balances
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        offChainBalance: { increment: amountDecimal },
        totalEarned: { increment: amountDecimal },
      },
    });

    await Promise.all(userIds.map((userId) => notifyAirdrop(userId, amount).catch(() => {})));

    res.json({
      success: true,
      airdropped: results.length,
      amountEach: amount,
      totalDistributed: amount * results.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("AdminAirdrop error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function grantTokensToUser(req: Request, res: Response): Promise<void> {
  try {
    const { userId, amount, description } = grantRewardSchema.parse(req.body);
    const amountDecimal = new Prisma.Decimal(amount);

    await prisma.$transaction(async (tx) => {
      await tx.rewardTransaction.create({
        data: {
          userId,
          type: "AIRDROP",
          amount: amountDecimal,
          description: description ?? `Admin grant of ${amount} SMFI`,
          status: "CONFIRMED",
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          offChainBalance: { increment: amountDecimal },
          totalEarned: { increment: amountDecimal },
        },
      });
    });

    notifyAirdrop(userId, amount).catch(() => {});

    res.json({
      success: true,
      userId,
      amount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("AdminGrantTokens error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/admin/payout-health — Operator wallet & payout status ──────────

export async function getPayoutHealth(req: Request, res: Response): Promise<void> {
  try {
    const onChainEnabled = isOnChainEnabled();

    // Count queued + failed withdrawals
    const [queuedCount, failedCount, pendingCount] = await Promise.all([
      prisma.rewardTransaction.count({ where: { type: "WITHDRAWAL", status: "CONFIRMED" } }),
      prisma.rewardTransaction.count({ where: { type: "WITHDRAWAL", status: "FAILED" } }),
      prisma.rewardTransaction.count({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
    ]);

    let operatorBalance: { balance: string; symbol: string } = { balance: "0", symbol: "N/A" };
    if (onChainEnabled) {
      try {
        operatorBalance = await getOperatorBalance();
      } catch (err: any) {
        operatorBalance = { balance: `error: ${err.message}`, symbol: "N/A" };
      }
    }

    res.json({
      onChainEnabled,
      chainId: env.CHAIN_ID,
      operatorBalance: operatorBalance.balance,
      tokenSymbol: operatorBalance.symbol,
      withdrawals: {
        queued: queuedCount,
        pending: pendingCount,
        failed: failedCount,
      },
      config: {
        minWithdrawal: env.MIN_WITHDRAWAL,
        maxWithdrawal: env.MAX_WITHDRAWAL,
        smfiPerEth: env.SMFI_PER_ETH,
      },
    });
  } catch (err) {
    console.error("PayoutHealth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/admin/payout-queue — List tracks pending payout release ─────────

export async function getPayoutQueue(req: Request, res: Response): Promise<void> {
  try {
    const status = (req.query.status as string) || "PENDING";
    const page   = Math.max(parseInt(String(req.query.page || "1")), 1);
    const limit  = Math.min(parseInt(String(req.query.limit || "20")), 100);

    const [releases, total] = await Promise.all([
      (prisma as any).payoutRelease.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          track: { select: { id: true, title: true, coverUrl: true, genre: true } },
          artist: { select: { id: true, username: true, displayName: true, walletAddress: true } },
        },
      }),
      (prisma as any).payoutRelease.count({ where: { status } }),
    ]);

    res.json({ releases, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("getPayoutQueue error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/admin/payout-releases — Create a payout to be released ─────────

export async function createPayoutRelease(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.userId;
    const { trackId, totalRevenue } = req.body;

    if (!trackId || totalRevenue === undefined) {
      res.status(400).json({ error: "trackId and totalRevenue are required" });
      return;
    }

    const revenue = Number(totalRevenue);
    if (!Number.isFinite(revenue) || revenue <= 0) {
      res.status(400).json({ error: "totalRevenue must be a positive number" });
      return;
    }

    const track = await prisma.track.findUnique({ where: { id: trackId } });
    if (!track) { res.status(404).json({ error: "Track not found" }); return; }

    const artistAmount   = revenue * 0.5;
    const platformAmount = revenue * 0.5;

    const release = await (prisma as any).payoutRelease.create({
      data: {
        trackId,
        artistId: track.artistId,
        totalRevenue: revenue,
        artistAmount,
        platformAmount,
        status: "PENDING",
      },
    });

    res.status(201).json({ success: true, release });
  } catch (err) {
    console.error("createPayoutRelease error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/admin/payout-releases/:id/release — Distribute payout ─────────

export async function releasePayout(req: Request, res: Response): Promise<void> {
  try {
    const adminId   = req.user!.userId;
    const releaseId = req.params.id;
    const { notes } = req.body;

    const release = await (prisma as any).payoutRelease.findUnique({
      where: { id: releaseId },
      include: {
        track: true,
        artist: { select: { id: true, username: true } },
      },
    });

    if (!release) { res.status(404).json({ error: "Payout release not found" }); return; }
    if (release.status !== "PENDING") {
      res.status(400).json({ error: `Payout is already ${release.status}` }); return;
    }

    const artistAmount = Number(release.artistAmount);

    // Distribute to artist + proportional dividends to NFT shareholders
    const musicNft = await (prisma as any).musicNFT.findFirst({ where: { trackId: release.trackId } });

    await prisma.$transaction(async (tx: any) => {
      let holderPayoutTotal = 0;

      // Distribute to NFT shareholders if NFT exists
      if (musicNft) {
        const holders = await (tx as any).musicNFTHolder.findMany({
          where: { musicNftId: musicNft.id },
        });
        const totalSupply = musicNft.totalSupply;
        const holderRevenuePool = artistAmount * 0.5;
        for (const holder of holders) {
          const share = totalSupply > 0
            ? (holder.fractions / totalSupply) * holderRevenuePool
            : 0;
          if (share > 0) {
            holderPayoutTotal += share;
            await tx.user.update({
              where: { id: holder.userId },
              data: { offChainBalance: { increment: share }, totalEarned: { increment: share } },
            });
            await (tx as any).royaltyPayout.create({
              data: {
                musicNftId: musicNft.id,
                userId: holder.userId,
                amount: share,
                payoutType: "STREAMING",
                note: `Streaming dividend from track "${release.track.title}"`,
              },
            });
          }
        }
      }

      const artistDirectAmount = Math.max(artistAmount - holderPayoutTotal, 0);

      // Credit the artist with the remaining artist share after holder dividends.
      if (artistDirectAmount > 0) {
        await tx.user.update({
          where: { id: release.artistId },
          data: { offChainBalance: { increment: artistDirectAmount }, totalEarned: { increment: artistDirectAmount } },
        });
      }

      // Mark release as paid
      await (tx as any).payoutRelease.update({
        where: { id: releaseId },
        data: { status: "PAID", releasedAt: new Date(), releasedBy: adminId, notes },
      });
    });

    res.json({ success: true, message: "Payout distributed successfully", releaseId });
  } catch (err) {
    console.error("releasePayout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

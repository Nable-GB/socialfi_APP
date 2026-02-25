import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { sendTokens, isOnChainEnabled } from "../services/onchain.service.js";

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
            description: description ?? `Admin airdrop of ${amount} SFT`,
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

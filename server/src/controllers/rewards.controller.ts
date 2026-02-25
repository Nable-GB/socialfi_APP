import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { creditAdViewReward, creditAdEngagementReward } from "../services/reward.service.js";
import { sendTokens, isOnChainEnabled } from "../services/onchain.service.js";
import { env } from "../config/env.js";

// ─── Validation ─────────────────────────────────────────────────────────────

const claimRewardSchema = z.object({
  postId: z.string().uuid(),
  type: z.enum(["VIEW", "ENGAGEMENT"]),
});

// ─── POST /api/rewards/claim — User claims reward after watching/engaging ───

export async function claimReward(req: Request, res: Response): Promise<void> {
  try {
    const data = claimRewardSchema.parse(req.body);
    const userId = req.user!.userId;

    // 1. Fetch the sponsored post with its campaign
    const post = await prisma.socialPost.findUnique({
      where: { id: data.postId },
      include: {
        adCampaign: {
          select: {
            id: true,
            status: true,
            impressionsTotal: true,
            impressionsDelivered: true,
            rewardPoolTotal: true,
            rewardPoolDistributed: true,
          },
        },
      },
    });

    if (!post || post.type !== "SPONSORED") {
      res.status(404).json({ error: "Sponsored post not found" });
      return;
    }

    if (!post.adCampaign || post.adCampaign.status !== "ACTIVE") {
      res.status(400).json({ error: "Campaign is no longer active" });
      return;
    }

    // 1b. Prevent claiming rewards on own sponsored posts
    if (post.authorId === userId) {
      res.status(403).json({ error: "Cannot claim rewards on your own sponsored post" });
      return;
    }

    // 1c. Time-gate: post must be at least 5 seconds old (anti-bot)
    const MIN_VIEW_SECONDS = 5;
    const postAgeSeconds = (Date.now() - new Date(post.createdAt).getTime()) / 1000;
    if (postAgeSeconds < MIN_VIEW_SECONDS) {
      res.status(429).json({ error: `Please view the post for at least ${MIN_VIEW_SECONDS} seconds before claiming` });
      return;
    }

    // 2. Check if campaign has remaining impressions
    if (post.adCampaign.impressionsDelivered >= post.adCampaign.impressionsTotal) {
      res.status(400).json({ error: "Campaign has reached its impression limit" });
      return;
    }

    // 3. Check remaining reward pool
    const remainingPool = post.adCampaign.rewardPoolTotal
      .sub(post.adCampaign.rewardPoolDistributed);

    if (remainingPool.lte(new Prisma.Decimal(0))) {
      res.status(400).json({ error: "Campaign reward pool is exhausted" });
      return;
    }

    // 4. Determine reward type and check for duplicates
    if (data.type === "VIEW") {
      // Check if user already claimed a VIEW reward for this post
      const existingView = await prisma.rewardTransaction.findFirst({
        where: {
          userId,
          relatedPostId: data.postId,
          type: "AD_VIEW",
        },
      });

      if (existingView) {
        res.status(409).json({ error: "Reward already claimed for this post" });
        return;
      }

      const rewardAmount = post.rewardPerView ?? new Prisma.Decimal(0);
      if (rewardAmount.lte(new Prisma.Decimal(0))) {
        res.status(400).json({ error: "No view reward configured for this post" });
        return;
      }

      await creditAdViewReward(userId, data.postId, post.adCampaign.id, rewardAmount);

      // Track the view interaction
      await prisma.postInteraction.upsert({
        where: {
          unique_user_post_interaction: { userId, postId: data.postId, type: "VIEW" },
        },
        update: {},
        create: { userId, postId: data.postId, type: "VIEW" },
      });

      await prisma.socialPost.update({
        where: { id: data.postId },
        data: { viewsCount: { increment: 1 } },
      });

      res.json({
        success: true,
        reward: {
          type: "AD_VIEW",
          amount: rewardAmount.toString(),
          postId: data.postId,
        },
      });
    } else {
      // ENGAGEMENT reward — user must have already interacted (LIKE, COMMENT, SHARE)
      const existingEngagement = await prisma.rewardTransaction.findFirst({
        where: {
          userId,
          relatedPostId: data.postId,
          type: "AD_ENGAGEMENT",
        },
      });

      if (existingEngagement) {
        res.status(409).json({ error: "Engagement reward already claimed for this post" });
        return;
      }

      // Verify user actually engaged with the post
      const hasEngaged = await prisma.postInteraction.findFirst({
        where: {
          userId,
          postId: data.postId,
          type: { in: ["LIKE", "COMMENT", "SHARE"] },
        },
      });

      if (!hasEngaged) {
        res.status(400).json({ error: "You must engage with the post first (like, comment, or share)" });
        return;
      }

      const rewardAmount = post.rewardPerEngagement ?? new Prisma.Decimal(0);
      if (rewardAmount.lte(new Prisma.Decimal(0))) {
        res.status(400).json({ error: "No engagement reward configured for this post" });
        return;
      }

      await creditAdEngagementReward(
        userId,
        data.postId,
        post.adCampaign.id,
        rewardAmount,
        hasEngaged.type,
      );

      res.json({
        success: true,
        reward: {
          type: "AD_ENGAGEMENT",
          amount: rewardAmount.toString(),
          postId: data.postId,
        },
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("ClaimReward error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/rewards/history — User's reward history ──────────────────────

const historyQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS", "WITHDRAWAL", "AIRDROP", "SIGNUP_BONUS"]).optional(),
});

export async function getRewardHistory(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit, type } = historyQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const rewards = await prisma.rewardTransaction.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(cursor
          ? {
              createdAt: {
                lt: (await prisma.rewardTransaction.findUnique({ where: { id: cursor } }))?.createdAt,
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
        relatedPost: { select: { id: true, content: true } },
        relatedCampaign: { select: { id: true, title: true } },
      },
    });

    const nextCursor = rewards.length === limit ? rewards[rewards.length - 1]?.id : null;

    res.json({ rewards, nextCursor, hasMore: rewards.length === limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params", details: err.errors });
      return;
    }
    console.error("GetRewardHistory error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/rewards/balance — User's current balance summary ─────────────

export async function getBalance(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        offChainBalance: true,
        totalEarned: true,
        totalWithdrawn: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get pending rewards count
    const pendingCount = await prisma.rewardTransaction.count({
      where: { userId, status: "PENDING" },
    });

    res.json({
      balance: user.offChainBalance.toString(),
      totalEarned: user.totalEarned.toString(),
      totalWithdrawn: user.totalWithdrawn.toString(),
      pendingRewards: pendingCount,
      onChainEnabled: isOnChainEnabled(),
      minWithdrawal: env.MIN_WITHDRAWAL,
      maxWithdrawal: env.MAX_WITHDRAWAL,
    });
  } catch (err) {
    console.error("GetBalance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/rewards/withdraw — Request token withdrawal to wallet ────────

const withdrawSchema = z.object({
  amount: z.coerce.number().positive(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address").optional(),
});

export async function requestWithdrawal(req: Request, res: Response): Promise<void> {
  try {
    const data = withdrawSchema.parse(req.body);
    const userId = req.user!.userId;

    // Fetch user + wallet
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        walletAddress: true,
        offChainBalance: true,
        totalWithdrawn: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Resolve target wallet — request body > stored wallet
    const targetWallet = data.walletAddress ?? user.walletAddress;
    if (!targetWallet) {
      res.status(400).json({ error: "No wallet address found. Please link your wallet first." });
      return;
    }

    // Validate amount limits
    if (data.amount < env.MIN_WITHDRAWAL) {
      res.status(400).json({ error: `Minimum withdrawal is ${env.MIN_WITHDRAWAL} tokens` });
      return;
    }
    if (data.amount > env.MAX_WITHDRAWAL) {
      res.status(400).json({ error: `Maximum withdrawal is ${env.MAX_WITHDRAWAL} tokens` });
      return;
    }

    const balance = user.offChainBalance.toNumber();
    if (data.amount > balance) {
      res.status(400).json({ error: `Insufficient balance. Available: ${balance.toFixed(4)} tokens` });
      return;
    }

    const amountDecimal = new Prisma.Decimal(data.amount);

    // ── Atomic DB update: debit balance + create WITHDRAWAL record ──────────
    const [withdrawalTx] = await prisma.$transaction([
      prisma.rewardTransaction.create({
        data: {
          userId,
          type: "WITHDRAWAL",
          amount: amountDecimal.negated(), // Negative = outflow
          description: `Withdrawal to ${targetWallet.slice(0, 6)}...${targetWallet.slice(-4)}`,
          status: "PENDING",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          offChainBalance: { decrement: amountDecimal },
          totalWithdrawn: { increment: amountDecimal },
        },
      }),
    ]);

    // ── Attempt on-chain transfer ────────────────────────────────────────────
    if (isOnChainEnabled()) {
      try {
        const result = await sendTokens(targetWallet, data.amount.toString());

        // Mark as DISTRIBUTED + store tx hash
        await prisma.rewardTransaction.update({
          where: { id: withdrawalTx.id },
          data: {
            status: "DISTRIBUTED",
            onChainTxHash: result.txHash,
          },
        });

        res.json({
          success: true,
          status: "distributed",
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          amount: data.amount,
          walletAddress: targetWallet,
          message: "Tokens sent on-chain successfully!",
        });
      } catch (chainErr: any) {
        // On-chain failed — refund balance, keep record as FAILED
        await prisma.$transaction([
          prisma.rewardTransaction.update({
            where: { id: withdrawalTx.id },
            data: { status: "FAILED", description: `Failed: ${chainErr.message}` },
          }),
          prisma.user.update({
            where: { id: userId },
            data: {
              offChainBalance: { increment: amountDecimal },
              totalWithdrawn: { decrement: amountDecimal },
            },
          }),
        ]);
        console.error("On-chain transfer failed:", chainErr);
        res.status(502).json({ error: `On-chain transfer failed: ${chainErr.message}` });
      }
    } else {
      // On-chain not configured — mark as CONFIRMED (pending manual batch)
      await prisma.rewardTransaction.update({
        where: { id: withdrawalTx.id },
        data: { status: "CONFIRMED" },
      });

      res.json({
        success: true,
        status: "queued",
        txHash: null,
        explorerUrl: null,
        amount: data.amount,
        walletAddress: targetWallet,
        message: "Withdrawal queued. Tokens will be sent in the next batch distribution.",
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("RequestWithdrawal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/rewards/transactions — Full transaction ledger (earnings + withdrawals) ──

const txQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(["AD_VIEW", "AD_ENGAGEMENT", "REFERRAL_BONUS", "WITHDRAWAL", "AIRDROP", "SIGNUP_BONUS"]).optional(),
});

export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit, type } = txQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const cursorDate = cursor
      ? (await prisma.rewardTransaction.findUnique({ where: { id: cursor } }))?.createdAt
      : undefined;

    const transactions = await prisma.rewardTransaction.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        onChainTxHash: true,
        createdAt: true,
        relatedPost: { select: { id: true, content: true } },
        relatedCampaign: { select: { id: true, title: true } },
      },
    });

    const nextCursor = transactions.length === limit ? transactions[transactions.length - 1]?.id : null;

    res.json({ transactions, nextCursor, hasMore: transactions.length === limit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    console.error("GetTransactions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

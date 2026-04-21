import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import prisma from "../lib/prisma.js";

export const CREATOR_MONTHLY_UPLOAD_CREDITS = 3000;
export const TEST_CREATOR_UPLOAD_CREDITS = 9000;
export const CREATOR_CODE_PERIOD_DAYS = 30;
export const CREATOR_ACCESS_TIERS = ["CREATOR", "PRO", "PREMIUM"] as const;

export type EffectiveSubscriptionTier = "FREE" | "PRO" | "PREMIUM";

type SubscriptionTx = Prisma.TransactionClient;

type SubscriptionEntitlementRecord = {
  id: string;
  userId: string;
  tier: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  creditsGrantedThrough: Date | null;
};

type CreatorCodeSubscriptionRecord = SubscriptionEntitlementRecord & {
  createdAt: Date;
};

const LEGACY_CREATOR_TIERS = new Set(CREATOR_ACCESS_TIERS);

export function isCreatorAccessForced(): boolean {
  return env.FORCE_CREATOR_ACCESS;
}

export function getEffectiveSubscriptionTier(tier: string | null | undefined): EffectiveSubscriptionTier {
  if (isCreatorAccessForced()) return "PRO";
  return normalizeSubscriptionTier(tier);
}

export function getEffectiveUploadCredits(uploadCredits: number | null | undefined): number {
  const currentCredits = Number(uploadCredits ?? 0);
  if (isCreatorAccessForced()) {
    return Math.max(currentCredits, TEST_CREATOR_UPLOAD_CREDITS);
  }
  return currentCredits;
}

export function hasCreatorTier(tier: string | null | undefined): boolean {
  return getSubscriptionTierRank(getEffectiveSubscriptionTier(tier)) >= getSubscriptionTierRank("PRO");
}

export function getSubscriptionTierRank(tier: string | null | undefined): number {
  const normalized = normalizeSubscriptionTier(tier);
  if (normalized === "PREMIUM") return 2;
  if (normalized === "PRO") return 1;
  return 0;
}

export function normalizeSubscriptionTier(tier: string | null | undefined): EffectiveSubscriptionTier {
  if (!tier) return "FREE";
  if (tier === "PREMIUM") return "PREMIUM";
  if (LEGACY_CREATOR_TIERS.has(tier)) return "PRO";
  return "FREE";
}

export function normalizeCreatorCodeValue(code: string): string {
  return code.trim().toUpperCase();
}

export function generateCreatorCodeValue(length = 12): string {
  return crypto
    .randomBytes(Math.max(length, 12))
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, length);
}

export function getCreatorCodePeriodEnd(periodStart: Date): Date {
  return new Date(periodStart.getTime() + CREATOR_CODE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
}

function getCreatorCodeSubscriptionWindow(
  subscription: CreatorCodeSubscriptionRecord,
  now: Date,
): { currentPeriodStart: Date; currentPeriodEnd: Date; changed: boolean } {
  let currentPeriodStart = subscription.currentPeriodStart ?? subscription.createdAt;
  let currentPeriodEnd = subscription.currentPeriodEnd ?? getCreatorCodePeriodEnd(currentPeriodStart);
  let changed = !subscription.currentPeriodStart || !subscription.currentPeriodEnd;

  while (currentPeriodEnd.getTime() <= now.getTime()) {
    currentPeriodStart = currentPeriodEnd;
    currentPeriodEnd = getCreatorCodePeriodEnd(currentPeriodEnd);
    changed = true;
  }

  return { currentPeriodStart, currentPeriodEnd, changed };
}

export async function refreshCreatorCodeEntitlementsForUser(userId: string, now = new Date()): Promise<void> {
  if (isCreatorAccessForced()) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const subscriptions = await tx.subscription.findMany({
      where: {
        userId,
        status: "ACTIVE",
        paymentMethod: "CREATOR_CODE" as any,
        tier: { in: [...CREATOR_ACCESS_TIERS] as any },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        tier: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        creditsGrantedThrough: true,
        createdAt: true,
      },
    } as any) as CreatorCodeSubscriptionRecord[];

    for (const subscription of subscriptions) {
      const nextWindow = getCreatorCodeSubscriptionWindow(subscription, now);
      let currentSubscription = subscription;

      if (nextWindow.changed) {
        currentSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: nextWindow.currentPeriodStart,
            currentPeriodEnd: nextWindow.currentPeriodEnd,
            cancelAtPeriodEnd: false,
          },
          select: {
            id: true,
            userId: true,
            tier: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            creditsGrantedThrough: true,
            createdAt: true,
          },
        } as any) as CreatorCodeSubscriptionRecord;
      }

      await applyActiveSubscriptionEntitlements(tx, currentSubscription);
    }

    if (subscriptions.length > 0) {
      await syncUserSubscriptionTier(tx, userId);
    }
  });
}

export async function applyActiveSubscriptionEntitlements(
  tx: SubscriptionTx,
  subscription: SubscriptionEntitlementRecord,
): Promise<{ normalizedTier: EffectiveSubscriptionTier; creditsGranted: number }> {
  const normalizedTier = normalizeSubscriptionTier(subscription.tier);

  if (normalizedTier === "FREE" || subscription.status !== "ACTIVE") {
    await syncUserSubscriptionTier(tx, subscription.userId);
    return { normalizedTier, creditsGranted: 0 };
  }

  const currentBoundary = subscription.currentPeriodEnd ?? subscription.currentPeriodStart;
  const alreadyGrantedThrough = subscription.creditsGrantedThrough;
  const shouldGrantCredits = Boolean(
    currentBoundary && (!alreadyGrantedThrough || currentBoundary.getTime() > alreadyGrantedThrough.getTime()),
  );

  const userData: Prisma.UserUpdateInput = { subscriptionTier: normalizedTier };
  if (shouldGrantCredits) {
    userData.uploadCredits = { increment: CREATOR_MONTHLY_UPLOAD_CREDITS };
  }

  await tx.user.update({
    where: { id: subscription.userId },
    data: userData,
  });

  if (shouldGrantCredits && currentBoundary) {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: { creditsGrantedThrough: currentBoundary },
    });
  }

  return {
    normalizedTier,
    creditsGranted: shouldGrantCredits ? CREATOR_MONTHLY_UPLOAD_CREDITS : 0,
  };
}

export async function syncUserSubscriptionTier(tx: SubscriptionTx, userId: string): Promise<EffectiveSubscriptionTier> {
  if (isCreatorAccessForced()) {
    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: "PRO",
        uploadCredits: { set: TEST_CREATOR_UPLOAD_CREDITS },
      },
    });
    return "PRO";
  }

  const activeCreatorSubscriptions = await tx.subscription.findMany({
    where: {
      userId,
      status: "ACTIVE",
      tier: { in: [...CREATOR_ACCESS_TIERS] as any },
    },
    select: { tier: true },
  });

  const nextTier = activeCreatorSubscriptions.reduce<EffectiveSubscriptionTier>(
    (highestTier, subscription) => {
      const candidateTier = normalizeSubscriptionTier(subscription.tier);
      return getSubscriptionTierRank(candidateTier) > getSubscriptionTierRank(highestTier)
        ? candidateTier
        : highestTier;
    },
    "FREE",
  );

  await tx.user.update({
    where: { id: userId },
    data: { subscriptionTier: nextTier },
  });

  return nextTier;
}
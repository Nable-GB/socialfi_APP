import type { Prisma } from "@prisma/client";
import { env } from "../config/env.js";

export const CREATOR_MONTHLY_UPLOAD_CREDITS = 3000;
export const TEST_CREATOR_UPLOAD_CREDITS = 9000;

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

const LEGACY_CREATOR_TIERS = new Set(["CREATOR", "PRO", "PREMIUM"]);

export function isCreatorAccessForced(): boolean {
  return env.FORCE_CREATOR_ACCESS || env.DEMO_MODE;
}

export function getEffectiveSubscriptionTier(tier: string | null | undefined): "CREATOR" | "FREE" {
  if (isCreatorAccessForced()) return "CREATOR";
  return normalizeCreatorTier(tier);
}

export function getEffectiveUploadCredits(uploadCredits: number | null | undefined): number {
  const currentCredits = Number(uploadCredits ?? 0);
  if (isCreatorAccessForced()) {
    return Math.max(currentCredits, TEST_CREATOR_UPLOAD_CREDITS);
  }
  return currentCredits;
}

export function hasCreatorTier(tier: string | null | undefined): boolean {
  return getEffectiveSubscriptionTier(tier) === "CREATOR";
}

export function normalizeCreatorTier(tier: string | null | undefined): "CREATOR" | "FREE" {
  return tier && LEGACY_CREATOR_TIERS.has(tier) ? "CREATOR" : "FREE";
}

export async function applyActiveSubscriptionEntitlements(
  tx: SubscriptionTx,
  subscription: SubscriptionEntitlementRecord,
): Promise<{ normalizedTier: "CREATOR" | "FREE"; creditsGranted: number }> {
  const normalizedTier = normalizeCreatorTier(subscription.tier);

  if (normalizedTier !== "CREATOR" || subscription.status !== "ACTIVE") {
    await syncUserSubscriptionTier(tx, subscription.userId);
    return { normalizedTier, creditsGranted: 0 };
  }

  const currentBoundary = subscription.currentPeriodEnd ?? subscription.currentPeriodStart;
  const alreadyGrantedThrough = subscription.creditsGrantedThrough;
  const shouldGrantCredits = Boolean(
    currentBoundary && (!alreadyGrantedThrough || currentBoundary.getTime() > alreadyGrantedThrough.getTime()),
  );

  const userData: Prisma.UserUpdateInput = { subscriptionTier: "CREATOR" };
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

export async function syncUserSubscriptionTier(tx: SubscriptionTx, userId: string): Promise<"CREATOR" | "FREE"> {
  if (isCreatorAccessForced()) {
    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: "CREATOR",
        uploadCredits: { set: TEST_CREATOR_UPLOAD_CREDITS },
      },
    });
    return "CREATOR";
  }

  const activeCreatorSubscription = await tx.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      tier: { in: ["CREATOR", "PRO", "PREMIUM"] as any },
    },
    select: { id: true },
  });

  const nextTier = activeCreatorSubscription ? "CREATOR" : "FREE";
  await tx.user.update({
    where: { id: userId },
    data: { subscriptionTier: nextTier },
  });

  return nextTier;
}
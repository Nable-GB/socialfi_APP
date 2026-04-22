import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthProvider, PrismaClient, UserRole } from "@prisma/client";

const BASE_URL = (process.env.SMOKE_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "admin@socialfi.app";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "Password123!";
const prisma = new PrismaClient();

type JsonRecord = Record<string, any>;

async function request<T = any>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(`${init.method || "GET"} ${path} failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }

  return body as T;
}

async function login(email: string, password: string) {
  return request<{ token: string; user: JsonRecord }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

async function registerTempUser() {
  const unique = Date.now().toString(36);
  const email = `smoke-${unique}@example.com`;
  const username = `smoke_${unique}`;
  const password = "Password123!";

  const result = await request<{ token: string; user: JsonRecord }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      username,
      displayName: `Smoke ${unique}`,
    }),
  });

  return { ...result, email, password };
}

async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      authProvider: AuthProvider.EMAIL,
      displayName: "SocialFi Admin",
      isVerified: true,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      username: "admin",
      displayName: "SocialFi Admin",
      role: UserRole.ADMIN,
      authProvider: AuthProvider.EMAIL,
      referralCode: `ADMIN-${Date.now().toString(36)}`,
      isVerified: true,
    },
  });
}

async function main() {
  console.log(`Running admin smoke flows against ${BASE_URL}`);

  await ensureAdminUser();

  const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log(`Logged in as admin: ${admin.user.email}`);

  const tempUser = await registerTempUser();
  console.log(`Registered temp user: ${tempUser.email}`);

  const creatorCodeUser = await registerTempUser();
  console.log(`Registered creator-code user: ${creatorCodeUser.email}`);

  const creatorCodeValue = `SMOKE-${Date.now().toString(36).toUpperCase()}`;
  const createdCreatorCode = await request<{ success: boolean; creatorCode: JsonRecord }>("/api/admin/creator-codes", {
    method: "POST",
    body: JSON.stringify({
      code: creatorCodeValue,
      notes: "Smoke test Creator code",
    }),
  }, admin.token);
  if (!createdCreatorCode.success || createdCreatorCode.creatorCode?.code !== creatorCodeValue) {
    throw new Error(`Failed to create Creator code: ${JSON.stringify(createdCreatorCode)}`);
  }
  console.log(`Created Creator code: ${creatorCodeValue}`);

  const redemption = await request<{ success: boolean; code: string; creditsGranted: number; subscription: JsonRecord }>("/api/subscriptions/redeem-code", {
    method: "POST",
    body: JSON.stringify({ code: creatorCodeValue }),
  }, creatorCodeUser.token);
  if (!redemption.success || redemption.code !== creatorCodeValue || redemption.creditsGranted !== 3000 || redemption.subscription?.paymentMethod !== "CREATOR_CODE") {
    throw new Error(`Unexpected Creator code redemption result: ${JSON.stringify(redemption)}`);
  }
  console.log(`Redeemed Creator code and granted legacy entitlement value ${redemption.creditsGranted}`);

  const creatorCodeSubscriptionState = await request<{ tier: string; subscription: JsonRecord | null; pendingReview: JsonRecord | null }>("/api/subscriptions/me", {}, creatorCodeUser.token);
  if (creatorCodeSubscriptionState.tier !== "PRO" || creatorCodeSubscriptionState.subscription?.paymentMethod !== "CREATOR_CODE") {
    throw new Error(`Creator code subscription state not updated correctly: ${JSON.stringify(creatorCodeSubscriptionState)}`);
  }
  console.log("Creator code user moved to PRO tier via complimentary access");

  const creatorCodeQueue = await request<{ codes: Array<JsonRecord> }>(`/api/admin/creator-codes?search=${encodeURIComponent(creatorCodeValue)}`, {}, admin.token);
  const matchingCode = creatorCodeQueue.codes.find((code) => code.code === creatorCodeValue);
  const creatorCodeRedemption = matchingCode?.redemptions?.find((entry: JsonRecord) => entry.user?.id === creatorCodeUser.user.id);
  if (!matchingCode || !creatorCodeRedemption?.id) {
    throw new Error(`Creator code redemption ${creatorCodeValue} not found in admin list`);
  }
  console.log("Creator code redemption is visible in the admin list");

  const revokedRedemption = await request<{ success: boolean; tier: string }>(`/api/admin/creator-code-redemptions/${creatorCodeRedemption.id}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason: "Smoke test revoke" }),
  }, admin.token);
  if (!revokedRedemption.success || revokedRedemption.tier !== "FREE") {
    throw new Error(`Unexpected Creator code revoke result: ${JSON.stringify(revokedRedemption)}`);
  }
  console.log("Revoked complimentary Creator access and downgraded the user to FREE");

  const creatorCodeRevokedState = await request<{ tier: string; subscription: JsonRecord | null; pendingReview: JsonRecord | null }>("/api/subscriptions/me", {}, creatorCodeUser.token);
  if (creatorCodeRevokedState.tier !== "FREE") {
    throw new Error(`Creator code revocation not reflected in subscription state: ${JSON.stringify(creatorCodeRevokedState)}`);
  }
  console.log("Creator code revocation is reflected in the user subscription state");

  const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
  const walletAddress = `0x${crypto.randomBytes(20).toString("hex")}`;

  const usdtSubmission = await request<{ subscriptionId: string; status: string }>("/api/subscriptions/checkout-usdt", {
    method: "POST",
    body: JSON.stringify({ txHash, walletAddress }),
  }, tempUser.token);
  console.log(`Created pending USDT subscription: ${usdtSubmission.subscriptionId}`);

  const pendingQueue = await request<{ subscriptions: Array<JsonRecord> }>("/api/admin/subscriptions/usdt-pending", {}, admin.token);
  const pendingItem = pendingQueue.subscriptions.find((subscription) => subscription.id === usdtSubmission.subscriptionId);
  if (!pendingItem) {
    throw new Error(`Pending USDT subscription ${usdtSubmission.subscriptionId} not found in admin queue`);
  }
  console.log(`Pending queue contains the submitted USDT request`);

  const approval = await request<{ success: boolean; creditsGranted: number }>(`/api/admin/subscriptions/${usdtSubmission.subscriptionId}/approve-usdt`, {
    method: "POST",
    body: JSON.stringify({ notes: "Smoke test approval" }),
  }, admin.token);
  if (!approval.success || approval.creditsGranted !== 3000) {
    throw new Error(`Unexpected approval result: ${JSON.stringify(approval)}`);
  }
  console.log(`Approved USDT subscription and granted legacy entitlement value ${approval.creditsGranted}`);

  const subscriptionState = await request<{ tier: string; subscription: JsonRecord | null; pendingReview: JsonRecord | null }>("/api/subscriptions/me", {}, tempUser.token);
  if (subscriptionState.tier !== "PRO" || subscriptionState.pendingReview !== null) {
    throw new Error(`Subscription state not updated correctly: ${JSON.stringify(subscriptionState)}`);
  }
  console.log(`User subscription moved to PRO and pending review cleared`);

  const trackTitle = `Smoke Flow ${Date.now().toString(36)}`;
  const createdTrack = await request<{ success: boolean; track: JsonRecord }>("/api/music/tracks", {
    method: "POST",
    body: JSON.stringify({
      title: trackTitle,
      description: "Smoke-test payout track",
      audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      coverUrl: `https://picsum.photos/seed/${Date.now()}/640/640`,
      genre: "POP",
      status: "PUBLISHED",
    }),
  }, tempUser.token);
  if (!createdTrack.success || !createdTrack.track?.id) {
    throw new Error(`Failed to create smoke test track: ${JSON.stringify(createdTrack)}`);
  }
  console.log(`Created payout smoke test track ${createdTrack.track.id} (${trackTitle})`);

  const payout = await request<{ success: boolean; release: JsonRecord }>("/api/admin/payout-releases", {
    method: "POST",
    body: JSON.stringify({ trackId: createdTrack.track.id, totalRevenue: 42.5 }),
  }, admin.token);
  if (!payout.success || !payout.release?.id) {
    throw new Error(`Failed to create payout release: ${JSON.stringify(payout)}`);
  }
  console.log(`Created payout release ${payout.release.id}`);

  const payoutRelease = await request<{ success: boolean; releaseId: string }>(`/api/admin/payout-releases/${payout.release.id}/release`, {
    method: "POST",
    body: JSON.stringify({ notes: "Smoke test payout release" }),
  }, admin.token);
  if (!payoutRelease.success || payoutRelease.releaseId !== payout.release.id) {
    throw new Error(`Failed to release payout: ${JSON.stringify(payoutRelease)}`);
  }
  console.log(`Released payout ${payoutRelease.releaseId}`);

  console.log("Admin smoke flows completed successfully");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
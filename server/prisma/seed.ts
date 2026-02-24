import { PrismaClient, UserRole, AuthProvider } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Ad Packages ───────────────────────────────────────────────────────
  console.log("  Creating Ad Packages...");
  const starter = await prisma.adPackage.upsert({
    where: { id: "pkg-starter" },
    update: {},
    create: {
      id: "pkg-starter",
      name: "Starter",
      description: "Perfect for small businesses testing the platform.",
      priceFiat: 49.0,
      priceCrypto: 49.0,
      impressions: 5000,
      durationDays: 7,
      maxPosts: 1,
      totalRewardPool: 500,
      sortOrder: 1,
    },
  });

  const growth = await prisma.adPackage.upsert({
    where: { id: "pkg-growth" },
    update: {},
    create: {
      id: "pkg-growth",
      name: "Growth",
      description: "Best value for growing brands.",
      priceFiat: 149.0,
      priceCrypto: 149.0,
      impressions: 20000,
      durationDays: 14,
      maxPosts: 3,
      totalRewardPool: 2000,
      sortOrder: 2,
    },
  });

  const enterprise = await prisma.adPackage.upsert({
    where: { id: "pkg-enterprise" },
    update: {},
    create: {
      id: "pkg-enterprise",
      name: "Enterprise",
      description: "Maximum reach for serious advertisers.",
      priceFiat: 499.0,
      priceCrypto: 499.0,
      impressions: 100000,
      durationDays: 30,
      maxPosts: 10,
      totalRewardPool: 10000,
      sortOrder: 3,
    },
  });

  console.log("  ✅ Ad Packages created:", starter.name, growth.name, enterprise.name);

  // ── 2. Users ─────────────────────────────────────────────────────────────
  console.log("  Creating Users...");
  const password = await bcrypt.hash("Password123!", 12);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@socialfi.app" },
    update: {},
    create: {
      email: "admin@socialfi.app",
      passwordHash: password,
      username: "admin",
      displayName: "SocialFi Admin",
      role: UserRole.ADMIN,
      authProvider: AuthProvider.EMAIL,
      referralCode: "ADMIN001",
      isVerified: true,
    },
  });

  // Regular user (Alice)
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      passwordHash: password,
      username: "alice_web3",
      displayName: "Alice",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "ALICE001",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice",
      bio: "Web3 enthusiast | NFT collector 🎨",
    },
  });

  // Regular user (Bob) — referred by Alice
  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      passwordHash: password,
      username: "bob_crypto",
      displayName: "Bob",
      role: UserRole.USER,
      authProvider: AuthProvider.EMAIL,
      referralCode: "BOB0001",
      referredById: alice.id,
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob",
      bio: "DeFi degen 🚀",
    },
  });

  // Merchant user
  const merchant = await prisma.user.upsert({
    where: { email: "merchant@nftstore.io" },
    update: {},
    create: {
      email: "merchant@nftstore.io",
      passwordHash: password,
      username: "nft_store",
      displayName: "NFT Store Official",
      role: UserRole.MERCHANT,
      authProvider: AuthProvider.EMAIL,
      referralCode: "MERCH01",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=merchant",
      bio: "Premium NFT marketplace | Best collections",
      isVerified: true,
    },
  });

  console.log("  ✅ Users created:", admin.username, alice.username, bob.username, merchant.username);

  // ── 3. Follow Relationships ───────────────────────────────────────────────
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: alice.id, followingId: bob.id } },
    update: {},
    create: { followerId: alice.id, followingId: bob.id },
  });
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: bob.id, followingId: alice.id } },
    update: {},
    create: { followerId: bob.id, followingId: alice.id },
  });

  console.log("  ✅ Follow relationships created");

  // ── 4. Organic Posts ──────────────────────────────────────────────────────
  console.log("  Creating Posts...");
  const post1 = await prisma.socialPost.create({
    data: {
      authorId: alice.id,
      content: "Just minted my first NFT on this platform! The community is amazing 🎉 #NFT #Web3 #SocialFi",
      type: "ORGANIC",
      likesCount: 12,
      commentsCount: 3,
    },
  });

  const post2 = await prisma.socialPost.create({
    data: {
      authorId: bob.id,
      content: "Earned my first 50 tokens just by engaging with the feed today. This Engage-to-Earn model is legit! 🪙",
      type: "ORGANIC",
      likesCount: 8,
      commentsCount: 1,
    },
  });

  const post3 = await prisma.socialPost.create({
    data: {
      authorId: alice.id,
      content: "Web3 is not just about money — it's about ownership of your data and digital identity. Who else believes this? 💪",
      type: "ORGANIC",
      likesCount: 24,
      commentsCount: 7,
      sharesCount: 3,
    },
  });

  console.log("  ✅ Organic posts created");

  // ── 5. Active Ad Campaign + Sponsored Post ────────────────────────────────
  console.log("  Creating Ad Campaign...");
  const campaign = await prisma.adCampaign.create({
    data: {
      merchantId: merchant.id,
      adPackageId: growth.id,
      title: "🔥 Exclusive NFT Drop — Limited Edition Collection",
      description: "Discover our hand-crafted NFT collection. Only 500 pieces available. Early supporters get 20% bonus rewards!",
      targetUrl: "https://nftstore.io/collection/exclusive",
      paymentMethod: "FIAT_STRIPE",
      paymentStatus: "COMPLETED",
      amountPaid: 149.0,
      stripePaymentId: "pi_test_seed_001",
      stripeSessionId: "cs_test_seed_001",
      impressionsTotal: 20000,
      impressionsDelivered: 1240,
      rewardPoolTotal: 2000,
      rewardPoolDistributed: 124,
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // Sponsored post tied to the campaign
  await prisma.socialPost.create({
    data: {
      authorId: merchant.id,
      content: "🔥 SPONSORED | Exclusive NFT Drop — Limited Edition Collection!\n\nDiscover our hand-crafted NFT collection. Only 500 pieces available.\n\n✅ Early supporters get 20% bonus rewards!\n👉 Tap to learn more and earn tokens for watching.",
      type: "SPONSORED",
      adCampaignId: campaign.id,
      rewardPerView: 0.05,
      rewardPerEngagement: 0.1,
      viewsCount: 1240,
      likesCount: 89,
    },
  });

  console.log("  ✅ Ad Campaign + Sponsored Post created");

  // ── 6. Sample Reward Transactions ─────────────────────────────────────────
  console.log("  Creating Reward Transactions...");
  await prisma.rewardTransaction.create({
    data: {
      userId: alice.id,
      type: "SIGNUP_BONUS",
      amount: 10.0,
      description: "Welcome bonus for joining SocialFi",
      status: "DISTRIBUTED",
    },
  });

  await prisma.rewardTransaction.create({
    data: {
      userId: bob.id,
      type: "SIGNUP_BONUS",
      amount: 10.0,
      description: "Welcome bonus for joining SocialFi",
      status: "DISTRIBUTED",
    },
  });

  // Alice earned referral bonus from Bob's signup activity
  await prisma.rewardTransaction.create({
    data: {
      userId: alice.id,
      type: "REFERRAL_BONUS",
      amount: 0.5,
      description: "Affiliate bonus from referred user's activity",
      sourceUserId: bob.id,
      referralRate: 0.05,
      status: "PENDING",
    },
  });

  // Update user balances to match seed data
  await prisma.user.update({
    where: { id: alice.id },
    data: { offChainBalance: 10.5, totalEarned: 10.5 },
  });
  await prisma.user.update({
    where: { id: bob.id },
    data: { offChainBalance: 10.0, totalEarned: 10.0 },
  });

  console.log("  ✅ Reward Transactions created");

  console.log("\n✅ Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Test credentials (all passwords: Password123!)");
  console.log("  Admin:    admin@socialfi.app");
  console.log("  User:     alice@example.com");
  console.log("  User:     bob@example.com");
  console.log("  Merchant: merchant@nftstore.io");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

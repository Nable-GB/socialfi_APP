-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MERCHANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'WALLET', 'GOOGLE');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('ORGANIC', 'SPONSORED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO', 'GIF', 'NONE');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('LIKE', 'COMMENT', 'SHARE', 'VIEW', 'BOOKMARK');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('FIAT_STRIPE', 'CRYPTO_USDT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('AD_VIEW', 'AD_ENGAGEMENT', 'REFERRAL_BONUS', 'WITHDRAWAL', 'AIRDROP', 'SIGNUP_BONUS');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISTRIBUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "walletAddress" TEXT,
    "nonce" TEXT,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "offChainBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "MediaType" NOT NULL DEFAULT 'NONE',
    "type" "PostType" NOT NULL DEFAULT 'ORGANIC',
    "adCampaignId" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "bookmarksCount" INTEGER NOT NULL DEFAULT 0,
    "rewardPerView" DECIMAL(20,8),
    "rewardPerEngagement" DECIMAL(20,8),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "commentText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceFiat" DECIMAL(10,2) NOT NULL,
    "priceCrypto" DECIMAL(20,8) NOT NULL,
    "impressions" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "maxPosts" INTEGER NOT NULL DEFAULT 1,
    "totalRewardPool" DECIMAL(20,8) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "adPackageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetUrl" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountPaid" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "cryptoTxHash" TEXT,
    "cryptoFromAddress" TEXT,
    "impressionsTotal" INTEGER NOT NULL DEFAULT 0,
    "impressionsDelivered" INTEGER NOT NULL DEFAULT 0,
    "rewardPoolTotal" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "rewardPoolDistributed" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RewardType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "description" TEXT,
    "relatedPostId" TEXT,
    "relatedCampaignId" TEXT,
    "sourceUserId" TEXT,
    "referralRate" DECIMAL(5,4),
    "status" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "distributionBatchId" TEXT,
    "onChainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_batches" (
    "id" TEXT NOT NULL,
    "txHash" TEXT,
    "contractAddress" TEXT,
    "chainId" INTEGER,
    "totalAmount" DECIMAL(20,8) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "distribution_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_walletAddress_idx" ON "users"("walletAddress");

-- CreateIndex
CREATE INDEX "users_referralCode_idx" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_referredById_idx" ON "users"("referredById");

-- CreateIndex
CREATE INDEX "social_posts_authorId_idx" ON "social_posts"("authorId");

-- CreateIndex
CREATE INDEX "social_posts_type_idx" ON "social_posts"("type");

-- CreateIndex
CREATE INDEX "social_posts_adCampaignId_idx" ON "social_posts"("adCampaignId");

-- CreateIndex
CREATE INDEX "social_posts_createdAt_idx" ON "social_posts"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "post_interactions_postId_type_idx" ON "post_interactions"("postId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "post_interactions_userId_postId_type_key" ON "post_interactions"("userId", "postId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_stripeSessionId_key" ON "ad_campaigns"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_stripePaymentId_key" ON "ad_campaigns"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_cryptoTxHash_key" ON "ad_campaigns"("cryptoTxHash");

-- CreateIndex
CREATE INDEX "ad_campaigns_merchantId_idx" ON "ad_campaigns"("merchantId");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- CreateIndex
CREATE INDEX "ad_campaigns_paymentStatus_idx" ON "ad_campaigns"("paymentStatus");

-- CreateIndex
CREATE INDEX "reward_transactions_userId_type_idx" ON "reward_transactions"("userId", "type");

-- CreateIndex
CREATE INDEX "reward_transactions_userId_status_idx" ON "reward_transactions"("userId", "status");

-- CreateIndex
CREATE INDEX "reward_transactions_relatedCampaignId_idx" ON "reward_transactions"("relatedCampaignId");

-- CreateIndex
CREATE INDEX "reward_transactions_distributionBatchId_idx" ON "reward_transactions"("distributionBatchId");

-- CreateIndex
CREATE INDEX "reward_transactions_createdAt_idx" ON "reward_transactions"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_batches_txHash_key" ON "distribution_batches"("txHash");

-- CreateIndex
CREATE INDEX "distribution_batches_status_idx" ON "distribution_batches"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_adCampaignId_fkey" FOREIGN KEY ("adCampaignId") REFERENCES "ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_interactions" ADD CONSTRAINT "post_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_interactions" ADD CONSTRAINT "post_interactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_adPackageId_fkey" FOREIGN KEY ("adPackageId") REFERENCES "ad_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_relatedPostId_fkey" FOREIGN KEY ("relatedPostId") REFERENCES "social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_relatedCampaignId_fkey" FOREIGN KEY ("relatedCampaignId") REFERENCES "ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_distributionBatchId_fkey" FOREIGN KEY ("distributionBatchId") REFERENCES "distribution_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

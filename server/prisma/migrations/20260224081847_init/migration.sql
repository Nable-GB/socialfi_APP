-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('EMAIL', 'WALLET', 'GOOGLE');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."BoostTier" AS ENUM ('BASIC', 'PREMIUM', 'SUPER');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DistributionPlatform" AS ENUM ('YOUTUBE_MUSIC', 'SPOTIFY', 'APPLE_MUSIC', 'AMAZON_MUSIC', 'TIDAL', 'DEEZER');

-- CreateEnum
CREATE TYPE "public"."DistributionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'LIVE', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "public"."InteractionType" AS ENUM ('LIKE', 'COMMENT', 'SHARE', 'VIEW', 'BOOKMARK');

-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MediaType" AS ENUM ('IMAGE', 'VIDEO', 'GIF', 'NONE');

-- CreateEnum
CREATE TYPE "public"."MusicGenre" AS ENUM ('POP', 'HIPHOP', 'RNB', 'EDM', 'ROCK', 'JAZZ', 'CLASSICAL', 'LOFI', 'AMBIENT', 'EXPERIMENTAL', 'WORLD', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."NftRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('FOLLOW', 'LIKE', 'COMMENT', 'REWARD_EARNED', 'WITHDRAWAL_DONE', 'AIRDROP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('FIAT_STRIPE', 'CRYPTO_USDT');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."PostType" AS ENUM ('ORGANIC', 'SPONSORED');

-- CreateEnum
CREATE TYPE "public"."RewardStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISTRIBUTED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."RewardType" AS ENUM ('AD_VIEW', 'AD_ENGAGEMENT', 'REFERRAL_BONUS', 'WITHDRAWAL', 'AIRDROP', 'SIGNUP_BONUS');

-- CreateEnum
CREATE TYPE "public"."ServicePurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('BOOST_POST', 'PREMIUM_BADGE', 'ANALYTICS_PRO', 'VERIFIED_BADGE', 'EXTRA_STORAGE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."TrackStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'REVIEW', 'RELEASE_CANDIDATE');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'MERCHANT', 'ADMIN');

-- CreateTable
CREATE TABLE "public"."ad_campaigns" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "adPackageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetUrl" TEXT,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountPaid" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "cryptoTxHash" TEXT,
    "cryptoFromAddress" TEXT,
    "impressionsTotal" INTEGER NOT NULL DEFAULT 0,
    "impressionsDelivered" INTEGER NOT NULL DEFAULT 0,
    "rewardPoolTotal" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "rewardPoolDistributed" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "targetAgeMax" INTEGER,
    "targetAgeMin" INTEGER,
    "targetGender" TEXT,
    "targetInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetLocation" TEXT,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ad_packages" (
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
CREATE TABLE "public"."albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "genre" "public"."MusicGenre" NOT NULL DEFAULT 'OTHER',
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."distribution_batches" (
    "id" TEXT NOT NULL,
    "txHash" TEXT,
    "contractAddress" TEXT,
    "chainId" INTEGER,
    "totalAmount" DECIMAL(20,8) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "distribution_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."distribution_submissions" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "platform" "public"."DistributionPlatform" NOT NULL,
    "status" "public"."DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "submittedById" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "liveAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."engagement_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "validActions" INTEGER NOT NULL DEFAULT 0,
    "spamActions" INTEGER NOT NULL DEFAULT 0,
    "lastActionAt" TIMESTAMP(3),
    "dailyActionCount" INTEGER NOT NULL DEFAULT 0,
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "engagement_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."music_boosts" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "boosterId" TEXT NOT NULL,
    "tier" "public"."BoostTier" NOT NULL DEFAULT 'BASIC',
    "tokensCost" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "rewardEarned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."music_nft_holders" (
    "id" TEXT NOT NULL,
    "musicNftId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fractions" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalRoyaltyReceived" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "isStaked" BOOLEAN NOT NULL DEFAULT false,
    "stakedAt" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_nft_holders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."music_nfts" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "totalSupply" INTEGER NOT NULL DEFAULT 100,
    "availableSupply" INTEGER NOT NULL DEFAULT 100,
    "pricePerFraction" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "royaltyPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "totalStreamingRevenue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalRoyaltyPaid" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "contractAddress" TEXT,
    "tokenId" TEXT,
    "chainId" INTEGER,
    "isMinted" BOOLEAN NOT NULL DEFAULT false,
    "isListed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_nfts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nft_listings" (
    "id" TEXT NOT NULL,
    "nftId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "price" DECIMAL(20,8) NOT NULL,
    "status" "public"."ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "nft_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."nfts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "minterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "collection" TEXT NOT NULL DEFAULT 'SocialFi Genesis',
    "rarity" "public"."NftRarity" NOT NULL DEFAULT 'COMMON',
    "attributes" JSONB,
    "tokenId" TEXT,
    "contractAddress" TEXT,
    "chainId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedPostId" TEXT,
    "relatedUserId" TEXT,
    "relatedTxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."paid_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ServiceType" NOT NULL,
    "priceUsd" DECIMAL(10,2) NOT NULL,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "durationDays" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paid_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "public"."InteractionType" NOT NULL,
    "commentText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."release_votes" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "voteType" TEXT NOT NULL DEFAULT 'RELEASE',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "release_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reward_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."RewardType" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "description" TEXT,
    "relatedPostId" TEXT,
    "relatedCampaignId" TEXT,
    "sourceUserId" TEXT,
    "referralRate" DECIMAL(5,4),
    "status" "public"."RewardStatus" NOT NULL DEFAULT 'PENDING',
    "distributionBatchId" TEXT,
    "onChainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."royalty_payouts" (
    "id" TEXT NOT NULL,
    "musicNftId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "fractionsHeld" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "royalty_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "stripeSessionId" TEXT,
    "status" "public"."ServicePurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."social_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" "public"."MediaType" NOT NULL DEFAULT 'NONE',
    "type" "public"."PostType" NOT NULL DEFAULT 'ORGANIC',
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
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "public"."SubscriptionTier" NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."track_comments" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestampSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."track_likes" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."track_plays" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "listenerId" TEXT,
    "durationPlayed" INTEGER,
    "completedFull" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."track_reposts" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "rewardEarned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "engagementCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "track_reposts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tracks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "genre" "public"."MusicGenre" NOT NULL DEFAULT 'OTHER',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bpm" INTEGER,
    "key" TEXT,
    "duration" INTEGER,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "aiModel" TEXT,
    "aiPrompt" TEXT,
    "audioUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "waveformData" TEXT,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."TrackStatus" NOT NULL DEFAULT 'DRAFT',
    "artistId" TEXT NOT NULL,
    "albumId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "boostCount" INTEGER NOT NULL DEFAULT 0,
    "engagementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moodTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previewEnd" INTEGER,
    "previewStart" INTEGER,
    "previewUrl" TEXT,
    "repostCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "lyrics" TEXT,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "authProvider" "public"."AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "walletAddress" TEXT,
    "nonce" TEXT,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "offChainBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyExpiresAt" TIMESTAMP(3),
    "emailVerifyToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "birthYear" INTEGER,
    "gender" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "location" TEXT,
    "subscriptionTier" "public"."SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "uploadCredits" INTEGER NOT NULL DEFAULT 3000,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."youtube_distributions" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "status" "public"."DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "youtubeVideoId" TEXT,
    "youtubeUrl" TEXT,
    "submittedAt" TIMESTAMP(3),
    "liveAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_cryptoTxHash_key" ON "public"."ad_campaigns"("cryptoTxHash" ASC);

-- CreateIndex
CREATE INDEX "ad_campaigns_merchantId_idx" ON "public"."ad_campaigns"("merchantId" ASC);

-- CreateIndex
CREATE INDEX "ad_campaigns_paymentStatus_idx" ON "public"."ad_campaigns"("paymentStatus" ASC);

-- CreateIndex
CREATE INDEX "ad_campaigns_status_idx" ON "public"."ad_campaigns"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_stripePaymentId_key" ON "public"."ad_campaigns"("stripePaymentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ad_campaigns_stripeSessionId_key" ON "public"."ad_campaigns"("stripeSessionId" ASC);

-- CreateIndex
CREATE INDEX "albums_artistId_idx" ON "public"."albums"("artistId" ASC);

-- CreateIndex
CREATE INDEX "distribution_batches_status_idx" ON "public"."distribution_batches"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_batches_txHash_key" ON "public"."distribution_batches"("txHash" ASC);

-- CreateIndex
CREATE INDEX "distribution_submissions_platform_idx" ON "public"."distribution_submissions"("platform" ASC);

-- CreateIndex
CREATE INDEX "distribution_submissions_status_idx" ON "public"."distribution_submissions"("status" ASC);

-- CreateIndex
CREATE INDEX "distribution_submissions_trackId_idx" ON "public"."distribution_submissions"("trackId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_submissions_trackId_platform_key" ON "public"."distribution_submissions"("trackId" ASC, "platform" ASC);

-- CreateIndex
CREATE INDEX "engagement_scores_score_idx" ON "public"."engagement_scores"("score" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "engagement_scores_userId_key" ON "public"."engagement_scores"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "public"."follows"("followerId" ASC, "followingId" ASC);

-- CreateIndex
CREATE INDEX "music_boosts_boosterId_idx" ON "public"."music_boosts"("boosterId" ASC);

-- CreateIndex
CREATE INDEX "music_boosts_isActive_idx" ON "public"."music_boosts"("isActive" ASC);

-- CreateIndex
CREATE INDEX "music_boosts_trackId_idx" ON "public"."music_boosts"("trackId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "music_nft_holders_musicNftId_userId_key" ON "public"."music_nft_holders"("musicNftId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "music_nft_holders_userId_idx" ON "public"."music_nft_holders"("userId" ASC);

-- CreateIndex
CREATE INDEX "music_nfts_artistId_idx" ON "public"."music_nfts"("artistId" ASC);

-- CreateIndex
CREATE INDEX "music_nfts_isListed_idx" ON "public"."music_nfts"("isListed" ASC);

-- CreateIndex
CREATE INDEX "music_nfts_trackId_idx" ON "public"."music_nfts"("trackId" ASC);

-- CreateIndex
CREATE INDEX "nft_listings_nftId_idx" ON "public"."nft_listings"("nftId" ASC);

-- CreateIndex
CREATE INDEX "nft_listings_price_idx" ON "public"."nft_listings"("price" ASC);

-- CreateIndex
CREATE INDEX "nft_listings_sellerId_idx" ON "public"."nft_listings"("sellerId" ASC);

-- CreateIndex
CREATE INDEX "nft_listings_status_idx" ON "public"."nft_listings"("status" ASC);

-- CreateIndex
CREATE INDEX "nfts_collection_idx" ON "public"."nfts"("collection" ASC);

-- CreateIndex
CREATE INDEX "nfts_minterId_idx" ON "public"."nfts"("minterId" ASC);

-- CreateIndex
CREATE INDEX "nfts_ownerId_idx" ON "public"."nfts"("ownerId" ASC);

-- CreateIndex
CREATE INDEX "nfts_rarity_idx" ON "public"."nfts"("rarity" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "nfts_tokenId_key" ON "public"."nfts"("tokenId" ASC);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "public"."notifications"("userId" ASC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "public"."notifications"("userId" ASC, "isRead" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "paid_services_type_key" ON "public"."paid_services"("type" ASC);

-- CreateIndex
CREATE INDEX "post_interactions_postId_type_idx" ON "public"."post_interactions"("postId" ASC, "type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "post_interactions_userId_postId_type_key" ON "public"."post_interactions"("userId" ASC, "postId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "release_votes_trackId_idx" ON "public"."release_votes"("trackId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "release_votes_trackId_voterId_key" ON "public"."release_votes"("trackId" ASC, "voterId" ASC);

-- CreateIndex
CREATE INDEX "reward_transactions_createdAt_idx" ON "public"."reward_transactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "reward_transactions_distributionBatchId_idx" ON "public"."reward_transactions"("distributionBatchId" ASC);

-- CreateIndex
CREATE INDEX "reward_transactions_relatedCampaignId_idx" ON "public"."reward_transactions"("relatedCampaignId" ASC);

-- CreateIndex
CREATE INDEX "reward_transactions_userId_status_idx" ON "public"."reward_transactions"("userId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "reward_transactions_userId_type_idx" ON "public"."reward_transactions"("userId" ASC, "type" ASC);

-- CreateIndex
CREATE INDEX "royalty_payouts_createdAt_idx" ON "public"."royalty_payouts"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "royalty_payouts_musicNftId_idx" ON "public"."royalty_payouts"("musicNftId" ASC);

-- CreateIndex
CREATE INDEX "royalty_payouts_recipientId_idx" ON "public"."royalty_payouts"("recipientId" ASC);

-- CreateIndex
CREATE INDEX "service_purchases_serviceId_idx" ON "public"."service_purchases"("serviceId" ASC);

-- CreateIndex
CREATE INDEX "service_purchases_status_idx" ON "public"."service_purchases"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "service_purchases_stripePaymentId_key" ON "public"."service_purchases"("stripePaymentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "service_purchases_stripeSessionId_key" ON "public"."service_purchases"("stripeSessionId" ASC);

-- CreateIndex
CREATE INDEX "service_purchases_userId_idx" ON "public"."service_purchases"("userId" ASC);

-- CreateIndex
CREATE INDEX "social_posts_adCampaignId_idx" ON "public"."social_posts"("adCampaignId" ASC);

-- CreateIndex
CREATE INDEX "social_posts_authorId_idx" ON "public"."social_posts"("authorId" ASC);

-- CreateIndex
CREATE INDEX "social_posts_createdAt_idx" ON "public"."social_posts"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "social_posts_type_idx" ON "public"."social_posts"("type" ASC);

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status" ASC);

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "public"."subscriptions"("stripeSubscriptionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId" ASC);

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "public"."subscriptions"("userId" ASC);

-- CreateIndex
CREATE INDEX "track_comments_trackId_idx" ON "public"."track_comments"("trackId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "track_likes_trackId_userId_key" ON "public"."track_likes"("trackId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "track_plays_createdAt_idx" ON "public"."track_plays"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "track_plays_listenerId_idx" ON "public"."track_plays"("listenerId" ASC);

-- CreateIndex
CREATE INDEX "track_plays_trackId_idx" ON "public"."track_plays"("trackId" ASC);

-- CreateIndex
CREATE INDEX "track_reposts_trackId_idx" ON "public"."track_reposts"("trackId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "track_reposts_trackId_userId_key" ON "public"."track_reposts"("trackId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "track_reposts_userId_idx" ON "public"."track_reposts"("userId" ASC);

-- CreateIndex
CREATE INDEX "tracks_artistId_idx" ON "public"."tracks"("artistId" ASC);

-- CreateIndex
CREATE INDEX "tracks_boostCount_idx" ON "public"."tracks"("boostCount" ASC);

-- CreateIndex
CREATE INDEX "tracks_createdAt_idx" ON "public"."tracks"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "tracks_engagementScore_idx" ON "public"."tracks"("engagementScore" ASC);

-- CreateIndex
CREATE INDEX "tracks_genre_idx" ON "public"."tracks"("genre" ASC);

-- CreateIndex
CREATE INDEX "tracks_playCount_idx" ON "public"."tracks"("playCount" ASC);

-- CreateIndex
CREATE INDEX "tracks_status_idx" ON "public"."tracks"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerifyToken_key" ON "public"."users"("emailVerifyToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "public"."users"("passwordResetToken" ASC);

-- CreateIndex
CREATE INDEX "users_referralCode_idx" ON "public"."users"("referralCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "public"."users"("referralCode" ASC);

-- CreateIndex
CREATE INDEX "users_referredById_idx" ON "public"."users"("referredById" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username" ASC);

-- CreateIndex
CREATE INDEX "users_walletAddress_idx" ON "public"."users"("walletAddress" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_walletAddress_key" ON "public"."users"("walletAddress" ASC);

-- CreateIndex
CREATE INDEX "youtube_distributions_status_idx" ON "public"."youtube_distributions"("status" ASC);

-- CreateIndex
CREATE INDEX "youtube_distributions_trackId_idx" ON "public"."youtube_distributions"("trackId" ASC);

-- AddForeignKey
ALTER TABLE "public"."ad_campaigns" ADD CONSTRAINT "ad_campaigns_adPackageId_fkey" FOREIGN KEY ("adPackageId") REFERENCES "public"."ad_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ad_campaigns" ADD CONSTRAINT "ad_campaigns_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."albums" ADD CONSTRAINT "albums_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."distribution_submissions" ADD CONSTRAINT "distribution_submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."distribution_submissions" ADD CONSTRAINT "distribution_submissions_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."engagement_scores" ADD CONSTRAINT "engagement_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."music_boosts" ADD CONSTRAINT "music_boosts_boosterId_fkey" FOREIGN KEY ("boosterId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."music_boosts" ADD CONSTRAINT "music_boosts_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."music_nft_holders" ADD CONSTRAINT "music_nft_holders_musicNftId_fkey" FOREIGN KEY ("musicNftId") REFERENCES "public"."music_nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."music_nft_holders" ADD CONSTRAINT "music_nft_holders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."music_nfts" ADD CONSTRAINT "music_nfts_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."music_nfts" ADD CONSTRAINT "music_nfts_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_listings" ADD CONSTRAINT "nft_listings_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_listings" ADD CONSTRAINT "nft_listings_nftId_fkey" FOREIGN KEY ("nftId") REFERENCES "public"."nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nft_listings" ADD CONSTRAINT "nft_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_minterId_fkey" FOREIGN KEY ("minterId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."nfts" ADD CONSTRAINT "nfts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_interactions" ADD CONSTRAINT "post_interactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."post_interactions" ADD CONSTRAINT "post_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_votes" ADD CONSTRAINT "release_votes_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."release_votes" ADD CONSTRAINT "release_votes_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reward_transactions" ADD CONSTRAINT "reward_transactions_distributionBatchId_fkey" FOREIGN KEY ("distributionBatchId") REFERENCES "public"."distribution_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reward_transactions" ADD CONSTRAINT "reward_transactions_relatedCampaignId_fkey" FOREIGN KEY ("relatedCampaignId") REFERENCES "public"."ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reward_transactions" ADD CONSTRAINT "reward_transactions_relatedPostId_fkey" FOREIGN KEY ("relatedPostId") REFERENCES "public"."social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reward_transactions" ADD CONSTRAINT "reward_transactions_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reward_transactions" ADD CONSTRAINT "reward_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."royalty_payouts" ADD CONSTRAINT "royalty_payouts_musicNftId_fkey" FOREIGN KEY ("musicNftId") REFERENCES "public"."music_nfts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."royalty_payouts" ADD CONSTRAINT "royalty_payouts_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_purchases" ADD CONSTRAINT "service_purchases_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."paid_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_purchases" ADD CONSTRAINT "service_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."social_posts" ADD CONSTRAINT "social_posts_adCampaignId_fkey" FOREIGN KEY ("adCampaignId") REFERENCES "public"."ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."social_posts" ADD CONSTRAINT "social_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_comments" ADD CONSTRAINT "track_comments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_comments" ADD CONSTRAINT "track_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_likes" ADD CONSTRAINT "track_likes_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_likes" ADD CONSTRAINT "track_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_plays" ADD CONSTRAINT "track_plays_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_plays" ADD CONSTRAINT "track_plays_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_reposts" ADD CONSTRAINT "track_reposts_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."track_reposts" ADD CONSTRAINT "track_reposts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracks" ADD CONSTRAINT "tracks_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tracks" ADD CONSTRAINT "tracks_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."youtube_distributions" ADD CONSTRAINT "youtube_distributions_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "public"."tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


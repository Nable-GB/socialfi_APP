-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('OPEN', 'VOTING', 'FINALIZED');

-- CreateEnum
CREATE TYPE "TopArtistPrivilege" AS ENUM ('MINT_NFT', 'DISTRIBUTION');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'RELEASED', 'PAID');

-- AlterEnum
ALTER TYPE "SubscriptionTier" ADD VALUE 'CREATOR';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "isTopArtist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "topArtistSince" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "monthly_competitions" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'OPEN',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_entries" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "listenScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "likeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "top_artist_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "privilege" "TopArtistPrivilege" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "top_artist_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_brochures" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "price" DECIMAL(20,8) NOT NULL,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "buyerId" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_brochures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_releases" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "totalRevenue" DECIMAL(20,8) NOT NULL,
    "artistAmount" DECIMAL(20,8) NOT NULL,
    "platformAmount" DECIMAL(20,8) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "releasedAt" TIMESTAMP(3),
    "releasedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_competitions_status_idx" ON "monthly_competitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_competitions_year_month_key" ON "monthly_competitions"("year", "month");

-- CreateIndex
CREATE INDEX "competition_entries_competitionId_totalScore_idx" ON "competition_entries"("competitionId", "totalScore");

-- CreateIndex
CREATE INDEX "competition_entries_userId_idx" ON "competition_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_entries_competitionId_trackId_key" ON "competition_entries"("competitionId", "trackId");

-- CreateIndex
CREATE INDEX "top_artist_grants_userId_trackId_idx" ON "top_artist_grants"("userId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "top_artist_grants_userId_trackId_privilege_key" ON "top_artist_grants"("userId", "trackId", "privilege");

-- CreateIndex
CREATE UNIQUE INDEX "nft_brochures_trackId_key" ON "nft_brochures"("trackId");

-- CreateIndex
CREATE INDEX "nft_brochures_artistId_idx" ON "nft_brochures"("artistId");

-- CreateIndex
CREATE INDEX "nft_brochures_isSold_idx" ON "nft_brochures"("isSold");

-- CreateIndex
CREATE INDEX "payout_releases_trackId_idx" ON "payout_releases"("trackId");

-- CreateIndex
CREATE INDEX "payout_releases_artistId_idx" ON "payout_releases"("artistId");

-- CreateIndex
CREATE INDEX "payout_releases_status_idx" ON "payout_releases"("status");

-- AddForeignKey
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "monthly_competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_entries" ADD CONSTRAINT "competition_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_artist_grants" ADD CONSTRAINT "top_artist_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_artist_grants" ADD CONSTRAINT "top_artist_grants_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "top_artist_grants" ADD CONSTRAINT "top_artist_grants_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "monthly_competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_brochures" ADD CONSTRAINT "nft_brochures_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_brochures" ADD CONSTRAINT "nft_brochures_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nft_brochures" ADD CONSTRAINT "nft_brochures_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_releases" ADD CONSTRAINT "payout_releases_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_releases" ADD CONSTRAINT "payout_releases_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Add complimentary Creator code payment source
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREATOR_CODE';

-- Create complimentary Creator code catalog
CREATE TABLE "creator_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'CREATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_codes_pkey" PRIMARY KEY ("id")
);

-- Track individual redemptions and revocations
CREATE TABLE "creator_code_redemptions" (
    "id" TEXT NOT NULL,
    "creatorCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_code_redemptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "creator_codes_code_key" ON "creator_codes"("code");
CREATE INDEX "creator_codes_isActive_expiresAt_idx" ON "creator_codes"("isActive", "expiresAt");
CREATE INDEX "creator_codes_createdById_idx" ON "creator_codes"("createdById");

CREATE UNIQUE INDEX "creator_code_redemptions_subscriptionId_key" ON "creator_code_redemptions"("subscriptionId");
CREATE UNIQUE INDEX "unique_creator_code_redemption" ON "creator_code_redemptions"("creatorCodeId", "userId");
CREATE INDEX "creator_code_redemptions_creatorCodeId_idx" ON "creator_code_redemptions"("creatorCodeId");
CREATE INDEX "creator_code_redemptions_userId_idx" ON "creator_code_redemptions"("userId");
CREATE INDEX "creator_code_redemptions_revokedAt_idx" ON "creator_code_redemptions"("revokedAt");

ALTER TABLE "creator_codes"
ADD CONSTRAINT "creator_codes_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "creator_code_redemptions"
ADD CONSTRAINT "creator_code_redemptions_creatorCodeId_fkey"
FOREIGN KEY ("creatorCodeId") REFERENCES "creator_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creator_code_redemptions"
ADD CONSTRAINT "creator_code_redemptions_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creator_code_redemptions"
ADD CONSTRAINT "creator_code_redemptions_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ALTER COLUMN "uploadCredits" SET DEFAULT 0;

UPDATE "users"
SET "uploadCredits" = 0
WHERE "subscriptionTier" IN ('FREE', 'PREMIUM');

ALTER TABLE "subscriptions"
ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "cryptoTxHash" TEXT,
ADD COLUMN "cryptoWalletAddress" TEXT,
ADD COLUMN "creditsGrantedThrough" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewNotes" TEXT;

CREATE UNIQUE INDEX "subscriptions_cryptoTxHash_key" ON "subscriptions"("cryptoTxHash");
CREATE INDEX "subscriptions_paymentMethod_status_idx" ON "subscriptions"("paymentMethod", "status");

UPDATE "subscriptions"
SET "paymentMethod" = 'FIAT_STRIPE'
WHERE "stripeSubscriptionId" IS NOT NULL
  AND "paymentMethod" IS NULL;

UPDATE "subscriptions"
SET "creditsGrantedThrough" = "currentPeriodEnd"
WHERE "status" = 'ACTIVE'
  AND "tier" IN ('CREATOR', 'PRO', 'PREMIUM')
  AND "currentPeriodEnd" IS NOT NULL;
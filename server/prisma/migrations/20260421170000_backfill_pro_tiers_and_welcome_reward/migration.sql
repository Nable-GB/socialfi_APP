ALTER TABLE "users"
ADD COLUMN "welcomeRewardGrantedAt" TIMESTAMP(3);

ALTER TABLE "creator_codes"
ALTER COLUMN "tier" SET DEFAULT 'PRO';

UPDATE "users"
SET "subscriptionTier" = 'PRO'
WHERE "subscriptionTier" = 'CREATOR';

UPDATE "subscriptions"
SET "tier" = 'PRO'
WHERE "tier" = 'CREATOR';

UPDATE "creator_codes"
SET "tier" = 'PRO'
WHERE "tier" = 'CREATOR';

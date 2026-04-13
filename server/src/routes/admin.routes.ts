import { Router } from "express";
import {
  getStats,
  getUsers,
  updateUserRole,
  getCampaigns,
  updateCampaignStatus,
  distributeRewards,
  airdropTokens,
  getPayoutHealth,
  getPayoutQueue,
  createPayoutRelease,
  releasePayout,
  getPendingUsdtSubscriptions,
  approveUsdtSubscription,
  rejectUsdtSubscription,
  getCreatorCodes,
  createCreatorCode,
  updateCreatorCode,
  revokeCreatorCodeRedemption,
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All admin routes require auth + ADMIN role
router.use(requireAuth);
router.use(requireRole("ADMIN"));

// Stats
router.get("/stats", getStats);

// Users
router.get("/users", getUsers);
router.patch("/users/:id/role", updateUserRole);

// Campaigns
router.get("/campaigns", getCampaigns);
router.patch("/campaigns/:id/status", updateCampaignStatus);

// Manual USDT subscription review
router.get("/subscriptions/usdt-pending", getPendingUsdtSubscriptions);
router.post("/subscriptions/:id/approve-usdt", approveUsdtSubscription);
router.post("/subscriptions/:id/reject-usdt", rejectUsdtSubscription);

// Complimentary Creator code management
router.get("/creator-codes", getCreatorCodes);
router.post("/creator-codes", createCreatorCode);
router.patch("/creator-codes/:id", updateCreatorCode);
router.post("/creator-code-redemptions/:id/revoke", revokeCreatorCodeRedemption);

// Rewards
router.post("/rewards/distribute", distributeRewards);
router.post("/rewards/airdrop", airdropTokens);

// Payout health
router.get("/payout-health", getPayoutHealth);

// Payout releases (50/50 streaming revenue distribution)
router.get("/payout-queue", getPayoutQueue);
router.post("/payout-releases", createPayoutRelease);
router.post("/payout-releases/:id/release", releasePayout);

export default router;

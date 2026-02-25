import { Router } from "express";
import {
  getStats,
  getUsers,
  updateUserRole,
  getCampaigns,
  updateCampaignStatus,
  distributeRewards,
  airdropTokens,
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

// Rewards
router.post("/rewards/distribute", distributeRewards);
router.post("/rewards/airdrop", airdropTokens);

export default router;

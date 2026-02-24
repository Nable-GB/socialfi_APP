import { Router } from "express";
import { getAdPackages, createCheckout, getMyCampaigns } from "../controllers/ads.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public: browse available ad packages
router.get("/packages", getAdPackages);

// Merchant-only: purchase & manage campaigns
router.post("/checkout", requireAuth, requireRole("MERCHANT"), createCheckout);
router.get("/campaigns", requireAuth, requireRole("MERCHANT"), getMyCampaigns);

export default router;

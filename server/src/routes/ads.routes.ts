import { Router } from "express";
import { getAdPackages, createCheckout, createCampaign, getMyCampaigns } from "../controllers/ads.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public: browse available ad packages
router.get("/packages", getAdPackages);

// Any authenticated user: create campaign directly (no Stripe)
router.post("/campaigns", requireAuth, createCampaign);

// Merchant-only: purchase via Stripe & list campaigns
router.post("/checkout", requireAuth, requireRole("MERCHANT"), createCheckout);
router.get("/campaigns", requireAuth, getMyCampaigns);

export default router;

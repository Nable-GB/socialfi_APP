import { Router } from "express";
import { getPlatformAnalytics, getUserAnalytics } from "../controllers/analytics.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// User personal analytics (auth required)
router.get("/me", requireAuth, getUserAnalytics);

// Platform analytics (admin only)
router.get("/platform", requireAuth, requireRole("ADMIN"), getPlatformAnalytics);

export default router;

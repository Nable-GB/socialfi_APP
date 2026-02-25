import { Router } from "express";
import { getReferralStats, getReferralLeaderboard, getTiers } from "../controllers/referral.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/tiers", getTiers);
router.get("/leaderboard", getReferralLeaderboard);
router.get("/stats", requireAuth, getReferralStats);

export default router;

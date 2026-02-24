import { Router } from "express";
import { claimReward, getRewardHistory, getBalance } from "../controllers/rewards.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// All reward endpoints require authentication
router.use(requireAuth);

router.post("/claim", claimReward);
router.get("/history", getRewardHistory);
router.get("/balance", getBalance);

export default router;

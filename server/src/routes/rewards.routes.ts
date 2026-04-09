import { Router } from "express";
import { claimReward, getRewardHistory, getBalance, requestWithdrawal, getTransactions, swapSmfiToEth } from "../controllers/rewards.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { rewardLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// All reward endpoints require authentication
router.use(requireAuth);

router.post("/claim", rewardLimiter, claimReward);
router.post("/withdraw", rewardLimiter, requestWithdrawal);
router.post("/swap/smfi-to-eth", rewardLimiter, swapSmfiToEth);
router.get("/balance", getBalance);
router.get("/history", getRewardHistory);
router.get("/transactions", getTransactions);

export default router;

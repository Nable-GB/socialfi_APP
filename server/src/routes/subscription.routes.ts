import { Router } from "express";
import {
  getSubscriptionTiers,
  getMySubscription,
  createSubscriptionCheckout,
  cancelSubscription,
  createUsdtCheckout,
  redeemCreatorCode,
} from "../controllers/subscription.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public: list tiers
router.get("/tiers", getSubscriptionTiers);

// Auth: current subscription
router.get("/me", requireAuth, getMySubscription);

// Auth: create Stripe checkout for subscription
router.post("/checkout", requireAuth, createSubscriptionCheckout);

// Auth: submit on-chain USDT payment for admin review
router.post("/checkout-usdt", requireAuth, createUsdtCheckout);

// Auth: redeem complimentary Creator access code
router.post("/redeem-code", requireAuth, redeemCreatorCode);

// Auth: cancel subscription
router.post("/cancel", requireAuth, cancelSubscription);

export default router;

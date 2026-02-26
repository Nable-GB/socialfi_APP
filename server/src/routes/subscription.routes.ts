import { Router } from "express";
import {
  getSubscriptionTiers,
  getMySubscription,
  createSubscriptionCheckout,
  cancelSubscription,
} from "../controllers/subscription.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public: list tiers
router.get("/tiers", getSubscriptionTiers);

// Auth: current subscription
router.get("/me", requireAuth, getMySubscription);

// Auth: create checkout for subscription
router.post("/checkout", requireAuth, createSubscriptionCheckout);

// Auth: cancel subscription
router.post("/cancel", requireAuth, cancelSubscription);

export default router;

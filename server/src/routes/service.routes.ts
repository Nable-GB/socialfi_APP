import { Router } from "express";
import {
  getPaidServices,
  createServiceCheckout,
  getMyPurchases,
  checkActiveService,
} from "../controllers/service.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public: list available services
router.get("/", getPaidServices);

// Auth: purchase a service
router.post("/:id/checkout", requireAuth, createServiceCheckout);

// Auth: user's purchase history
router.get("/purchases", requireAuth, getMyPurchases);

// Auth: check if user has active service
router.get("/check", requireAuth, checkActiveService);

export default router;

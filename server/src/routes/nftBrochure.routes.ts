import { Router } from "express";
import {
  createBrochure,
  getBrochures,
  getMyBrochures,
  buyBrochure,
} from "../controllers/nftBrochure.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public: browse available brochures
router.get("/", getBrochures);

// Auth: view own created/owned brochures
router.get("/mine", requireAuth, getMyBrochures);

// Auth: create brochure (CREATOR tier enforced in controller)
router.post("/", requireAuth, createBrochure);

// Auth: purchase a brochure
router.post("/:id/buy", requireAuth, buyBrochure);

export default router;

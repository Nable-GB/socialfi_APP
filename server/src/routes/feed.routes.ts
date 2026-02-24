import { Router } from "express";
import { getFeed, createPost, interactWithPost } from "../controllers/feed.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Feed is publicly readable, but auth enriches it (claimed status, interactions)
router.get("/", getFeed);

// Authenticated actions
router.post("/posts", requireAuth, createPost);
router.post("/posts/:id/interact", requireAuth, interactWithPost);

export default router;

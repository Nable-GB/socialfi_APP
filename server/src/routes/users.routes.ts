import { Router } from "express";
import {
  updateProfile,
  changePassword,
  linkWallet,
  searchUsers,
  getUserProfile,
  getFollowingUsers,
  toggleFollow,
} from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ── Public / optional-auth ───────────────────────────────────────────────────
router.get("/search", searchUsers);

// ── Authenticated ────────────────────────────────────────────────────────────
router.get("/me/following", requireAuth, getFollowingUsers);
router.patch("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, authLimiter, changePassword);
router.post("/link-wallet", requireAuth, linkWallet);
router.post("/:id/follow", requireAuth, toggleFollow);
router.get("/:id", getUserProfile);

export default router;

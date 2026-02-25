import { Router } from "express";
import { register, login, getNonce, verifySiwe, getMe, refreshTokenHandler } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// ── Web2 Auth (rate-limited: 10 attempts / 15 min) ─────────────────────────
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

// ── Web3 Auth (SIWE) ────────────────────────────────────────────────────────
router.get("/nonce/:address", authLimiter, getNonce);
router.post("/siwe/verify", authLimiter, verifySiwe);

// ── Token Refresh ────────────────────────────────────────────────────────────
router.post("/refresh", authLimiter, refreshTokenHandler);

// ── Profile ─────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, getMe);

export default router;

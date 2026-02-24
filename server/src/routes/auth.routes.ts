import { Router } from "express";
import { register, login, getNonce, verifySiwe, getMe } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── Web2 Auth ───────────────────────────────────────────────────────────────
router.post("/register", register);
router.post("/login", login);

// ── Web3 Auth (SIWE) ────────────────────────────────────────────────────────
router.get("/nonce/:address", getNonce);
router.post("/siwe/verify", verifySiwe);

// ── Profile ─────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, getMe);

export default router;

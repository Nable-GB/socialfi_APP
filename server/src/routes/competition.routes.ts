import { Router } from "express";
import {
  getCurrentCompetition,
  getPastCompetitions,
  getCompetitionLeaderboard,
  enterCompetition,
  finalizeCompetition,
  getMyEntries,
} from "../controllers/competition.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public
router.get("/current", getCurrentCompetition);
router.get("/past", getPastCompetitions);
router.get("/:id/leaderboard", getCompetitionLeaderboard);

// Auth: creators enter tracks
router.post("/enter", requireAuth, enterCompetition);

// Auth: view own entries
router.get("/my-entries", requireAuth, getMyEntries);

// Admin only: finalize competition and grant Top 10 privileges
router.post("/:id/finalize", requireAuth, requireRole("ADMIN"), finalizeCompetition);

export default router;

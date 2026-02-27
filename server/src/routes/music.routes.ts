import { Router } from "express";
import {
  getTracks,
  getTrack,
  createTrack,
  updateTrack,
  deleteTrack,
  recordPlay,
  toggleLike,
  addComment,
  getMyTracks,
  submitToYouTube,
  getAlbums,
  createAlbum,
} from "../controllers/music.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public
router.get("/tracks", getTracks);
router.get("/tracks/:id", getTrack);

// Auth required
router.post("/tracks", requireAuth, createTrack);
router.patch("/tracks/:id", requireAuth, updateTrack);
router.delete("/tracks/:id", requireAuth, deleteTrack);
router.post("/tracks/:id/play", recordPlay); // play can be anonymous
router.post("/tracks/:id/like", requireAuth, toggleLike);
router.post("/tracks/:id/comment", requireAuth, addComment);
router.post("/tracks/:id/distribute", requireAuth, submitToYouTube);

// My tracks & albums
router.get("/my-tracks", requireAuth, getMyTracks);
router.get("/albums", requireAuth, getAlbums);
router.post("/albums", requireAuth, createAlbum);

export default router;

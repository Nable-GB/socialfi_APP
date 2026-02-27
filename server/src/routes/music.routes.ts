import { Router } from "express";
import {
  getTracks, getTrack, createTrack, updateTrack, deleteTrack,
  recordPlay, toggleLike, addComment, getMyTracks, submitToYouTube,
  getAlbums, createAlbum,
} from "../controllers/music.controller.js";
import { boostTrack, repostTrack, getBoostStats } from "../controllers/boost.controller.js";
import { mintMusicNFT, getMusicNFTs, getMusicNFT, buyMusicNFT, toggleStake, getMyMusicNFTs } from "../controllers/musicNft.controller.js";
import { submitDistribution, getDistributions, voteForRelease, getVotes } from "../controllers/distribution.controller.js";
import { getArtistRevenue, getFanRevenue } from "../controllers/revenue.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── Track CRUD ──────────────────────────────────────────────────────────────
router.get("/tracks", getTracks);
router.get("/tracks/:id", getTrack);
router.post("/tracks", requireAuth, createTrack);
router.patch("/tracks/:id", requireAuth, updateTrack);
router.delete("/tracks/:id", requireAuth, deleteTrack);

// ── Track Interactions ──────────────────────────────────────────────────────
router.post("/tracks/:id/play", recordPlay);
router.post("/tracks/:id/like", requireAuth, toggleLike);
router.post("/tracks/:id/comment", requireAuth, addComment);

// ── Boost & Share-to-Earn ───────────────────────────────────────────────────
router.post("/tracks/:id/boost", requireAuth, boostTrack);
router.post("/tracks/:id/repost", requireAuth, repostTrack);
router.get("/tracks/:id/boosts", getBoostStats);

// ── Distribution (YouTube + Global) ─────────────────────────────────────────
router.post("/tracks/:id/distribute", requireAuth, submitToYouTube);
router.post("/tracks/:id/distribute-global", requireAuth, submitDistribution);
router.get("/tracks/:id/distributions", getDistributions);

// ── Fan Voting ──────────────────────────────────────────────────────────────
router.post("/tracks/:id/vote", requireAuth, voteForRelease);
router.get("/tracks/:id/votes", getVotes);

// ── Music NFTs ──────────────────────────────────────────────────────────────
router.get("/nfts", getMusicNFTs);
router.get("/nfts/:id", getMusicNFT);
router.post("/nfts", requireAuth, mintMusicNFT);
router.post("/nfts/:id/buy", requireAuth, buyMusicNFT);
router.post("/nfts/:id/stake", requireAuth, toggleStake);
router.get("/my-nfts", requireAuth, getMyMusicNFTs);

// ── My Tracks & Albums ──────────────────────────────────────────────────────
router.get("/my-tracks", requireAuth, getMyTracks);
router.get("/albums", requireAuth, getAlbums);
router.post("/albums", requireAuth, createAlbum);

// ── Revenue Dashboard ───────────────────────────────────────────────────────
router.get("/revenue/artist", requireAuth, getArtistRevenue);
router.get("/revenue/fan", requireAuth, getFanRevenue);

export default router;

import { Router } from "express";
import {
  uploadAvatar,
  uploadMedia,
  handleAvatarUpload,
  handleMediaUpload,
  handleNftUpload,
} from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// Avatar upload (5MB, images only)
router.post("/avatar", (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }
    next();
  });
}, handleAvatarUpload);

// Post media upload (10MB, images + video)
router.post("/media", (req, res, next) => {
  uploadMedia(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }
    next();
  });
}, handleMediaUpload);

// NFT image upload (10MB, images only)
router.post("/nft", (req, res, next) => {
  uploadMedia(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }
    next();
  });
}, handleNftUpload);

export default router;

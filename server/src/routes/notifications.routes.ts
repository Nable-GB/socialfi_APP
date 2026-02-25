import { Router } from "express";
import {
  streamNotifications,
  getNotifications,
  markOneRead,
  markAllRead,
  deleteNotification,
} from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/stream", streamNotifications);
router.get("/", getNotifications);
router.post("/read-all", markAllRead);
router.post("/:id/read", markOneRead);
router.delete("/:id", deleteNotification);

export default router;

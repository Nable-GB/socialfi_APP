import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { registerSseClient } from "../services/notification.service.js";

// ─── GET /api/notifications/stream — SSE real-time stream ────────────────────

export async function streamNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Send initial heartbeat
  res.write(`: connected\n\n`);

  // Register this client
  const cleanup = registerSseClient(userId, (data: string) => {
    res.write(data);
  });

  // Send unread count on connect
  const unread = await prisma.notification.count({ where: { userId, isRead: false } });
  res.write(`data: ${JSON.stringify({ type: "unread_count", count: unread })}\n\n`);

  // Heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
}

// ─── GET /api/notifications — Paginated notification list ────────────────────

const listQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  unreadOnly: z.coerce.boolean().default(false),
});

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const { cursor, limit, unreadOnly } = listQuerySchema.parse(req.query);
    const userId = req.user!.userId;

    const cursorDate = cursor
      ? (await prisma.notification.findUnique({ where: { id: cursor } }))?.createdAt
      : undefined;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    const nextCursor = notifications.length === limit ? notifications[notifications.length - 1]?.id : null;

    res.json({ notifications, nextCursor, hasMore: notifications.length === limit, unreadCount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/notifications/:id/read — Mark one as read ─────────────────────

export async function markOneRead(req: Request, res: Response): Promise<void> {
  try {
    const notifId = req.params.id as string;
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { id: notifId, userId },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    res.json({ success: true, unreadCount });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/notifications/read-all — Mark all as read ─────────────────────

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── DELETE /api/notifications/:id — Delete a notification ───────────────────

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const notifId = req.params.id as string;
    const userId = req.user!.userId;

    await prisma.notification.deleteMany({ where: { id: notifId, userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

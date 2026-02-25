import prisma from "../lib/prisma.js";

export type NotificationType =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "REWARD_EARNED"
  | "WITHDRAWAL_DONE"
  | "AIRDROP"
  | "SYSTEM";

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedPostId?: string;
  relatedUserId?: string;
  relatedTxId?: string;
}

// ─── SSE Connection Registry ─────────────────────────────────────────────────
// Map of userId -> SSE response writer function
type SseWriter = (data: string) => void;
const sseClients = new Map<string, Set<SseWriter>>();

export function registerSseClient(userId: string, writer: SseWriter): () => void {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId)!.add(writer);

  // Return cleanup function
  return () => {
    const set = sseClients.get(userId);
    if (set) {
      set.delete(writer);
      if (set.size === 0) sseClients.delete(userId);
    }
  };
}

function pushToUser(userId: string, payload: object): void {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach(write => {
    try { write(data); } catch { /* client disconnected */ }
  });
}

// ─── Core create + push ───────────────────────────────────────────────────────

export async function createNotification(opts: CreateNotificationOptions) {
  const notification = await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      relatedPostId: opts.relatedPostId,
      relatedUserId: opts.relatedUserId,
      relatedTxId: opts.relatedTxId,
    },
  });

  // Push real-time via SSE if the user is connected
  pushToUser(opts.userId, { type: "notification", notification });

  return notification;
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export function notifyFollow(followedUserId: string, followerUsername: string, followerId: string) {
  return createNotification({
    userId: followedUserId,
    type: "FOLLOW",
    title: "New Follower",
    message: `@${followerUsername} started following you`,
    relatedUserId: followerId,
  });
}

export function notifyLike(postAuthorId: string, likerUsername: string, likerId: string, postId: string) {
  return createNotification({
    userId: postAuthorId,
    type: "LIKE",
    title: "Post Liked",
    message: `@${likerUsername} liked your post`,
    relatedPostId: postId,
    relatedUserId: likerId,
  });
}

export function notifyComment(postAuthorId: string, commenterUsername: string, commenterId: string, postId: string) {
  return createNotification({
    userId: postAuthorId,
    type: "COMMENT",
    title: "New Comment",
    message: `@${commenterUsername} commented on your post`,
    relatedPostId: postId,
    relatedUserId: commenterId,
  });
}

export function notifyRewardEarned(userId: string, amount: string, txId: string) {
  return createNotification({
    userId,
    type: "REWARD_EARNED",
    title: "Reward Earned! 🎉",
    message: `You earned ${parseFloat(amount).toFixed(4)} SFT tokens`,
    relatedTxId: txId,
  });
}

export function notifyWithdrawalDone(userId: string, amount: string, txHash: string | null) {
  return createNotification({
    userId,
    type: "WITHDRAWAL_DONE",
    title: "Withdrawal Processed",
    message: txHash
      ? `${parseFloat(amount).toFixed(4)} SFT sent on-chain ✅`
      : `${parseFloat(amount).toFixed(4)} SFT withdrawal queued`,
  });
}

export function notifyAirdrop(userId: string, amount: number) {
  return createNotification({
    userId,
    type: "AIRDROP",
    title: "Airdrop Received! 🎁",
    message: `You received an airdrop of ${amount} SFT tokens`,
  });
}

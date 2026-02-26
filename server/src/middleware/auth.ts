import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  userId: string;
  role: string;
  walletAddress?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: Verify JWT and attach user payload to req.user
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  // SSE connections use ?token= query param since EventSource can't set headers
  const queryToken = req.query.token as string | undefined;

  let token: string;
  if (header?.startsWith("Bearer ")) {
    token = header.slice(7);
  } else if (queryToken) {
    token = queryToken;
  } else {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware: Require a specific role (e.g. MERCHANT, ADMIN)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/**
 * Middleware: Require a minimum subscription tier.
 * Tier hierarchy: FREE < PRO < PREMIUM
 */
const TIER_RANK: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2 };

export function requireTier(...allowedTiers: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const { default: prisma } = await import("../lib/prisma.js");
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { subscriptionTier: true },
      });

      const userTier = user?.subscriptionTier ?? "FREE";

      if (allowedTiers.includes(userTier)) {
        next();
        return;
      }

      // Also allow if user's tier rank is >= the minimum required
      const minRequired = Math.min(...allowedTiers.map(t => TIER_RANK[t] ?? 99));
      if ((TIER_RANK[userTier] ?? 0) >= minRequired) {
        next();
        return;
      }

      res.status(403).json({
        error: "Upgrade required",
        message: `This feature requires a ${allowedTiers.join(" or ")} subscription`,
        currentTier: userTier,
        requiredTiers: allowedTiers,
      });
    } catch (err) {
      console.error("requireTier error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

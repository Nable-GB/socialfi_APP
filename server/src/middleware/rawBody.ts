import { Request, Response, NextFunction } from "express";

/**
 * Middleware to capture the raw body buffer for Stripe webhook signature verification.
 * Must be applied BEFORE express.json() for the webhook route.
 */
export function captureRawBody(req: Request, _res: Response, buf: Buffer): void {
  (req as Request & { rawBody?: Buffer }).rawBody = buf;
}

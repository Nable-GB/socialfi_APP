import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";
import { captureRawBody } from "./middleware/rawBody.js";
import { requireAuth } from "./middleware/auth.js";
import type { JwtPayload } from "./middleware/auth.js";

// ── Route Imports ───────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import adsRoutes from "./routes/ads.routes.js";
import rewardsRoutes from "./routes/rewards.routes.js";
import { handleStripeWebhook } from "./webhooks/stripe.webhook.js";

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// ── Stripe Webhook (MUST be before express.json — needs raw body) ──────────
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, _res, next) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = req.body;
    next();
  },
  handleStripeWebhook
);

// ── Body Parsers ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Optional: Attach user to all requests if token is present ───────────────
app.use((req, _res, next) => {
  // Non-blocking auth: attaches req.user if valid token exists, but doesn't reject
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload;
      req.user = payload;
    } catch {
      // Token invalid/expired — continue without user context
    }
  }
  next();
});

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/ads", adsRoutes);
app.use("/api/rewards", rewardsRoutes);

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global Error Handler ────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 SocialFi API server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Frontend:    ${env.FRONTEND_URL}`);
});

export default app;

import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { env } from "./config/env.js";
import { captureRawBody } from "./middleware/rawBody.js";
import { requireAuth } from "./middleware/auth.js";
import type { JwtPayload } from "./middleware/auth.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import prisma from "./lib/prisma.js";

// ── Route Imports ───────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.routes.js";
import feedRoutes from "./routes/feed.routes.js";
import adsRoutes from "./routes/ads.routes.js";
import rewardsRoutes from "./routes/rewards.routes.js";
import usersRoutes from "./routes/users.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { handleStripeWebhook } from "./webhooks/stripe.webhook.js";

const app = express();

// ── Security Headers (Helmet) ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // managed by frontend/CDN
}));

// ── CORS — strict origin matching ────────────────────────────────────────
const allowedOrigins = new Set(
  [
    env.FRONTEND_URL,
    ...(env.NODE_ENV === "development" ? ["http://localhost:5173", "http://localhost:4173"] : []),
  ].filter(Boolean)
);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server (no origin) in dev, reject in prod
      if (!origin) return cb(null, env.NODE_ENV === "development");
      if (allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate Limiting (global: 100 req/min per IP) ──────────────────────────
app.use(globalLimiter);

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
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);

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

// ── Auto-seed Ad Packages if empty ───────────────────────────────────────────
async function autoSeed() {
  try {
    const count = await prisma.adPackage.count();
    if (count === 0) {
      console.log("📦 No Ad Packages found — auto-seeding...");
      await prisma.adPackage.createMany({
        data: [
          { id: "pkg-starter", name: "Starter", description: "Perfect for small businesses testing the platform.", priceFiat: 49.0, priceCrypto: 49.0, impressions: 5000, durationDays: 7, maxPosts: 1, totalRewardPool: 500, sortOrder: 1 },
          { id: "pkg-growth", name: "Growth", description: "Best value for growing brands.", priceFiat: 149.0, priceCrypto: 149.0, impressions: 20000, durationDays: 14, maxPosts: 3, totalRewardPool: 2000, sortOrder: 2 },
          { id: "pkg-enterprise", name: "Enterprise", description: "Maximum reach for serious advertisers.", priceFiat: 499.0, priceCrypto: 499.0, impressions: 100000, durationDays: 30, maxPosts: 10, totalRewardPool: 10000, sortOrder: 3 },
        ],
      });
      console.log("✅ Ad Packages seeded successfully");
    }
  } catch (err) {
    console.error("Auto-seed warning:", err);
  }
}

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(env.PORT, async () => {
  console.log(`🚀 SocialFi API server running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Frontend:    ${env.FRONTEND_URL}`);
  await autoSeed();
});

export default app;

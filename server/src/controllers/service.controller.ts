import { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { env } from "../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// ─── GET /api/services — List available paid services ────────────────────────

export async function getPaidServices(_req: Request, res: Response): Promise<void> {
  try {
    const services = await prisma.paidService.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    res.json({ services });
  } catch (err) {
    console.error("GetPaidServices error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/services/:id/checkout — Purchase a service via Stripe ─────────

export async function createServiceCheckout(req: Request, res: Response): Promise<void> {
  try {
    const serviceId = req.params.id as string;
    const userId = req.user!.userId;
    const { metadata } = req.body; // e.g. { postId } for BOOST_POST

    const service = await prisma.paidService.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Create purchase record
    const purchase = await prisma.servicePurchase.create({
      data: {
        userId,
        serviceId,
        status: "PENDING",
        metadata: metadata || undefined,
        expiresAt: service.durationDays
          ? new Date(Date.now() + service.durationDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email ?? undefined,
      metadata: {
        type: "service_purchase",
        purchaseId: purchase.id,
        serviceId: service.id,
        serviceType: service.type,
        userId,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: service.name,
              description: service.description || `${service.name} — SocialFi`,
            },
            unit_amount: Math.round(service.priceUsd.toNumber() * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/?tab=services&status=success&purchaseId=${purchase.id}`,
      cancel_url: `${env.FRONTEND_URL}/?tab=services&status=cancelled`,
    });

    await prisma.servicePurchase.update({
      where: { id: purchase.id },
      data: { stripeSessionId: session.id },
    });

    res.json({
      checkoutUrl: session.url,
      purchaseId: purchase.id,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("CreateServiceCheckout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── GET /api/services/purchases — User's purchase history ───────────────────

export async function getMyPurchases(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    const purchases = await prisma.servicePurchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        service: { select: { name: true, type: true, description: true } },
      },
    });

    res.json({ purchases });
  } catch (err) {
    console.error("GetMyPurchases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Check if user has active service ────────────────────────────────────────

export async function checkActiveService(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const type = req.query.type as string | undefined;

    if (!type) {
      res.status(400).json({ error: "Service type required" });
      return;
    }

    const service = await prisma.paidService.findUnique({
      where: { type: type as any },
    });

    if (!service) {
      res.json({ active: false });
      return;
    }

    const purchase = await prisma.servicePurchase.findFirst({
      where: {
        userId,
        serviceId: service.id,
        status: "COMPLETED",
        OR: [
          { expiresAt: null }, // permanent
          { expiresAt: { gt: new Date() } }, // not expired
        ],
      },
    });

    res.json({ active: !!purchase, purchase });
  } catch (err) {
    console.error("CheckActiveService error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

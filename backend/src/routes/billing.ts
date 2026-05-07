import { Router } from "express";
import { db } from "@workspace/db";
import {
  plansTable,
  subscriptionsTable,
  paymentsTable,
  couponsTable,
  couponUsesTable,
} from "@workspace/db";
import { eq, and, lt, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateId } from "../lib/auth";
import { sendPlanConfirmationEmail } from "../lib/email";
import { auditLog } from "../lib/audit";
import { usersTable } from "@workspace/db";
import crypto from "crypto";

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

// Seed default plans if not present
async function seedPlansIfNeeded() {
  const existing = await db.select({ id: plansTable.id }).from(plansTable);
  const ids = new Set(existing.map(r => r.id));

  const plansToInsert = [];

  if (!ids.has("basic")) {
    plansToInsert.push({
      id: "basic",
      name: "Basic",
      priceKobo: 140000,
      botLimit: 1,
      ramPerBotMb: 450,
      cpuPerBot: 0.3,
      storageGb: 1,
      features: {},
    });
  }

  if (!ids.has("pro")) {
    plansToInsert.push({
      id: "pro",
      name: "Pro",
      priceKobo: 299900,
      botLimit: 1,
      ramPerBotMb: 1024,
      cpuPerBot: 0.6,
      storageGb: 3,
      features: {},
    });
  }

  if (plansToInsert.length > 0) {
    await db.insert(plansTable).values(plansToInsert);
  }
}

seedPlansIfNeeded().catch(() => {});

// GET /api/billing/plans
router.get("/plans", async (_req, res) => {
  const plans = await db.select().from(plansTable);
  res.json(plans.map((p) => ({
    id: p.id,
    name: p.name,
    priceKobo: p.priceKobo,
    botLimit: p.botLimit,
    ramPerBotMb: p.ramPerBotMb,
    cpuPerBot: p.cpuPerBot,
    storageGb: p.storageGb,
    features: p.features,
  })));
});

// GET /api/billing/subscription
router.get("/subscription", requireAuth, async (req, res) => {
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, req.userId!))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "No active subscription" });
    return;
  }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);
  res.json({
    id: sub.id,
    planId: sub.planId,
    planName: plan?.name ?? sub.planId,
    priceKobo: plan?.priceKobo ?? 0,
    status: sub.status,
    startDate: sub.startDate.toISOString(),
    expiryDate: sub.expiryDate.toISOString(),
    graceEndDate: sub.graceEndDate?.toISOString() ?? null,
    botLimit: plan?.botLimit ?? 1,
    ramPerBotMb: plan?.ramPerBotMb ?? 512,
  });
});

// POST /api/billing/coupon/validate
router.post("/coupon/validate", requireAuth, async (req, res) => {
  const { code, planId } = req.body as { code: string; planId: string };

  if (!code || !planId) {
    res.status(400).json({ error: "Code and planId are required" });
    return;
  }

  const [coupon] = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.code, code.toUpperCase()))
    .limit(1);

  if (!coupon) {
    res.json({ valid: false, discountPercent: 0, originalPriceKobo: 0, finalPriceKobo: 0, isFree: false, error: "This code is not valid or has expired" });
    return;
  }

  // Check expiry
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    res.json({ valid: false, discountPercent: 0, originalPriceKobo: 0, finalPriceKobo: 0, isFree: false, error: "This code is not valid or has expired" });
    return;
  }

  // Check usage limit
  if (coupon.usesCount >= coupon.maxUses) {
    res.json({ valid: false, discountPercent: 0, originalPriceKobo: 0, finalPriceKobo: 0, isFree: false, error: "This code is not valid or has expired" });
    return;
  }

  // Check plan applicability
  const applicablePlans = coupon.applicablePlans as string[];
  if (!applicablePlans.includes("all") && !applicablePlans.includes(planId)) {
    res.json({ valid: false, discountPercent: 0, originalPriceKobo: 0, finalPriceKobo: 0, isFree: false, error: "This code is not valid or has expired" });
    return;
  }

  // Check user hasn't used it
  const [alreadyUsed] = await db
    .select({ id: couponUsesTable.id })
    .from(couponUsesTable)
    .where(and(eq(couponUsesTable.couponId, coupon.id), eq(couponUsesTable.userId, req.userId!)))
    .limit(1);

  if (alreadyUsed) {
    res.json({ valid: false, discountPercent: 0, originalPriceKobo: 0, finalPriceKobo: 0, isFree: false, error: "This code is not valid or has expired" });
    return;
  }

  const [plan] = await db.select({ priceKobo: plansTable.priceKobo }).from(plansTable).where(eq(plansTable.id, planId)).limit(1);
  const originalPriceKobo = plan?.priceKobo ?? 0;
  const discountAmount = Math.floor(originalPriceKobo * (coupon.discountPercent / 100));
  const finalPriceKobo = Math.max(0, originalPriceKobo - discountAmount);

  res.json({
    valid: true,
    discountPercent: coupon.discountPercent,
    originalPriceKobo,
    finalPriceKobo,
    isFree: finalPriceKobo === 0,
    error: null,
  });
});

// POST /api/billing/checkout
router.post("/checkout", requireAuth, async (req, res) => {
  const { planId, couponCode, callbackUrl } = req.body as {
    planId: string;
    couponCode?: string;
    callbackUrl: string;
  };

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId)).limit(1);
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  let priceKobo = plan.priceKobo;
  let couponId: string | null = null;
  let couponCurrentUses = 0;

  // Apply coupon if provided
  if (couponCode) {
    const [coupon] = await db
      .select()
      .from(couponsTable)
      .where(eq(couponsTable.code, couponCode.toUpperCase()))
      .limit(1);

    if (coupon && coupon.usesCount < coupon.maxUses && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
      const discount = Math.floor(priceKobo * (coupon.discountPercent / 100));
      priceKobo = Math.max(0, priceKobo - discount);
      couponId = coupon.id;
      couponCurrentUses = coupon.usesCount;
    }
  }

  // Free plan or 100% coupon
  if (priceKobo === 0) {
    const subId = generateId();
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(subscriptionsTable).values({
      id: subId,
      userId: req.userId!,
      planId: plan.id,
      status: "active",
      startDate: now,
      expiryDate: expiry,
    });

    const paymentId = generateId();
    await db.insert(paymentsTable).values({
      id: paymentId,
      userId: req.userId!,
      subscriptionId: subId,
      planName: plan.name,
      amountKobo: 0,
      status: "confirmed",
      type: "coupon_free",
      paidAt: now,
    });

    if (couponId) {
      await db.update(couponsTable).set({ usesCount: couponCurrentUses + 1 }).where(eq(couponsTable.id, couponId));
      await db.insert(couponUsesTable).values({ id: generateId(), couponId, userId: req.userId!, usedAt: now });
    }

    await sendPlanConfirmationEmail(user.email, user.fullName, plan.name);
    await auditLog("billing.plan.activated", { userId: req.userId, req, metadata: { planId, coupon: couponCode } });

    res.json({ checkoutUrl: null, free: true, message: "Plan activated successfully!" });
    return;
  }

  // Initialize Paystack payment
  if (!PAYSTACK_SECRET) {
    res.json({ checkoutUrl: null, free: false, message: "Payment gateway not configured. Contact support." });
    return;
  }

  try {
    const reference = `redon3_${req.userId}_${Date.now()}`;
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: priceKobo,
        reference,
        callback_url: callbackUrl,
        metadata: { userId: req.userId, planId, couponCode: couponCode ?? null },
      }),
    });

    const data = (await response.json()) as { status: boolean; data: { authorization_url: string } };
    if (!data.status) {
      res.status(500).json({ error: "Failed to initialize payment" });
      return;
    }

    // Create pending payment record
    await db.insert(paymentsTable).values({
      id: generateId(),
      userId: req.userId!,
      planName: plan.name,
      paystackReference: reference,
      amountKobo: priceKobo,
      status: "pending",
      type: "new",
    });

    res.json({ checkoutUrl: data.data.authorization_url, free: false, message: "Redirecting to payment..." });
  } catch {
    res.status(500).json({ error: "Failed to initialize payment" });
  }
});

// POST /api/billing/webhook/paystack
router.post("/webhook/paystack", async (req, res) => {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body as { event: string; data: { reference: string; amount: number; customer: { email: string }; metadata: { userId: string; planId: string } } };

  if (event.event === "charge.success") {
    const { reference, amount, metadata } = event.data;
    const { userId, planId } = metadata;

    // Check for duplicate
    const [existing] = await db.select({ id: paymentsTable.id }).from(paymentsTable).where(eq(paymentsTable.paystackReference, reference)).limit(1);
    if (existing) {
      res.json({ message: "Already processed" });
      return;
    }

    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId)).limit(1);
    if (!plan || amount !== plan.priceKobo) {
      res.status(400).json({ error: "Amount mismatch" });
      return;
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const subId = generateId();

    await db.insert(subscriptionsTable).values({
      id: subId,
      userId,
      planId: plan.id,
      status: "active",
      startDate: now,
      expiryDate: expiry,
    });

    await db.update(paymentsTable).set({
      subscriptionId: subId,
      status: "confirmed",
      paidAt: now,
    }).where(eq(paymentsTable.paystackReference, reference));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (user) await sendPlanConfirmationEmail(user.email, user.fullName, plan.name);

    await auditLog("billing.payment.confirmed", { userId, metadata: { reference, planId, amount } });
  }

  res.json({ message: "OK" });
});

// GET /api/billing/payments
router.get("/payments", requireAuth, async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = parseInt(String(req.query.limit ?? "10"));
  const offset = (page - 1) * limit;

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.userId, req.userId!))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const total = payments.length;

  res.json({
    payments: payments.map((p) => ({
      id: p.id,
      planName: p.planName,
      amountKobo: p.amountKobo,
      status: p.status,
      type: p.type,
      paystackReference: p.paystackReference,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  });
});

export default router;

import { Router } from "express";
import { db, botsTable, subscriptionsTable, plansTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/dashboard/summary
router.get("/summary", requireAuth, async (req, res) => {
  const bots = await db.select().from(botsTable).where(eq(botsTable.userId, req.userId!));

  const totalBots   = bots.length;
  const runningBots = bots.filter(b => b.status === "running").length;
  const stoppedBots = bots.filter(b => ["stopped","not_created"].includes(b.status)).length;
  const crashedBots = bots.filter(b => b.status === "crashed").length;

  // Fetch user's active subscription with plan details
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .innerJoin(plansTable, eq(subscriptionsTable.planId, plansTable.id))
    .where(eq(subscriptionsTable.userId, req.userId!))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  const planName = sub ? (sub.plans?.name ?? "Basic") : "Basic";
  const botLimit = sub ? (sub.plans?.botLimit ?? 1) : 1;
  const ramPerBotMb = sub ? (sub.plans?.ramPerBotMb ?? 450) : 450;
  const storageGb = sub ? (sub.plans?.storageGb ?? 1) : 1;
  const cpuPerBot = sub ? (sub.plans?.cpuPerBot ?? 0.3) : 0.3;
  const planId = sub?.subscriptions?.planId ?? "basic";
  const subscriptionStatus = sub?.subscriptions?.status ?? "active";
  const daysUntilExpiry = sub?.subscriptions?.expiryDate
    ? Math.max(0, Math.ceil((sub.subscriptions.expiryDate.getTime() - Date.now()) / 86400000))
    : null;

  res.json({
    totalBots,
    runningBots,
    stoppedBots,
    crashedBots,
    planName,
    planId,
    botLimit,
    ramPerBotMb,
    storageGb,
    cpuPerBot,
    subscriptionStatus,
    daysUntilExpiry,
  });
});

export default router;

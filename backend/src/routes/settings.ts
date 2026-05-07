import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable, subscriptionsTable, plansTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { generateId } from "../lib/auth";
import { auditLog } from "../lib/audit";

const router = Router();

// GET /api/settings/free-trial — public, used by landing page
router.get("/free-trial", async (_req, res) => {
  try {
    const [enabledRow] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "free_trial_enabled"))
      .limit(1);
    const [daysRow] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "free_trial_days"))
      .limit(1);

    res.json({
      enabled: enabledRow ? enabledRow.value === "true" : true,
      days: daysRow ? parseInt(daysRow.value) : 7,
    });
  } catch {
    res.json({ enabled: true, days: 7 });
  }
});

// POST /api/settings/free-trial — authenticated user claims their free trial
router.post("/free-trial", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    // Check if free trial is enabled globally
    const [enabledRow] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "free_trial_enabled"))
      .limit(1);
    const isEnabled = enabledRow ? enabledRow.value === "true" : true;
    if (!isEnabled) {
      res.status(403).json({ error: "Free trial is not currently available" });
      return;
    }

    // Check if user already has an active or future subscription
    const now = new Date();
    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.userId, userId),
          gt(subscriptionsTable.expiryDate, now)
        )
      )
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "You already have an active subscription" });
      return;
    }

    // Get trial duration
    const [daysRow] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "free_trial_days"))
      .limit(1);
    const days = daysRow ? parseInt(daysRow.value) : 7;

    // Get basic plan
    const [basicPlan] = await db
      .select()
      .from(plansTable)
      .where(eq(plansTable.id, "basic"))
      .limit(1);

    if (!basicPlan) {
      res.status(500).json({ error: "Basic plan not found" });
      return;
    }

    const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const subId = generateId();

    await db.insert(subscriptionsTable).values({
      id: subId,
      userId,
      planId: basicPlan.id,
      status: "active",
      startDate: now,
      expiryDate: expiry,
    });

    await auditLog("user.free-trial.claimed", { userId, req, metadata: { planId: basicPlan.id, days } });

    res.json({
      message: `Free trial activated! You have ${days} days of ${basicPlan.name}.`,
      planId: basicPlan.id,
      planName: basicPlan.name,
      expiryDate: expiry.toISOString(),
      daysRemaining: days,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate free trial" });
  }
});

// PUT /api/settings/free-trial — admin only
router.put("/free-trial", requireAuth, requireAdmin, async (req, res) => {
  const { enabled, days } = req.body as { enabled: boolean; days?: number };

  const trialDays = days ?? 7;

  await db
    .insert(siteSettingsTable)
    .values({ key: "free_trial_enabled", value: String(enabled) })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: { value: String(enabled), updatedAt: new Date() },
    });

  await db
    .insert(siteSettingsTable)
    .values({ key: "free_trial_days", value: String(trialDays) })
    .onConflictDoUpdate({
      target: siteSettingsTable.key,
      set: { value: String(trialDays), updatedAt: new Date() },
    });

  res.json({ success: true, enabled, days: trialDays });
});

export default router;

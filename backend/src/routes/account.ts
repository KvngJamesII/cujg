import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { auditLog } from "../lib/audit";

const router = Router();

// PATCH /api/account/profile
router.patch("/profile", requireAuth, async (req, res) => {
  const { fullName, hasCompletedOnboarding } = req.body as {
    fullName?: string;
    hasCompletedOnboarding?: boolean;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName.trim();
  if (hasCompletedOnboarding !== undefined) updates.hasCompletedOnboarding = hasCompletedOnboarding;
  updates.updatedAt = new Date();

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!));
  await auditLog("user.profile.updated", { userId: req.userId, req });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    totpEnabled: user.totpEnabled,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    plan: null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;

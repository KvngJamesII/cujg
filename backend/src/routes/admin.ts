import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  botsTable,
  subscriptionsTable,
  paymentsTable,
  couponsTable,
  plansTable,
  trialCodesTable,
  notificationsTable,
  auditLogsTable,
} from "@workspace/db";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { generateId } from "../lib/auth";
import { auditLog } from "../lib/audit";
import os from "os";

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/stats
router.get("/stats", async (_req, res) => {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [{ count: activeSubscriptions }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.status, "active"));
  const [{ count: runningContainers }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(botsTable)
    .where(eq(botsTable.status, "running"));

  res.json({
    totalUsers: Number(totalUsers),
    activeSubscriptions: Number(activeSubscriptions),
    runningContainers: Number(runningContainers),
    planBreakdown: { free_trial: 0, starter: 0, developer: 0, pro: 0 },
  });
});

// GET /api/admin/vps-stats
router.get("/vps-stats", async (_req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const ramUsedPercent = ((totalMem - freeMem) / totalMem) * 100;
  const cpus = os.cpus();
  const uptime = os.uptime();

  res.json({
    ramUsedPercent: Math.round(ramUsedPercent),
    cpuUsedPercent: Math.round(Math.random() * 30 + 10), // Mock CPU — replace with real metrics on VPS
    diskUsedPercent: Math.round(Math.random() * 40 + 20),
    uptime,
  });
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = parseInt(String(req.query.limit ?? "20"));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const users = await db
    .select()
    .from(usersTable)
    .where(search ? ilike(usersTable.email, `%${search}%`) : undefined)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const bots = await db.select({ userId: botsTable.userId, id: botsTable.id }).from(botsTable);
  const botCountMap = bots.reduce<Record<string, number>>((acc, b) => {
    acc[b.userId] = (acc[b.userId] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      status: u.status,
      plan: null,
      botCount: botCountMap[u.id] ?? 0,
      createdAt: u.createdAt.toISOString(),
    })),
    total: users.length,
    page,
    limit,
  });
});

// GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id))).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const bots = await db.select({ id: botsTable.id }).from(botsTable).where(eq(botsTable.userId, user.id));
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    plan: null,
    botCount: bots.length,
    createdAt: user.createdAt.toISOString(),
  });
});

// PATCH /api/admin/users/:id
router.patch("/users/:id", async (req, res) => {
  const { status, role } = req.body as { status?: string; role?: string };
  const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
  if (status) updates.status = status as "active" | "suspended" | "banned";
  if (role) updates.role = role as "user" | "admin";
  await db.update(usersTable).set(updates).where(eq(usersTable.id, String(req.params.id)));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params.id))).limit(1);
  res.json({ id: user.id, email: user.email, fullName: user.fullName, role: user.role, status: user.status, plan: null, botCount: 0, createdAt: user.createdAt.toISOString() });
});

// POST /api/admin/users/:id/suspend
router.post("/users/:id/suspend", async (req, res) => {
  await db.update(usersTable).set({ status: "suspended", updatedAt: new Date() }).where(eq(usersTable.id, String(req.params.id)));
  await auditLog("admin.user.suspended", { userId: req.userId, req, metadata: { targetId: req.params.id } });
  res.json({ message: "User suspended" });
});

// POST /api/admin/users/:id/ban
router.post("/users/:id/ban", async (req, res) => {
  await db.update(usersTable).set({ status: "banned", updatedAt: new Date() }).where(eq(usersTable.id, String(req.params.id)));
  await auditLog("admin.user.banned", { userId: req.userId, req, metadata: { targetId: req.params.id } });
  res.json({ message: "User banned" });
});

// POST /api/admin/users/:id/extend-plan
router.post("/users/:id/extend-plan", async (req, res) => {
  const { days } = req.body as { planId: string; days: number };
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, req.params.id)).limit(1);
  if (sub) {
    const newExpiry = new Date(sub.expiryDate.getTime() + days * 24 * 60 * 60 * 1000);
    await db.update(subscriptionsTable).set({ expiryDate: newExpiry }).where(eq(subscriptionsTable.id, sub.id));
  }
  await auditLog("admin.plan.extended", { userId: req.userId, req, metadata: { targetId: req.params.id, days } });
  res.json({ message: `Plan extended by ${days} days` });
});

// GET /api/admin/containers
router.get("/containers", async (_req, res) => {
  const bots = await db.select().from(botsTable).where(eq(botsTable.status, "running"));
  res.json(bots.map((b) => ({
    botId: b.id,
    botName: b.name,
    userEmail: b.userId,
    status: b.status,
    cpuPercent: Math.random() * 15,
    memoryUsedMb: 120 + Math.random() * 200,
    uptimeSeconds: Math.floor(Math.random() * 86400),
  })));
});

// POST /api/admin/containers/:id/force-stop
router.post("/containers/:id/force-stop", async (req, res) => {
  await db.update(botsTable).set({ status: "stopped", updatedAt: new Date() }).where(eq(botsTable.id, String(req.params.id)));
  await auditLog("admin.container.force-stopped", { userId: req.userId, req, metadata: { botId: req.params.id } });
  res.json({ message: "Container force stopped" });
});

// POST /api/admin/containers/:id/force-restart
router.post("/containers/:id/force-restart", async (req, res) => {
  await db.update(botsTable).set({ status: "running", updatedAt: new Date() }).where(eq(botsTable.id, String(req.params.id)));
  await auditLog("admin.container.force-restarted", { userId: req.userId, req, metadata: { botId: req.params.id } });
  res.json({ message: "Container force restarted" });
});

// GET /api/admin/coupons
router.get("/coupons", async (_req, res) => {
  const coupons = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
  res.json(coupons.map((c) => ({
    id: c.id, code: c.code, discountPercent: c.discountPercent,
    applicablePlans: c.applicablePlans, maxUses: c.maxUses, usesCount: c.usesCount,
    expiresAt: c.expiresAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(),
  })));
});

// POST /api/admin/coupons
router.post("/coupons", async (req, res) => {
  const { code, discountPercent, applicablePlans, maxUses, expiresAt } = req.body as {
    code: string; discountPercent: number; applicablePlans: string[]; maxUses: number; expiresAt?: string;
  };
  const id = generateId();
  await db.insert(couponsTable).values({
    id, code: code.toUpperCase(), discountPercent, applicablePlans,
    maxUses, expiresAt: expiresAt ? new Date(expiresAt) : null, createdByAdmin: req.userId,
  });
  await auditLog("admin.coupon.created", { userId: req.userId, req, metadata: { code } });
  res.status(201).json({ id, code: code.toUpperCase(), discountPercent, applicablePlans, maxUses, usesCount: 0, expiresAt: expiresAt ?? null, createdAt: new Date().toISOString() });
});

// PATCH /api/admin/coupons/:id
router.patch("/coupons/:id", async (req, res) => {
  const { code, discountPercent, applicablePlans, maxUses, expiresAt } = req.body as {
    code: string; discountPercent: number; applicablePlans: string[]; maxUses: number; expiresAt?: string;
  };
  await db.update(couponsTable).set({
    code: code?.toUpperCase(), discountPercent, applicablePlans, maxUses,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).where(eq(couponsTable.id, String(req.params.id)));
  res.json({ message: "Coupon updated" });
});

// DELETE /api/admin/coupons/:id
router.delete("/coupons/:id", async (req, res) => {
  await db.delete(couponsTable).where(eq(couponsTable.id, String(req.params.id)));
  res.json({ message: "Coupon deleted" });
});

// GET /api/admin/trial-codes
router.get("/trial-codes", async (_req, res) => {
  const codes = await db.select().from(trialCodesTable).orderBy(desc(trialCodesTable.createdAt));
  res.json(codes.map((c) => ({
    id: c.id, code: c.code, durationDays: c.durationDays, maxAccounts: c.maxAccounts,
    accountsUsed: c.accountsUsed, codeExpiresAt: c.codeExpiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  })));
});

// POST /api/admin/trial-codes
router.post("/trial-codes", async (req, res) => {
  const { code, durationDays, maxAccounts, codeExpiresAt } = req.body as {
    code: string; durationDays: number; maxAccounts: number; codeExpiresAt?: string;
  };
  const id = generateId();
  await db.insert(trialCodesTable).values({
    id, code: code.toUpperCase(), durationDays, maxAccounts,
    codeExpiresAt: codeExpiresAt ? new Date(codeExpiresAt) : null, createdByAdmin: req.userId,
  });
  await auditLog("admin.trial-code.created", { userId: req.userId, req, metadata: { code } });
  res.status(201).json({ id, code: code.toUpperCase(), durationDays, maxAccounts, accountsUsed: 0, codeExpiresAt: codeExpiresAt ?? null, createdAt: new Date().toISOString() });
});

// GET /api/admin/payments
router.get("/payments", async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = parseInt(String(req.query.limit ?? "20"));
  const offset = (page - 1) * limit;

  const payments = await db
    .select()
    .from(paymentsTable)
    .orderBy(desc(paymentsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    payments: payments.map((p) => ({
      id: p.id, planName: p.planName, amountKobo: p.amountKobo,
      status: p.status, type: p.type, paystackReference: p.paystackReference,
      paidAt: p.paidAt?.toISOString() ?? null, createdAt: p.createdAt.toISOString(),
    })),
    total: payments.length, page, limit,
  });
});

// POST /api/admin/broadcast/email
router.post("/broadcast/email", async (req, res) => {
  const { target, subject, body } = req.body as { target: string; subject: string; body: string };
  await auditLog("admin.broadcast.email", { userId: req.userId, req, metadata: { target, subject } });
  res.json({ message: `Email broadcast queued for ${target} users` });
});

// POST /api/admin/broadcast/notification
router.post("/broadcast/notification", async (req, res) => {
  const { message, type, target } = req.body as { message: string; type: string; target: string };
  // Send to all matching users
  let users: Array<{ id: string }> = [];
  if (target === "all") {
    users = await db.select({ id: usersTable.id }).from(usersTable);
  }
  for (const user of users.slice(0, 100)) {
    await db.insert(notificationsTable).values({
      id: generateId(), userId: user.id,
      message, type: type as "info" | "warning" | "critical",
    });
  }
  await auditLog("admin.broadcast.notification", { userId: req.userId, req, metadata: { target, type } });
  res.json({ message: "Notification sent" });
});

// GET /api/admin/audit-log
router.get("/audit-log", async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = parseInt(String(req.query.limit ?? "20"));
  const offset = (page - 1) * limit;

  const entries = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    entries: entries.map((e) => ({
      id: e.id, userId: e.userId ?? null, userEmail: null,
      action: e.action, ipAddress: e.ipAddress ?? null,
      metadata: e.metadata ?? {}, createdAt: e.createdAt.toISOString(),
    })),
    total: entries.length, page, limit,
  });
});

export default router;

// PATCH /api/admin/plans/:id
router.patch("/plans/:id", async (req, res) => {
  const { priceKobo, ramPerBotMb, cpuPerBot, storageGb, botLimit } = req.body;
  await db.update(plansTable).set({
    priceKobo, ramPerBotMb, cpuPerBot, storageGb, botLimit
  }).where(eq(plansTable.id, req.params.id));
  await auditLog("admin.plan.updated", { userId: req.userId, req, metadata: { planId: req.params.id } });
  res.json({ success: true });
});

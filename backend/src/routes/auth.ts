import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, subscriptionsTable, plansTable, siteSettingsTable } from "@workspace/db";
import { botsTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import {
  generateId,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSecureToken,
  setAuthCookies,
  clearAuthCookies,
} from "../lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";
import { requireAuth } from "../middlewares/auth";
import { auditLog } from "../lib/audit";

const router = Router();

function formatUser(user: typeof usersTable.$inferSelect, plan?: string | null) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    totpEnabled: user.totpEnabled,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    plan: plan ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

async function getUserPlan(userId: string): Promise<string | null> {
  const [sub] = await db
    .select({ planId: subscriptionsTable.planId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);
  return sub?.planId ?? null;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { fullName, email, password, trialCode } = req.body as {
    fullName: string;
    email: string;
    password: string;
    trialCode?: string;
  };

  if (!fullName || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Check existing user
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const verifyToken = generateSecureToken();
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const userId = generateId();

  await db.insert(usersTable).values({
    id: userId,
    email: email.toLowerCase().trim(),
    passwordHash,
    fullName: fullName.trim(),
    emailVerified: true,
    emailVerifyToken: verifyToken,
    emailVerifyTokenExpiresAt: tokenExpiry,
    trialCodeUsed: trialCode ?? null,
  });

  // Fire-and-forget welcome email — non-blocking
  sendVerificationEmail(email, fullName, verifyToken).catch(() => {});
  await auditLog("user.register", { userId, req, metadata: { email } });

  // Grant free basic plan if global free trial is enabled
  let grantedPlan: string | null = null;
  try {
    const [enabledRow] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "free_trial_enabled")).limit(1);
    const isEnabled = enabledRow ? enabledRow.value === "true" : true;
    if (isEnabled) {
      const [daysRow] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "free_trial_days")).limit(1);
      const days = daysRow ? parseInt(daysRow.value) : 7;
      const [basicPlan] = await db.select().from(plansTable).where(eq(plansTable.id, "basic")).limit(1);
      if (basicPlan) {
        const now = new Date();
        const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        await db.insert(subscriptionsTable).values({
          id: generateId(),
          userId,
          planId: basicPlan.id,
          status: "active",
          startDate: now,
          expiryDate: expiry,
        });
        grantedPlan = basicPlan.id;

        // Create a default panel so the user can configure it immediately
        const panelId = generateId();
        await db.insert(botsTable).values({
          id: panelId,
          userId,
          name: "Panel",
          status: "not_created",
          plan: basicPlan.id,
        });
      }
    }
  } catch (err) {
    console.error("Failed to grant free trial basic plan:", err);
  }

  const accessToken = generateAccessToken(userId, "user");
  const refreshToken = generateRefreshToken(userId);
  setAuthCookies(res, accessToken, refreshToken);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  res.status(201).json({
    user: formatUser(user, grantedPlan),
    accessToken,
    requiresTwoFa: false,
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.status === "banned") {
    res.status(403).json({ error: "This account has been banned" });
    return;
  }

  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    res.status(429).json({ error: "Too many failed attempts. Try again later." });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const attempts = parseInt(user.loginAttempts ?? "0") + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.update(usersTable).set({
      loginAttempts: String(attempts),
      lockedUntil: lockedUntil ?? undefined,
    }).where(eq(usersTable.id, user.id));
    await auditLog("user.login.failed", { userId: user.id, req });
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Reset login attempts
  await db.update(usersTable).set({ loginAttempts: "0", lockedUntil: null }).where(eq(usersTable.id, user.id));
  await auditLog("user.login", { userId: user.id, req });

  if (user.totpEnabled) {
    // Store a temp cookie to track 2FA pending state
    res.cookie("pending_2fa_user", user.id, { httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000 });
    const plan = await getUserPlan(user.id);
    res.json({ user: formatUser(user, plan), accessToken: "", requiresTwoFa: true });
    return;
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  const plan = await getUserPlan(user.id);
  res.json({ user: formatUser(user, plan), accessToken, requiresTwoFa: false });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  clearAuthCookies(res);
  res.clearCookie("pending_2fa_user");
  res.json({ message: "Logged out" });
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }
  try {
    const { userId } = verifyRefreshToken(refreshToken);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.status !== "active") {
      res.status(401).json({ error: "User not found or suspended" });
      return;
    }
    const newAccessToken = generateAccessToken(user.id, user.role);
    setAuthCookies(res, newAccessToken, refreshToken);
    const plan = await getUserPlan(user.id);
    res.json({ user: formatUser(user, plan), accessToken: newAccessToken, requiresTwoFa: false });
  } catch {
    clearAuthCookies(res);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const plan = await getUserPlan(req.userId!);
  res.json(formatUser(user, plan));
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req, res) => {
  const { token } = req.body as { token: string };
  if (!token) {
    res.status(400).json({ error: "Verification token is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.emailVerifyToken, token),
        gt(usersTable.emailVerifyTokenExpiresAt, new Date())
      )
    )
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Invalid or expired verification token" });
    return;
  }

  await db.update(usersTable).set({
    emailVerified: true,
    emailVerifiedAt: new Date(),
    emailVerifyToken: null,
    emailVerifyTokenExpiresAt: null,
  }).where(eq(usersTable.id, user.id));

  await auditLog("user.email.verified", { userId: user.id, req });
  res.json({ message: "Email verified successfully" });
});

// POST /api/auth/resend-verification
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body as { email: string };
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email?.toLowerCase())).limit(1);
  if (user && !user.emailVerified) {
    const verifyToken = generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(usersTable).set({
      emailVerifyToken: verifyToken,
      emailVerifyTokenExpiresAt: tokenExpiry,
    }).where(eq(usersTable.id, user.id));
    await sendVerificationEmail(user.email, user.fullName, verifyToken);
  }
  // Always return success for security
  res.json({ message: "If an unverified account exists, a new verification email has been sent" });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body as { email: string };
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email?.toLowerCase())).limit(1);
  if (user) {
    const resetToken = generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await db.update(usersTable).set({
      passwordResetToken: resetToken,
      passwordResetTokenExpiresAt: tokenExpiry,
    }).where(eq(usersTable.id, user.id));
    await sendPasswordResetEmail(user.email, resetToken);
  }
  res.json({ message: "If that email is registered, a reset link has been sent." });
});

// POST /api/auth/reset-password

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new password are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await comparePassword(currentPassword, user.passwordHash ?? "");
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

  const newHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, req.userId!));
  await auditLog("user.password.changed", { userId: req.userId, req });
  res.json({ success: true });
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body as { token: string; password: string };
  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.passwordResetToken, token),
        gt(usersTable.passwordResetTokenExpiresAt, new Date())
      )
    )
    .limit(1);

  if (!user) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.update(usersTable).set({
    passwordHash,
    passwordResetToken: null,
    passwordResetTokenExpiresAt: null,
    loginAttempts: "0",
    lockedUntil: null,
  }).where(eq(usersTable.id, user.id));

  clearAuthCookies(res);
  await auditLog("user.password.reset", { userId: user.id, req });
  res.json({ message: "Password reset successfully. Please log in." });
});

// POST /api/auth/2fa/verify
router.post("/2fa/verify", async (req, res) => {
  const pendingUserId = req.cookies?.pending_2fa_user;
  const { code } = req.body as { code: string };

  if (!pendingUserId || !code) {
    res.status(401).json({ error: "No pending 2FA session" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pendingUserId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // TODO: Verify TOTP code with user.totpSecret using a TOTP library
  // For now, accept any 6-digit code in dev
  if (code.length !== 6) {
    res.status(401).json({ error: "Invalid 2FA code" });
    return;
  }

  res.clearCookie("pending_2fa_user");
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);
  const plan = await getUserPlan(user.id);
  await auditLog("user.2fa.verified", { userId: user.id, req });
  res.json({ user: formatUser(user, plan), accessToken, requiresTwoFa: false });
});

// POST /api/auth/2fa/setup
router.post("/2fa/setup", requireAuth, async (_req, res) => {
  res.json({
    secret: "JBSWY3DPEHPK3PXP",
    qrCodeUrl: "otpauth://totp/Redon3:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Redon3",
    backupCodes: ["abc123", "def456", "ghi789", "jkl012", "mno345"],
  });
});

// POST /api/auth/2fa/disable
router.post("/2fa/disable", requireAuth, async (req, res) => {
  await db.update(usersTable).set({ totpEnabled: false, totpSecret: null }).where(eq(usersTable.id, req.userId!));
  await auditLog("user.2fa.disabled", { userId: req.userId, req });
  res.json({ message: "2FA disabled" });
});

export default router;

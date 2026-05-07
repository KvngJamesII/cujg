import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Redon3 <no-reply@redon3.com>";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn({ to: payload.to, subject: payload.subject }, "Email skipped: RESEND_API_KEY not set");
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, "Resend email failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Email send error");
    return false;
  }
}

export async function sendVerificationEmail(
  to: string,
  fullName: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your Redon3 account",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:12px;">
        <h1 style="color:#6366F1;font-size:24px;margin-bottom:8px;">Redon3</h1>
        <h2 style="font-size:20px;margin-bottom:16px;">Verify your email</h2>
        <p style="color:#9CA3AF;margin-bottom:24px;">Hi ${fullName}, click the button below to verify your email address.</p>
        <a href="${link}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Verify Email</a>
        <p style="color:#6B7280;font-size:12px;margin-top:24px;">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Reset your Redon3 password",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:12px;">
        <h1 style="color:#6366F1;font-size:24px;margin-bottom:8px;">Redon3</h1>
        <h2 style="font-size:20px;margin-bottom:16px;">Reset your password</h2>
        <p style="color:#9CA3AF;margin-bottom:24px;">Click below to set a new password. This link expires in 1 hour.</p>
        <a href="${link}" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
        <p style="color:#6B7280;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendCrashAlert(
  to: string,
  botName: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `Your bot "${botName}" has crashed`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:12px;">
        <h1 style="color:#6366F1;font-size:24px;margin-bottom:8px;">Redon3</h1>
        <h2 style="font-size:20px;margin-bottom:16px;color:#EF4444;">Bot Crashed</h2>
        <p style="color:#9CA3AF;margin-bottom:24px;">Your bot <strong style="color:#F9FAFB;">${botName}</strong> has crashed after 5 restart attempts and has been stopped.</p>
        <a href="${APP_URL}/bots" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Bot</a>
      </div>
    `,
  });
}

export async function sendPlanConfirmationEmail(
  to: string,
  fullName: string,
  planName: string
): Promise<void> {
  await sendEmail({
    to,
    subject: `Your Redon3 ${planName} plan is active`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:12px;">
        <h1 style="color:#6366F1;font-size:24px;margin-bottom:8px;">Redon3</h1>
        <h2 style="font-size:20px;margin-bottom:16px;color:#10B981;">Payment Confirmed</h2>
        <p style="color:#9CA3AF;margin-bottom:24px;">Hi ${fullName}, your <strong style="color:#F9FAFB;">${planName}</strong> plan is now active. Your bots are ready to deploy.</p>
        <a href="${APP_URL}/dashboard" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard</a>
      </div>
    `,
  });
}

export async function sendRenewalReminderEmail(
  to: string,
  daysLeft: number,
  planName: string
): Promise<void> {
  const urgency = daysLeft <= 1 ? "expires today" : `expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
  await sendEmail({
    to,
    subject: `Your Redon3 plan ${urgency}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;color:#F9FAFB;padding:32px;border-radius:12px;">
        <h1 style="color:#6366F1;font-size:24px;margin-bottom:8px;">Redon3</h1>
        <h2 style="font-size:20px;margin-bottom:16px;color:#F59E0B;">Renewal Reminder</h2>
        <p style="color:#9CA3AF;margin-bottom:24px;">Your <strong style="color:#F9FAFB;">${planName}</strong> plan ${urgency}. Renew now to keep your bots running without interruption.</p>
        <a href="${APP_URL}/billing" style="display:inline-block;background:#6366F1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Renew Now</a>
      </div>
    `,
  });
}

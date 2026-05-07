import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "redon3-dev-secret-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "redon3-refresh-dev-secret-change-in-production";

export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY = "30d";

export function generateId(): string {
  return uuidv4();
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role, type: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): { userId: string; role: string } {
  const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role: string; type: string };
  if (payload.type !== "access") throw new Error("Invalid token type");
  return { userId: payload.userId, role: payload.role };
}

export function verifyRefreshToken(token: string): { userId: string } {
  const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string };
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return { userId: payload.userId };
}

export function generateSecureToken(): string {
  return uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");
}

export function encryptValue(value: string): string {
  // Simple reversible encoding for env variables (use proper encryption in production)
  return Buffer.from(value).toString("base64");
}

export function decryptValue(encrypted: string): string {
  return Buffer.from(encrypted, "base64").toString("utf8");
}

export function setAuthCookies(
  res: import("express").Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: (process.env.APP_URL ?? "").startsWith("https"),
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: (process.env.APP_URL ?? "").startsWith("https"),
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearAuthCookies(res: import("express").Response): void {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
}

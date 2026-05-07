import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, setAuthCookies } from "../lib/auth";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;

  if (!accessToken && !refreshToken) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (accessToken) {
    try {
      const { userId, role } = verifyAccessToken(accessToken);
      req.userId = userId;
      req.userRole = role;
      next();
      return;
    } catch {
      // Access token invalid, try refresh
    }
  }

  if (refreshToken) {
    try {
      const { userId } = verifyRefreshToken(refreshToken);
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user || user.status !== "active") {
        res.status(401).json({ error: "Account suspended or not found" });
        return;
      }
      const newAccessToken = generateAccessToken(user.id, user.role);
      setAuthCookies(res, newAccessToken, refreshToken);
      req.userId = user.id;
      req.userRole = user.role;
      next();
      return;
    } catch {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }
  }

  res.status(401).json({ error: "Authentication required" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

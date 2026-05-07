import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { generateId } from "./auth";
import { logger } from "./logger";
import type { Request } from "express";

export async function auditLog(
  action: string,
  options: {
    userId?: string;
    req?: Request;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      id: generateId(),
      userId: options.userId ?? null,
      action,
      ipAddress: options.req ? (options.req.ip ?? null) : null,
      userAgent: options.req ? (options.req.get("user-agent") ?? null) : null,
      metadata: options.metadata ?? null,
    });
  } catch (err) {
    logger.error({ err, action }, "Failed to write audit log");
  }
}

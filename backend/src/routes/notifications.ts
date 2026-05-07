import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateId } from "../lib/auth";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req, res) => {
  const notes = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.userId!));

  res.json(
    notes.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }))
  );
});

// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, async (req, res) => {
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, req.userId!));
  res.json({ message: "All notifications marked as read" });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, async (req, res) => {
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(eq(notificationsTable.id, String(req.params.id)), eq(notificationsTable.userId, req.userId!))
    );
  res.json({ message: "Notification marked as read" });
});

export async function createNotification(userId: string, message: string, type: "info" | "warning" | "critical" = "info") {
  await db.insert(notificationsTable).values({
    id: generateId(),
    userId,
    message,
    type,
  });
}

export default router;

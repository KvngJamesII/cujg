import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { subscriptionsTable } from "./subscriptions";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "confirmed", "failed"]);
export const paymentTypeEnum = pgEnum("payment_type", ["new", "renewal", "upgrade", "coupon_free"]);

export const paymentsTable = pgTable("payments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  subscriptionId: text("subscription_id").references(() => subscriptionsTable.id),
  planName: text("plan_name").notNull(),
  paystackReference: text("paystack_reference"),
  amountKobo: integer("amount_kobo").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  type: paymentTypeEnum("type").notNull().default("new"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;

import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const couponsTable = pgTable("coupons", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPercent: real("discount_percent").notNull(),
  applicablePlans: jsonb("applicable_plans").notNull().default([]),
  maxUses: integer("max_uses").notNull(),
  usesCount: integer("uses_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdByAdmin: text("created_by_admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponUsesTable = pgTable("coupon_uses", {
  id: text("id").primaryKey(),
  couponId: text("coupon_id").notNull().references(() => couponsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export const trialCodesTable = pgTable("trial_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  durationDays: integer("duration_days").notNull(),
  maxAccounts: integer("max_accounts").notNull(),
  accountsUsed: integer("accounts_used").notNull().default(0),
  codeExpiresAt: timestamp("code_expires_at"),
  createdByAdmin: text("created_by_admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trialCodeUsesTable = pgTable("trial_code_uses", {
  id: text("id").primaryKey(),
  trialCodeId: text("trial_code_id").notNull().references(() => trialCodesTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  trialStart: timestamp("trial_start").notNull(),
  trialEnd: timestamp("trial_end").notNull(),
  usedAt: timestamp("used_at").notNull().defaultNow(),
});

export type Coupon = typeof couponsTable.$inferSelect;
export type TrialCode = typeof trialCodesTable.$inferSelect;

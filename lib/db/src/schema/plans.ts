import { pgTable, text, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";

export const plansTable = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceKobo: integer("price_kobo").notNull(),
  botLimit: integer("bot_limit").notNull(),
  ramPerBotMb: integer("ram_per_bot_mb").notNull(),
  cpuPerBot: real("cpu_per_bot").notNull(),
  storageGb: integer("storage_gb").notNull(),
  features: jsonb("features").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Plan = typeof plansTable.$inferSelect;
export type InsertPlan = typeof plansTable.$inferInsert;

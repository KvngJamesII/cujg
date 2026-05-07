import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const botStatusEnum = pgEnum("bot_status", [
  "running", "stopped", "crashed", "suspended", "setting_up", "not_created"
]);

export const botRuntimeEnum = pgEnum("bot_runtime", ["nodejs", "python"]);

export const botsTable = pgTable("bots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  runtime: botRuntimeEnum("runtime"),
  startFile: text("start_file"),
  plan: text("plan").default("basic"),
  status: botStatusEnum("status").notNull().default("not_created"),
  deployStage: text("deploy_stage"),
  lastError: text("last_error"),
  deletionRequestedAt: timestamp("deletion_requested_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const envVariablesTable = pgTable("env_variables", {
  id: text("id").primaryKey(),
  botId: text("bot_id").notNull().references(() => botsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  key: text("key").notNull(),
  valueEncrypted: text("value_encrypted").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const containerStatsTable = pgTable("container_stats", {
  id: text("id").primaryKey(),
  botId: text("bot_id").notNull().references(() => botsTable.id),
  cpuPercent: text("cpu_percent").notNull().default("0"),
  memoryUsedMb: text("memory_used_mb").notNull().default("0"),
  memoryLimitMb: text("memory_limit_mb").notNull().default("512"),
  networkOutBytes: text("network_out_bytes").notNull().default("0"),
  networkInBytes: text("network_in_bytes").notNull().default("0"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export type Bot = typeof botsTable.$inferSelect;
export type InsertBot = typeof botsTable.$inferInsert;
export type EnvVariable = typeof envVariablesTable.$inferSelect;
export type ContainerStats = typeof containerStatsTable.$inferSelect;

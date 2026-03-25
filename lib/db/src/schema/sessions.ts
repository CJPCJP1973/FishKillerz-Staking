import { pgTable, varchar, numeric, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const huntSessionsTable = pgTable("hunt_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  shooterId: varchar("shooter_id").notNull(),
  gameName: varchar("game_name", { length: 200 }).notNull(),
  buyInUsd: numeric("buy_in_usd", { precision: 12, scale: 2 }).notNull(),
  sharePercent: numeric("share_percent", { precision: 5, scale: 2 }).notNull(),
  totalShares: integer("total_shares").notNull(),
  soldShares: integer("sold_shares").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  result: varchar("result", { length: 10 }),
  profitUsd: numeric("profit_usd", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertHuntSessionSchema = createInsertSchema(huntSessionsTable).omit({ id: true, createdAt: true });
export type InsertHuntSession = z.infer<typeof insertHuntSessionSchema>;
export type HuntSession = typeof huntSessionsTable.$inferSelect;

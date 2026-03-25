import { pgTable, varchar, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sharesTable = pgTable("shares", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: varchar("session_id").notNull(),
  slotIndex: integer("slot_index").notNull(),
  backerId: varchar("backer_id"),
  sharePercent: numeric("share_percent", { precision: 5, scale: 2 }).notNull(),
  priceUsd: numeric("price_usd", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  txId: varchar("tx_id", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShareSchema = createInsertSchema(sharesTable).omit({ id: true, createdAt: true });
export type InsertShare = z.infer<typeof insertShareSchema>;
export type Share = typeof sharesTable.$inferSelect;

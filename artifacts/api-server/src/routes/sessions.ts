import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, huntSessionsTable, sharesTable, usersTable } from "@workspace/db";
import {
  CreateSessionBody,
  UpdateSessionBody,
  PurchaseShareBody,
  ListSessionsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function buildSessionResponse(session: typeof huntSessionsTable.$inferSelect, shooter: typeof usersTable.$inferSelect | undefined) {
  return {
    id: session.id,
    shooterId: session.shooterId,
    shooterUsername: shooter?.username ?? shooter?.firstName ?? "Unknown",
    gameName: session.gameName,
    buyInUsd: Number(session.buyInUsd),
    sharePercent: Number(session.sharePercent),
    totalShares: session.totalShares,
    soldShares: session.soldShares,
    status: session.status,
    result: session.result ?? null,
    profitUsd: session.profitUsd != null ? Number(session.profitUsd) : null,
    createdAt: session.createdAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
  };
}

function buildShareResponse(
  share: typeof sharesTable.$inferSelect,
  backer?: typeof usersTable.$inferSelect | null,
) {
  return {
    id: share.id,
    sessionId: share.sessionId,
    slotIndex: share.slotIndex,
    backerId: share.backerId ?? null,
    backerUsername: backer?.username ?? backer?.firstName ?? null,
    sharePercent: Number(share.sharePercent),
    priceUsd: Number(share.priceUsd),
    status: share.status,
    txId: share.txId ?? null,
    createdAt: share.createdAt.toISOString(),
  };
}

router.get("/sessions", async (req: Request, res: Response) => {
  const parsed = ListSessionsQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;
  const shooterId = parsed.success ? parsed.data.shooterId : undefined;

  const sessions = await db
    .select()
    .from(huntSessionsTable)
    .where(
      and(
        status ? eq(huntSessionsTable.status, status) : undefined,
        shooterId ? eq(huntSessionsTable.shooterId, shooterId) : undefined,
      ),
    )
    .orderBy(desc(huntSessionsTable.createdAt));

  const shooterIds = [...new Set(sessions.map((s) => s.shooterId))];
  const shooters =
    shooterIds.length > 0
      ? await db
          .select()
          .from(usersTable)
          .then((rows) => rows.filter((r) => shooterIds.includes(r.id)))
      : [];

  const shooterMap = Object.fromEntries(shooters.map((s) => [s.id, s]));

  res.json(sessions.map((s) => buildSessionResponse(s, shooterMap[s.shooterId])));
});

router.post("/sessions", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { gameName, buyInUsd, sharePercent } = parsed.data;
  const totalShares = Math.floor(75 / sharePercent);
  const pricePerShare = (buyInUsd * sharePercent) / 100;

  const [session] = await db
    .insert(huntSessionsTable)
    .values({
      shooterId: req.user.id,
      gameName,
      buyInUsd: String(buyInUsd),
      sharePercent: String(sharePercent),
      totalShares,
      soldShares: 0,
      status: "active",
    })
    .returning();

  const shareSlots = Array.from({ length: totalShares }, (_, i) => ({
    sessionId: session.id,
    slotIndex: i,
    sharePercent: String(sharePercent),
    priceUsd: String(pricePerShare),
    status: "available",
  }));

  await db.insert(sharesTable).values(shareSlots);

  const shooter = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).then((r) => r[0]);

  res.status(201).json(buildSessionResponse(session, shooter));
});

router.get("/sessions/:id", async (req: Request, res: Response) => {
  const session = await db
    .select()
    .from(huntSessionsTable)
    .where(eq(huntSessionsTable.id, req.params.id))
    .then((r) => r[0]);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [shooter, shares] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, session.shooterId)).then((r) => r[0]),
    db.select().from(sharesTable).where(eq(sharesTable.sessionId, session.id)).orderBy(sharesTable.slotIndex),
  ]);

  const backerIds = [...new Set(shares.filter((s) => s.backerId).map((s) => s.backerId!))];
  const backers =
    backerIds.length > 0
      ? await db
          .select()
          .from(usersTable)
          .then((rows) => rows.filter((r) => backerIds.includes(r.id)))
      : [];
  const backerMap = Object.fromEntries(backers.map((b) => [b.id, b]));

  const shooterPaymentProfile = shooter
    ? {
        cashAppTag: shooter.cashAppTag ?? null,
        venmoUsername: shooter.venmoUsername ?? null,
        chimeHandle: shooter.chimeHandle ?? null,
        btcAddress: shooter.btcAddress ?? null,
        lightningAddress: shooter.lightningAddress ?? null,
      }
    : null;

  res.json({
    ...buildSessionResponse(session, shooter),
    shares: shares.map((s) => buildShareResponse(s, s.backerId ? backerMap[s.backerId] : null)),
    shooterPaymentProfile,
  });
});

router.patch("/sessions/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = await db
    .select()
    .from(huntSessionsTable)
    .where(eq(huntSessionsTable.id, req.params.id))
    .then((r) => r[0]);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.shooterId !== req.user.id) {
    res.status(401).json({ error: "Only the shooter can update this session" });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof huntSessionsTable.$inferInsert> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.result) updates.result = parsed.data.result;
  if (parsed.data.profitUsd !== undefined) updates.profitUsd = String(parsed.data.profitUsd);

  if (parsed.data.status === "completed" || parsed.data.status === "cancelled") {
    updates.completedAt = new Date();
  }

  const [updated] = await db
    .update(huntSessionsTable)
    .set(updates)
    .where(eq(huntSessionsTable.id, req.params.id))
    .returning();

  if (parsed.data.status === "completed" && parsed.data.result) {
    const shooter = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).then((r) => r[0]);
    if (shooter) {
      const newStreak = parsed.data.result === "win" ? shooter.winStreak + 1 : 0;
      const bestStreak = Math.max(shooter.bestWinStreak, newStreak);
      await db
        .update(usersTable)
        .set({ winStreak: newStreak, bestWinStreak: bestStreak })
        .where(eq(usersTable.id, req.user.id));
    }
  }

  const shooter = await db.select().from(usersTable).where(eq(usersTable.id, session.shooterId)).then((r) => r[0]);
  res.json(buildSessionResponse(updated, shooter));
});

router.post("/sessions/:id/shares", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const session = await db
    .select()
    .from(huntSessionsTable)
    .where(eq(huntSessionsTable.id, req.params.id))
    .then((r) => r[0]);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  if (session.status !== "active") {
    res.status(409).json({ error: "Session is not active" });
    return;
  }

  const parsed = PurchaseShareBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { slotIndex, txId } = parsed.data;

  const share = await db
    .select()
    .from(sharesTable)
    .where(and(eq(sharesTable.sessionId, session.id), eq(sharesTable.slotIndex, slotIndex)))
    .then((r) => r[0]);

  if (!share) {
    res.status(404).json({ error: "Share slot not found" });
    return;
  }

  if (share.status !== "available") {
    res.status(409).json({ error: "Share is not available" });
    return;
  }

  const [updated] = await db
    .update(sharesTable)
    .set({ backerId: req.user.id, status: "pending", txId })
    .where(eq(sharesTable.id, share.id))
    .returning();

  const backer = await db.select().from(usersTable).where(eq(usersTable.id, req.user.id)).then((r) => r[0]);
  res.status(201).json(buildShareResponse(updated, backer));
});

export default router;

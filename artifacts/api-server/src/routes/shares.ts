import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db, sharesTable, huntSessionsTable, usersTable } from "@workspace/db";
import { ConfirmShareResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/shares/:id/confirm", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const share = await db
    .select()
    .from(sharesTable)
    .where(eq(sharesTable.id, req.params.id))
    .then((r) => r[0]);

  if (!share) {
    res.status(404).json({ error: "Share not found" });
    return;
  }

  const session = await db
    .select()
    .from(huntSessionsTable)
    .where(eq(huntSessionsTable.id, share.sessionId))
    .then((r) => r[0]);

  if (!session || session.shooterId !== req.user.id) {
    res.status(401).json({ error: "Only the shooter can confirm shares" });
    return;
  }

  const [updated] = await db
    .update(sharesTable)
    .set({ status: "confirmed" })
    .where(eq(sharesTable.id, share.id))
    .returning();

  await db
    .update(huntSessionsTable)
    .set({ soldShares: session.soldShares + 1 })
    .where(eq(huntSessionsTable.id, session.id));

  const backer = share.backerId
    ? await db.select().from(usersTable).where(eq(usersTable.id, share.backerId)).then((r) => r[0])
    : undefined;

  res.json(
    ConfirmShareResponse.parse({
      id: updated.id,
      sessionId: updated.sessionId,
      slotIndex: updated.slotIndex,
      backerId: updated.backerId ?? null,
      backerUsername: backer?.username ?? backer?.firstName ?? null,
      sharePercent: Number(updated.sharePercent),
      priceUsd: Number(updated.priceUsd),
      status: updated.status,
      txId: updated.txId ?? null,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

export default router;

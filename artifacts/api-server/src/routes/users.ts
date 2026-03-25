import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, usersTable, huntSessionsTable, sharesTable } from "@workspace/db";
import {
  GetMyProfileResponse,
  UpdateMyProfileBody,
  UpdateMyProfileResponse,
  GetMyStatsResponse,
  GetLeaderboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatProfile(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username ?? user.firstName ?? "Hunter",
    email: user.email ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    winStreak: user.winStreak,
    createdAt: user.createdAt.toISOString(),
    cashAppTag: user.cashAppTag ?? null,
    venmoUsername: user.venmoUsername ?? null,
    chimeHandle: user.chimeHandle ?? null,
    btcAddress: user.btcAddress ?? null,
    lightningAddress: user.lightningAddress ?? null,
  };
}

router.get("/users/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .then((r) => r[0]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetMyProfileResponse.parse(formatProfile(user)));
});

router.patch("/users/me", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;
  if (parsed.data.cashAppTag !== undefined) updates.cashAppTag = parsed.data.cashAppTag || null;
  if (parsed.data.venmoUsername !== undefined) updates.venmoUsername = parsed.data.venmoUsername || null;
  if (parsed.data.chimeHandle !== undefined) updates.chimeHandle = parsed.data.chimeHandle || null;
  if (parsed.data.btcAddress !== undefined) updates.btcAddress = parsed.data.btcAddress || null;
  if (parsed.data.lightningAddress !== undefined) updates.lightningAddress = parsed.data.lightningAddress || null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user.id))
    .returning();

  res.json(UpdateMyProfileResponse.parse(formatProfile(updated)));
});

router.get("/users/me/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  const [user, myShares, mySessions] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)).then((r) => r[0]),
    db.select().from(sharesTable).where(eq(sharesTable.backerId, userId)),
    db.select().from(huntSessionsTable).where(eq(huntSessionsTable.shooterId, userId)),
  ]);

  const confirmedShares = myShares.filter((s) => s.status === "confirmed");
  const activeShares = myShares.filter((s) => s.status === "pending" || s.status === "confirmed");

  const totalInvestedUsd = confirmedShares.reduce((sum, s) => sum + Number(s.priceUsd), 0);

  const sessionMap: Record<string, typeof huntSessionsTable.$inferSelect> = {};
  if (confirmedShares.length > 0) {
    const sessionIds = [...new Set(confirmedShares.map((s) => s.sessionId))];
    const sessions = await db
      .select()
      .from(huntSessionsTable)
      .then((rows) => rows.filter((r) => sessionIds.includes(r.id)));
    sessions.forEach((s) => (sessionMap[s.id] = s));
  }

  let totalWonUsd = 0;
  for (const share of confirmedShares) {
    const session = sessionMap[share.sessionId];
    if (session?.status === "completed" && session.result === "win" && session.profitUsd) {
      totalWonUsd += (Number(session.profitUsd) * Number(share.sharePercent)) / 100;
    }
  }

  const completedSessions = mySessions.filter((s) => s.status === "completed");
  const wins = completedSessions.filter((s) => s.result === "win").length;
  const losses = completedSessions.filter((s) => s.result === "loss").length;

  res.json(
    GetMyStatsResponse.parse({
      backerStats: {
        totalInvestedUsd,
        totalWonUsd,
        activeShares: activeShares.length,
      },
      shooterStats: {
        totalSessions: mySessions.length,
        wins,
        losses,
        winStreak: user?.winStreak ?? 0,
        bestWinStreak: user?.bestWinStreak ?? 0,
      },
    }),
  );
});

router.get("/leaderboard", async (req: Request, res: Response) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.winStreak))
    .limit(20);

  const userIds = users.map((u) => u.id);
  const sessions =
    userIds.length > 0
      ? await db
          .select()
          .from(huntSessionsTable)
          .then((rows) => rows.filter((r) => userIds.includes(r.shooterId) && r.status === "completed"))
      : [];

  const winCounts: Record<string, number> = {};
  const sessionCounts: Record<string, number> = {};
  for (const s of sessions) {
    sessionCounts[s.shooterId] = (sessionCounts[s.shooterId] ?? 0) + 1;
    if (s.result === "win") winCounts[s.shooterId] = (winCounts[s.shooterId] ?? 0) + 1;
  }

  const entries = users
    .filter((u) => u.username)
    .map((u) => ({
      userId: u.id,
      username: u.username ?? u.firstName ?? "Hunter",
      profileImageUrl: u.profileImageUrl ?? null,
      winStreak: u.winStreak,
      totalWins: winCounts[u.id] ?? 0,
      totalSessions: sessionCounts[u.id] ?? 0,
    }));

  res.json(GetLeaderboardResponse.parse(entries));
});

export default router;

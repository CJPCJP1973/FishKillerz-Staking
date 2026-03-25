import { db, usersTable, huntSessionsTable, sharesTable } from "@workspace/db";

async function seed() {
  console.log("Seeding example data...");

  const [shooter1, shooter2, shooter3] = await db
    .insert(usersTable)
    .values([
      {
        id: "seed-shooter-1",
        email: "apex@deepsea.gg",
        firstName: "Apex",
        lastName: "Hunter",
        username: "ApexHunter",
        winStreak: 5,
        bestWinStreak: 7,
        profileImageUrl: null,
      },
      {
        id: "seed-shooter-2",
        email: "shadowfin@deepsea.gg",
        firstName: "Shadow",
        lastName: "Fin",
        username: "ShadowFin",
        winStreak: 3,
        bestWinStreak: 5,
        profileImageUrl: null,
      },
      {
        id: "seed-shooter-3",
        email: "deepstrike@deepsea.gg",
        firstName: "Deep",
        lastName: "Strike",
        username: "DeepStrike",
        winStreak: 0,
        bestWinStreak: 4,
        profileImageUrl: null,
      },
    ])
    .onConflictDoUpdate({
      target: usersTable.id,
      set: { username: usersTable.username },
    })
    .returning();

  const sessions = await db
    .insert(huntSessionsTable)
    .values([
      {
        id: "seed-session-1",
        shooterId: "seed-shooter-1",
        gameName: "Golden Dragon",
        buyInUsd: "500",
        sharePercent: "5",
        totalShares: 15,
        soldShares: 8,
        status: "active",
      },
      {
        id: "seed-session-2",
        shooterId: "seed-shooter-2",
        gameName: "Midnight Shark",
        buyInUsd: "1000",
        sharePercent: "5",
        totalShares: 15,
        soldShares: 3,
        status: "active",
      },
      {
        id: "seed-session-3",
        shooterId: "seed-shooter-3",
        gameName: "Abyssal King",
        buyInUsd: "200",
        sharePercent: "10",
        totalShares: 7,
        soldShares: 7,
        status: "active",
      },
      {
        id: "seed-session-4",
        shooterId: "seed-shooter-1",
        gameName: "Deep Current",
        buyInUsd: "300",
        sharePercent: "5",
        totalShares: 15,
        soldShares: 15,
        status: "completed",
        result: "win",
        profitUsd: "1200",
        completedAt: new Date(Date.now() - 86400000),
      },
    ])
    .onConflictDoNothing()
    .returning();

  if (sessions.length > 0) {
    const shareSlots = [];
    for (const session of sessions) {
      const priceUsd = (Number(session.buyInUsd) * Number(session.sharePercent)) / 100;
      for (let i = 0; i < session.totalShares; i++) {
        const isSold = i < session.soldShares;
        shareSlots.push({
          id: `seed-share-${session.id}-${i}`,
          sessionId: session.id,
          slotIndex: i,
          sharePercent: session.sharePercent,
          priceUsd: String(priceUsd),
          status: isSold ? "confirmed" : "available",
          backerId: isSold ? "seed-shooter-2" : null,
        });
      }
    }
    await db.insert(sharesTable).values(shareSlots).onConflictDoNothing();
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

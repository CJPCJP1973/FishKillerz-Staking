import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetMyStats,
  useGetMyProfile,
  useListSessions,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatCurrency } from "@/lib/utils";
import {
  Loader2,
  DollarSign,
  Trophy,
  TrendingUp,
  Activity,
  PlusCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Redirect } from "wouter";
import { CreateSessionModal } from "@/components/CreateSessionModal";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    confirmed: { label: "Confirmed", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    available: { label: "Available", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    active: { label: "Active", className: "bg-primary/20 text-primary border-primary/30" },
    completed: { label: "Completed", className: "bg-muted/50 text-muted-foreground border-white/10" },
    cancelled: { label: "Cancelled", className: "bg-destructive/20 text-destructive border-destructive/30" },
  };
  const cfg = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useGetMyStats({
    query: { enabled: isAuthenticated },
  });
  const { data: profile } = useGetMyProfile({
    query: { enabled: isAuthenticated },
  });

  // Load sessions shot by this user (shooter view)
  const { data: mySessions, isLoading: sessionsLoading } = useListSessions(
    { shooterId: user?.id },
    { query: { enabled: isAuthenticated && !!user?.id } },
  );

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated) return <Redirect to="/" />;

  const isSeller = (mySessions?.length ?? 0) > 0 || (stats?.shooterStats.totalSessions ?? 0) > 0;
  const isLoading = statsLoading || sessionsLoading;

  return (
    <AppLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-display text-white uppercase tracking-widest text-glow-primary">
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="text-white font-bold">{profile?.username || "Hunter"}</span>
          </p>
        </div>
        <CreateSessionModal />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* === BACKER STATS === */}
          <section>
            <h2 className="text-sm font-display tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Backer Portfolio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-primary">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase">Total Invested</h3>
                </div>
                <div className="text-3xl font-bold text-white">{formatCurrency(stats?.backerStats.totalInvestedUsd || 0)}</div>
              </div>
              <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-secondary">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-secondary/10 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                  </div>
                  <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase">Total Won</h3>
                </div>
                <div className="text-3xl font-bold text-white">{formatCurrency(stats?.backerStats.totalWonUsd || 0)}</div>
              </div>
              <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-white/5 rounded-xl">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase">Active Stakes</h3>
                </div>
                <div className="text-3xl font-bold text-white">{stats?.backerStats.activeShares || 0} Shares</div>
              </div>
            </div>
          </section>

          {/* === SHOOTER SECTION (always visible — Create Session CTA if no history) === */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-display tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-secondary" /> Shooter Hub
              </h2>
              {isSeller && (
                <Link
                  href="/"
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  View Live Feed <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {isSeller ? (
              <div className="space-y-4">
                {/* Shooter Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-4 rounded-2xl border border-white/5">
                    <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Total Hunts</h3>
                    <div className="text-2xl font-bold text-white">{stats?.shooterStats.totalSessions || 0}</div>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/5">
                    <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Win / Loss</h3>
                    <div className="text-2xl font-bold text-white">
                      <span className="text-green-400">{stats?.shooterStats.wins || 0}</span>
                      <span className="text-white/20 mx-1">/</span>
                      <span className="text-destructive">{stats?.shooterStats.losses || 0}</span>
                    </div>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-secondary/30 bg-secondary/5">
                    <h3 className="text-xs font-display tracking-widest text-secondary uppercase mb-2">Streak</h3>
                    <div className="text-2xl font-bold text-secondary flex items-center gap-1">
                      {stats?.shooterStats.winStreak || 0} 🔥
                    </div>
                  </div>
                  <div className="glass-panel p-4 rounded-2xl border border-white/5">
                    <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Best Streak</h3>
                    <div className="text-2xl font-bold text-white">{stats?.shooterStats.bestWinStreak || 0}</div>
                  </div>
                </div>

                {/* My Sessions */}
                {mySessions && mySessions.length > 0 && (
                  <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5">
                      <h3 className="font-display uppercase tracking-widest text-sm text-white">My Sessions</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                      {mySessions.map((s) => (
                        <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors group">
                          <div>
                            <p className="font-bold text-white group-hover:text-primary transition-colors">{s.gameName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatCurrency(s.buyInUsd)} buy-in · {s.sharePercent}% shares · {s.soldShares}/{s.totalShares} sold
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={s.status} />
                            {s.result && (
                              s.result === "win"
                                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                                : <XCircle className="w-4 h-4 text-destructive" />
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6 border-dashed border-secondary/20">
                <div className="p-4 bg-secondary/10 rounded-2xl">
                  <PlusCircle className="w-10 h-10 text-secondary" />
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-display uppercase tracking-widest text-white mb-1">Start Shooting</h3>
                  <p className="text-muted-foreground text-sm mb-4">Create a session and let backers fund your buy-in. You keep 25%, backers split 75%.</p>
                  <CreateSessionModal />
                </div>
              </div>
            )}
          </section>

          <Separator className="bg-white/5" />

          {/* === TRANSACTION HISTORY === */}
          <section>
            <h2 className="text-sm font-display tracking-widest text-muted-foreground uppercase mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Transaction History
            </h2>
            <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/10">
              <p className="text-muted-foreground text-sm">
                {(stats?.backerStats.activeShares ?? 0) > 0
                  ? `You have ${stats?.backerStats.activeShares} active share(s). Visit a session to track status.`
                  : "No transactions yet. Buy a share to get started."}
              </p>
              <Link href="/" className="inline-flex items-center gap-2 mt-4 text-primary text-sm hover:underline">
                Browse Active Hunts <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}

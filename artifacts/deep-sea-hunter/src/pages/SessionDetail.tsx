import { useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetSession,
  usePurchaseShare,
  useConfirmShare,
  getGetSessionQueryKey,
  getGetMyStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { AppLayout } from "@/components/layout/AppLayout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Clock,
  Copy,
  Check,
  Bitcoin,
  Zap,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

const COLORS = {
  shooter: "#fbbf24",
  available: "#22c55e",
  pending: "#eab308",
  confirmed: "#ef4444",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-white/10 shrink-0"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PaymentRow({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg gap-3">
      <span className="font-bold text-white text-sm shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <code className={`text-primary text-xs truncate ${mono ? "font-mono" : ""}`}>{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

export default function SessionDetail() {
  const [, params] = useRoute("/sessions/:id");
  const id = params?.id || "";
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: session, isLoading, error } = useGetSession(id);
  const purchaseMutation = usePurchaseShare();
  const confirmMutation = useConfirmShare();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [txId, setTxId] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-32">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }
  if (error || !session) {
    return (
      <AppLayout>
        <div className="text-center py-32 text-destructive font-display text-xl uppercase tracking-widest">
          Session not found
        </div>
      </AppLayout>
    );
  }

  const isShooter = user?.id === session.shooterId;
  const numBackerShares = Math.floor(75 / session.sharePercent);
  const pricePerShare = session.buyInUsd * (session.sharePercent / 100);

  const chartData = [
    { name: "Shooter Stake", value: 25, type: "shooter", tooltip: "Locked Shooter Equity (25%)" },
  ];

  const shareMap = new Map<number, (typeof session.shares)[number]>();
  session.shares.forEach((s) => shareMap.set(s.slotIndex, s));

  for (let i = 0; i < numBackerShares; i++) {
    const existing = shareMap.get(i);
    if (existing) {
      chartData.push({
        name: `Share ${i + 1}`,
        value: session.sharePercent,
        type: existing.status,
        tooltip:
          existing.status === "pending"
            ? `PENDING APPROVAL — ${existing.backerUsername || "Unknown"}`
            : existing.status === "confirmed"
            ? `SOLD — ${existing.backerUsername || "Unknown"}`
            : `Share ${i + 1}`,
      });
    } else {
      chartData.push({
        name: `Share ${i + 1}`,
        value: session.sharePercent,
        type: "available",
        tooltip: `AVAILABLE — ${formatCurrency(pricePerShare)}`,
      });
    }
  }

  const handlePieClick = (data: any, index: number) => {
    if (index === 0) return;
    const slotIndex = index - 1;
    if (data.payload.type !== "available") return;
    if (!user) {
      window.location.href = "/api/login";
      return;
    }
    if (isShooter) {
      toast({ title: "Action denied", description: "Shooters cannot buy their own shares", variant: "destructive" });
      return;
    }
    setSelectedSlot(slotIndex);
    setTxId("");
    setDrawerOpen(true);
  };

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlot === null || !txId.trim() || purchaseMutation.isPending) return;
    purchaseMutation.mutate(
      { id, data: { slotIndex: selectedSlot, txId: txId.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Stake Secured", description: "Your transaction is pending shooter confirmation." });
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetMyStatsQueryKey() });
          setDrawerOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleConfirm = (shareId: string) => {
    if (confirmingId === shareId || confirmMutation.isPending) return;
    setConfirmingId(shareId);
    confirmMutation.mutate(
      { id: shareId },
      {
        onSuccess: () => {
          toast({ title: "Share Confirmed", description: "The backer's stake is now locked in.", className: "border-green-500/30 bg-green-950" });
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
          setConfirmingId(null);
        },
        onError: (err: any) => {
          toast({ title: "Confirmation failed", description: err.message, variant: "destructive" });
          setConfirmingId(null);
        },
      },
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="glass-panel p-3 rounded-lg border border-primary/20 shadow-xl max-w-[200px]">
          <p className="text-white font-bold text-sm">{entry.tooltip}</p>
          {entry.type === "available" && (
            <p className="text-xs text-primary mt-1 uppercase font-display tracking-widest">Click to secure</p>
          )}
          {entry.type === "pending" && (
            <p className="text-xs text-yellow-400 mt-1 uppercase font-display tracking-widest">Awaiting approval</p>
          )}
        </div>
      );
    }
    return null;
  };

  const pendingShares = session.shares.filter((s) => s.status === "pending");
  const pp = (session as any).shooterPaymentProfile;
  const hasPaymentInfo = pp && (pp.cashAppTag || pp.venmoUsername || pp.chimeHandle || pp.btcAddress || pp.lightningAddress);

  return (
    <AppLayout>
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Session Info */}
          <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-primary">
            <div className="mb-6">
              <div className="text-xs text-primary font-display tracking-widest uppercase mb-2">
                {session.status === "active" ? "Live Session" : session.status}
              </div>
              <h1 className="text-3xl font-bold font-display text-white leading-tight">{session.gameName}</h1>
              <p className="text-muted-foreground mt-2">
                Hosted by <span className="text-white font-bold">{session.shooterUsername}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                <span className="text-muted-foreground font-display uppercase tracking-widest text-sm">Total Buy-In</span>
                <span className="text-2xl font-bold text-white">{formatCurrency(session.buyInUsd)}</span>
              </div>
              <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                <span className="text-muted-foreground font-display uppercase tracking-widest text-sm">Share Size</span>
                <span className="text-xl font-bold text-secondary">{session.sharePercent}%</span>
              </div>
              <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                <span className="text-muted-foreground font-display uppercase tracking-widest text-sm">Share Price</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(pricePerShare)}</span>
              </div>
              <div className="bg-background/50 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                <span className="text-muted-foreground font-display uppercase tracking-widest text-sm">Shares</span>
                <span className="text-sm font-bold text-white">{session.soldShares} / {numBackerShares} sold</span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-white/10 text-sm text-muted-foreground flex items-center justify-between">
              <span>Created {formatDate(session.createdAt)}</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${session.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-white"}`}>
                {session.status}
              </span>
            </div>
          </div>

          {/* Pending Approvals (shooter only) */}
          {isShooter && pendingShares.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 font-display uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-5 h-5" /> Pending Approvals
              </h3>
              <div className="space-y-3">
                {pendingShares.map((share) => (
                  <div key={share.id} className="bg-background/60 p-3 rounded-xl border border-white/5 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-bold">{share.backerUsername || "Unknown"}</span>
                      <span className="text-yellow-400 text-xs">Slot {share.slotIndex + 1}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 font-mono bg-black/50 p-2 rounded truncate">
                      Tx: {share.txId}
                    </div>
                    <button
                      onClick={() => handleConfirm(share.id)}
                      disabled={confirmingId === share.id || confirmMutation.isPending}
                      className="w-full py-2 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/50 rounded-lg transition-all font-bold uppercase tracking-wider text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {confirmingId === share.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      Confirm Payment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pie Chart */}
        <div className="lg:col-span-2">
          <div className="glass-panel p-8 rounded-2xl h-full flex flex-col items-center justify-center relative">
            <h3 className="absolute top-8 left-8 text-xl font-bold font-display tracking-widest text-white">
              STAKE DISTRIBUTION
            </h3>

            <div className="w-full max-w-[460px] aspect-square mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="42%"
                    outerRadius="78%"
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handlePieClick}
                    stroke="none"
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[entry.type as keyof typeof COLORS] ?? "#888"}
                        opacity={entry.type === "available" ? 0.9 : 0.85}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-5 mt-6">
              {[
                { key: "shooter", label: "Shooter (Locked)" },
                { key: "available", label: "Available" },
                { key: "pending", label: "Pending Approval" },
                { key: "confirmed", label: "Sold" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 text-sm text-white">
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {session.status === "active" && !isShooter && (
              <p className="mt-4 text-xs text-muted-foreground text-center">
                Click a <span style={{ color: COLORS.available }}>green slice</span> to secure your stake
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Buy Now Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-card border-l border-primary/20 sm:max-w-md w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-display uppercase tracking-widest text-primary text-glow-primary">
              Secure Your Stake
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-base">
              You are purchasing 1 share ({session.sharePercent}%) of the backer pool for{" "}
              <strong className="text-white">{formatCurrency(pricePerShare)}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            {/* Payment Info */}
            <div className="bg-background/60 p-4 rounded-xl border border-white/5">
              <h4 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-3">
                Send Payment To <span className="text-white font-bold">{session.shooterUsername}</span>
              </h4>

              {hasPaymentInfo ? (
                <div className="space-y-2">
                  <PaymentRow label="CashApp" value={pp?.cashAppTag} />
                  <PaymentRow label="Venmo" value={pp?.venmoUsername} />
                  <PaymentRow label="Chime" value={pp?.chimeHandle} />
                  {pp?.btcAddress && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Bitcoin className="w-3.5 h-3.5 text-secondary" />
                        <span className="font-bold text-white text-sm">Bitcoin (BTC)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-secondary text-xs font-mono truncate flex-1">{pp.btcAddress}</code>
                        <CopyButton value={pp.btcAddress} />
                      </div>
                    </div>
                  )}
                  {pp?.lightningAddress && (
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="font-bold text-white text-sm">Lightning</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-yellow-400 text-xs font-mono truncate flex-1">{pp.lightningAddress}</code>
                        <CopyButton value={pp.lightningAddress} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  This shooter hasn't set up their payout profile yet. Contact them directly.
                </p>
              )}
            </div>

            {/* Submit Proof */}
            <form onSubmit={handlePurchase} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white">Your Username / Transaction ID</label>
                <input
                  required
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl py-3 px-4 text-white placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="e.g. @MyVenmo, TX hash, $CashTag"
                />
                <p className="text-xs text-muted-foreground">
                  Include your payment username so the shooter can verify the transaction.
                </p>
              </div>

              <button
                type="submit"
                disabled={purchaseMutation.isPending || !txId.trim()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
              >
                {purchaseMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                Submit Proof &amp; Lock Share
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

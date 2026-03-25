import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetSession, usePurchaseShare, useConfirmShare, getGetSessionQueryKey, getGetMyStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { AppLayout } from "@/components/layout/AppLayout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft, ShieldCheck, Clock, CheckCircle2, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

// Recharts colors match CSS vars
const COLORS = {
  shooter: "hsl(var(--secondary))", // Gold
  available: "hsl(142 71% 45%)", // Green
  pending: "hsl(var(--secondary))", // Gold/Yellow
  confirmed: "hsl(350 89% 60%)" // Red
};

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

  if (isLoading) return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div></AppLayout>;
  if (error || !session) return <AppLayout><div className="text-center py-32 text-destructive font-display text-xl uppercase tracking-widest">Session not found</div></AppLayout>;

  const isShooter = user?.id === session.shooterId;

  // Prepare Pie Chart Data
  // Total shares = 75 / sharePercent
  const numBackerShares = Math.floor(75 / session.sharePercent);
  const pricePerShare = session.buyInUsd * (session.sharePercent / 100);
  
  const chartData = [
    { name: "Shooter Stake", value: 25, type: "shooter", tooltip: "Locked Shooter Equity (25%)" }
  ];

  const shareMap = new Map();
  session.shares.forEach(s => shareMap.set(s.slotIndex, s));

  for (let i = 0; i < numBackerShares; i++) {
    const existingShare = shareMap.get(i);
    if (existingShare) {
      chartData.push({
        name: `Share ${i+1}`,
        value: session.sharePercent,
        type: existingShare.status,
        tooltip: `${existingShare.status.toUpperCase()} - ${existingShare.backerUsername || 'Unknown'}`
      });
    } else {
      chartData.push({
        name: `Share ${i+1}`,
        value: session.sharePercent,
        type: "available",
        tooltip: `AVAILABLE - ${formatCurrency(pricePerShare)}`
      });
    }
  }

  const handlePieClick = (data: any, index: number) => {
    // index 0 is shooter. The rest are slots 0 to N-1
    if (index === 0) return; 
    const slotIndex = index - 1;
    
    if (data.payload.type === 'available') {
      if (!user) {
        window.location.href = '/api/login';
        return;
      }
      if (isShooter) {
        toast({ title: "Action denied", description: "Shooters cannot buy their own shares", variant: "destructive" });
        return;
      }
      setSelectedSlot(slotIndex);
      setDrawerOpen(true);
      setTxId("");
    }
  };

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlot === null || !txId.trim()) return;

    purchaseMutation.mutate(
      { id, data: { slotIndex: selectedSlot, txId } },
      {
        onSuccess: () => {
          toast({ title: "Stake Secured", description: "Your transaction is pending shooter confirmation." });
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetMyStatsQueryKey() });
          setDrawerOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleConfirm = (shareId: string) => {
    confirmMutation.mutate(
      { id: shareId },
      {
        onSuccess: () => {
          toast({ title: "Share Confirmed", description: "The backer's stake is locked in." });
          queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
        }
      }
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-lg border border-primary/20 shadow-xl">
          <p className="text-white font-bold">{payload[0].payload.tooltip}</p>
          {payload[0].payload.type === 'available' && (
            <p className="text-xs text-primary mt-1 uppercase font-display tracking-widest">Click to secure</p>
          )}
        </div>
      );
    }
    return null;
  };

  const pendingShares = session.shares.filter(s => s.status === 'pending');

  return (
    <AppLayout>
      <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-white mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Feed
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Info & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-primary">
            <div className="mb-6">
              <div className="text-xs text-primary font-display tracking-widest uppercase mb-2">Live Session</div>
              <h1 className="text-3xl font-bold font-display text-white leading-tight">{session.gameName}</h1>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                Hosted by <span className="text-white font-bold">{session.shooterUsername}</span>
              </p>
            </div>

            <div className="space-y-4">
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
            </div>

            <div className="mt-6 pt-6 border-t border-white/10 text-sm text-muted-foreground flex items-center justify-between">
              <span>Created {formatDate(session.createdAt)}</span>
              <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${session.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-muted text-white'}`}>
                {session.status}
              </span>
            </div>
          </div>

          {/* Shooter Actions (Only visible to shooter) */}
          {isShooter && pendingShares.length > 0 && (
            <div className="glass-panel p-6 rounded-2xl border border-secondary/30 box-glow-secondary">
              <h3 className="text-lg font-bold text-secondary mb-4 font-display uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-5 h-5" /> Pending Approvals
              </h3>
              <div className="space-y-3">
                {pendingShares.map(share => (
                  <div key={share.id} className="bg-background/60 p-3 rounded-xl border border-white/5 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-bold">{share.backerUsername}</span>
                      <span className="text-secondary">Slot {share.slotIndex + 1}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3 font-mono bg-black/50 p-2 rounded truncate">
                      Tx: {share.txId}
                    </div>
                    <button 
                      onClick={() => handleConfirm(share.id)}
                      disabled={confirmMutation.isPending}
                      className="w-full py-2 bg-secondary/10 hover:bg-secondary text-secondary hover:text-secondary-foreground border border-secondary/50 rounded-lg transition-colors font-bold uppercase tracking-wider text-xs"
                    >
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
            <h3 className="absolute top-8 left-8 text-xl font-bold font-display tracking-widest text-white">STAKE DISTRIBUTION</h3>
            
            <div className="w-full max-w-[500px] aspect-square mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="80%"
                    paddingAngle={2}
                    dataKey="value"
                    onClick={handlePieClick}
                    stroke="none"
                    className="cursor-pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.type as keyof typeof COLORS]} 
                        className={entry.type === 'available' ? 'hover:opacity-80 transition-opacity drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'opacity-90'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-sm text-white">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.shooter }} />
                <span>Shooter (Locked)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.available }} />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.pending }} />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.confirmed }} />
                <span>Sold</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Purchase Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-card border-l-primary/20 sm:max-w-md w-full">
          <SheetHeader className="mb-8">
            <SheetTitle className="text-2xl font-display uppercase tracking-widest text-primary text-glow-primary">Secure Your Stake</SheetTitle>
            <SheetDescription className="text-muted-foreground text-base">
              You are purchasing 1 share ({session.sharePercent}%) of the backer pool for <strong className="text-white">{formatCurrency(pricePerShare)}</strong>.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="bg-background p-4 rounded-xl border border-white/5">
              <h4 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-3">Send Payment To</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="font-bold text-white text-sm">CashApp</span>
                  <div className="flex items-center gap-2">
                    <code className="text-primary">$HunterPay</code>
                    <Copy className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="font-bold text-white text-sm">Bitcoin (BTC)</span>
                  <div className="flex items-center gap-2">
                    <code className="text-secondary text-xs truncate max-w-[120px]">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code>
                    <Copy className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-white" />
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handlePurchase} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-white">Transaction Reference / ID</label>
                <input
                  required
                  value={txId}
                  onChange={e => setTxId(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Paste TX ID or App Handle"
                />
                <p className="text-xs text-muted-foreground">Required for the shooter to verify and confirm your share.</p>
              </div>

              <button
                type="submit"
                disabled={purchaseMutation.isPending || !txId.trim()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:bg-primary/90 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {purchaseMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                Submit Proof & Lock Share
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

    </AppLayout>
  );
}

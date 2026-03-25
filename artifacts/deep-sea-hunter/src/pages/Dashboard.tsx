import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetMyStats, useGetMyProfile } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { formatCurrency } from "@/lib/utils";
import { Loader2, DollarSign, Target, Trophy, TrendingUp, Activity } from "lucide-react";
import { Redirect } from "wouter";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'backer' | 'shooter'>('backer');
  
  const { data: stats, isLoading: statsLoading } = useGetMyStats({
    query: { enabled: isAuthenticated }
  });
  
  const { data: profile } = useGetMyProfile({
    query: { enabled: isAuthenticated }
  });

  if (authLoading) return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div></AppLayout>;
  if (!isAuthenticated) return <Redirect to="/" />;

  const isLoading = statsLoading;

  return (
    <AppLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-bold font-display text-white uppercase tracking-widest text-glow-primary">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-2">Welcome back, {profile?.username || 'Hunter'}. Track your stakes and hunts.</p>
      </div>

      {/* Custom Tabs */}
      <div className="flex space-x-2 p-1 bg-card/50 rounded-xl max-w-md mb-8 border border-white/5">
        <button
          onClick={() => setActiveTab('backer')}
          className={`flex-1 py-3 rounded-lg font-display uppercase tracking-widest font-bold transition-all ${
            activeTab === 'backer' 
              ? 'bg-primary text-primary-foreground box-glow-primary' 
              : 'text-muted-foreground hover:text-white hover:bg-white/5'
          }`}
        >
          Backer Portfolio
        </button>
        <button
          onClick={() => setActiveTab('shooter')}
          className={`flex-1 py-3 rounded-lg font-display uppercase tracking-widest font-bold transition-all ${
            activeTab === 'shooter' 
              ? 'bg-secondary text-secondary-foreground box-glow-secondary' 
              : 'text-muted-foreground hover:text-white hover:bg-white/5'
          }`}
        >
          Shooter Stats
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
      ) : activeTab === 'backer' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-primary">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-xl"><DollarSign className="w-6 h-6 text-primary" /></div>
                <h3 className="text-sm font-display tracking-widest text-muted-foreground uppercase">Total Invested</h3>
              </div>
              <div className="text-4xl font-bold text-white">{formatCurrency(stats?.backerStats.totalInvestedUsd || 0)}</div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-secondary">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-secondary/10 rounded-xl"><TrendingUp className="w-6 h-6 text-secondary" /></div>
                <h3 className="text-sm font-display tracking-widest text-muted-foreground uppercase">Total Won</h3>
              </div>
              <div className="text-4xl font-bold text-white">{formatCurrency(stats?.backerStats.totalWonUsd || 0)}</div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-white/20">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/5 rounded-xl"><Activity className="w-6 h-6 text-white" /></div>
                <h3 className="text-sm font-display tracking-widest text-muted-foreground uppercase">Active Stakes</h3>
              </div>
              <div className="text-4xl font-bold text-white">{stats?.backerStats.activeShares || 0} Shares</div>
            </div>
          </div>
          
          <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/20">
             <h3 className="text-xl font-display uppercase tracking-widest text-white mb-2">Portfolio Details</h3>
             <p className="text-muted-foreground">Historical share data mapping is currently stabilizing in the deep sea network.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Total Hunts</h3>
              <div className="text-3xl font-bold text-white">{stats?.shooterStats.totalSessions || 0}</div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Win / Loss</h3>
              <div className="text-3xl font-bold text-white">
                <span className="text-green-400">{stats?.shooterStats.wins || 0}</span>
                <span className="text-white/20 mx-2">/</span>
                <span className="text-destructive">{stats?.shooterStats.losses || 0}</span>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-secondary/30 bg-secondary/5">
              <h3 className="text-xs font-display tracking-widest text-secondary uppercase mb-2">Current Streak</h3>
              <div className="text-3xl font-bold text-secondary text-glow-secondary flex items-center gap-2">
                {stats?.shooterStats.winStreak || 0} <Trophy className="w-6 h-6" />
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h3 className="text-xs font-display tracking-widest text-muted-foreground uppercase mb-2">Best Streak</h3>
              <div className="text-3xl font-bold text-white">{stats?.shooterStats.bestWinStreak || 0}</div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-8 text-center border-dashed border-white/20">
             <h3 className="text-xl font-display uppercase tracking-widest text-white mb-2">Hunting History</h3>
             <p className="text-muted-foreground">Past session records are being decrypted from the ledger.</p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

import { AppLayout } from "@/components/layout/AppLayout";
import { useListSessions, useGetLeaderboard } from "@workspace/api-client-react";
import { SessionCard } from "@/components/ui/SessionCard";
import { CreateSessionModal } from "@/components/CreateSessionModal";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2, Trophy, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: sessions, isLoading: loadingSessions } = useListSessions({ params: { status: 'active' } });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useGetLeaderboard();

  return (
    <AppLayout>
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden mb-12 shadow-2xl shadow-black/50 border border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Deep Sea Neon Base" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        </div>
        
        <div className="relative z-10 px-8 py-16 md:py-24 max-w-2xl">
          <h1 className="text-5xl md:text-7xl font-bold font-display text-white leading-tight mb-4">
            HUNT OR <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">BE HUNTED</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
            The premier deep-sea staking platform. Back verified shooters at high-stakes tables or secure funding for your next run.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {isAuthenticated ? (
              <CreateSessionModal />
            ) : (
              <button 
                onClick={() => window.location.href = '/api/login'}
                className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:bg-primary/90 hover:-translate-y-1"
              >
                Join the Depths
              </button>
            )}
            <Link href="#live-feed" className="px-8 py-4 rounded-xl bg-white/5 text-white font-display tracking-widest uppercase font-bold hover:bg-white/10 border border-white/10 transition-all duration-300">
              View Active Hunts
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2" id="live-feed">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-display tracking-widest text-glow-primary text-white flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#22d3ee]" />
              LIVE HUNT FEED
            </h2>
          </div>

          {loadingSessions ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center flex flex-col items-center justify-center border-dashed border-white/20">
              <img src={`${import.meta.env.BASE_URL}images/treasure-empty.png`} alt="Empty" className="w-32 h-32 opacity-50 mb-6" />
              <h3 className="text-xl font-bold text-white mb-2 font-display uppercase tracking-widest">The Waters are Still</h3>
              <p className="text-muted-foreground max-w-md">No active hunt sessions right now. Be the first to start a table and gather backers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sessions.map((session, i) => (
                <SessionCard key={session.id} session={session} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Leaderboard */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-secondary/20 h-full">
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <h2 className="text-xl font-bold font-display tracking-widest text-secondary flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                TOP HUNTERS
              </h2>
              <Link href="/leaderboard" className="text-xs text-muted-foreground hover:text-white flex items-center gap-1 uppercase tracking-wider font-bold">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingLeaderboard ? (
               <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-secondary animate-spin" /></div>
            ) : !leaderboard || leaderboard.length === 0 ? (
               <div className="text-center py-10 text-muted-foreground text-sm">No data yet.</div>
            ) : (
              <div className="space-y-4">
                {leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={entry.userId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className={`w-8 text-center font-display font-bold text-lg ${index === 0 ? 'text-secondary text-glow-secondary' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                      #{index + 1}
                    </div>
                    <img 
                      src={entry.profileImageUrl || `${import.meta.env.BASE_URL}images/avatar-default.png`} 
                      alt={entry.username}
                      className="w-10 h-10 rounded-full bg-background border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{entry.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{entry.totalWins} Career Wins</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-secondary font-display uppercase tracking-widest font-bold">Streak</div>
                      <div className="text-lg font-bold text-white">{entry.winStreak}🔥</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { AppLayout } from "@/components/layout/AppLayout";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Loader2, Trophy, Medal, Flame } from "lucide-react";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Trophy className="w-16 h-16 text-secondary mx-auto mb-6 text-glow-secondary drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
          <h1 className="text-4xl md:text-5xl font-bold font-display text-white uppercase tracking-widest text-glow-primary">
            Hall of Legends
          </h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-xl mx-auto">
            The most deadly shooters in the deep sea, ranked by consecutive successful hunts.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-white/20 rounded-2xl glass-panel">
            The leaderboard is currently empty.
          </div>
        ) : (
          <div className="glass-panel rounded-2xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10 text-xs font-display tracking-widest uppercase text-muted-foreground">
                    <th className="p-6 font-semibold w-24 text-center">Rank</th>
                    <th className="p-6 font-semibold">Hunter</th>
                    <th className="p-6 font-semibold text-center">Win Streak</th>
                    <th className="p-6 font-semibold text-right">Total Wins</th>
                    <th className="p-6 font-semibold text-right">Missions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((entry, index) => {
                    const isTop3 = index < 3;
                    return (
                      <tr key={entry.userId} className="hover:bg-white/5 transition-colors group">
                        <td className="p-6 text-center">
                          {index === 0 ? <Medal className="w-8 h-8 text-secondary mx-auto drop-shadow-md" /> :
                           index === 1 ? <Medal className="w-7 h-7 text-gray-300 mx-auto drop-shadow-md" /> :
                           index === 2 ? <Medal className="w-6 h-6 text-amber-600 mx-auto drop-shadow-md" /> :
                           <span className="text-xl font-bold font-display text-muted-foreground">#{index + 1}</span>}
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <img 
                              src={entry.profileImageUrl || `${import.meta.env.BASE_URL}images/avatar-default.png`} 
                              alt="Avatar" 
                              className={`w-12 h-12 rounded-full object-cover border-2 ${isTop3 ? 'border-primary shadow-[0_0_10px_#22d3ee]' : 'border-white/10'}`}
                            />
                            <div>
                              <div className={`font-bold text-lg ${isTop3 ? 'text-white' : 'text-gray-300'}`}>{entry.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 text-center">
                          <div className="inline-flex items-center gap-1 px-3 py-1 bg-secondary/10 border border-secondary/30 rounded-full text-secondary font-bold text-lg shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                            {entry.winStreak} <Flame className="w-4 h-4" />
                          </div>
                        </td>
                        <td className="p-6 text-right font-bold text-white text-lg">{entry.totalWins}</td>
                        <td className="p-6 text-right text-muted-foreground">{entry.totalSessions}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

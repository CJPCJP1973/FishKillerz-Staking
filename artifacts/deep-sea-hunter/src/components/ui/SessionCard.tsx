import { Link } from "wouter";
import { type Session } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatCurrency } from "@/lib/utils";
import { Target, Users, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function SessionCard({ session, index = 0 }: { session: Session; index?: number }) {
  const percentFilled = (session.soldShares / session.totalShares) * 100;
  const isFilled = percentFilled >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/sessions/${session.id}`} className="block group">
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(34,211,238,0.15)]">
          
          {/* Status Badge */}
          <div className="absolute top-6 right-6">
            <div className={`px-3 py-1 rounded-full text-xs font-display tracking-widest font-bold uppercase border ${
              session.status === 'active' 
                ? 'bg-primary/10 text-primary border-primary/30 box-glow-primary' 
                : session.status === 'completed'
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-destructive/10 text-destructive border-destructive/30'
            }`}>
              {session.status}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-bold font-display text-white group-hover:text-primary transition-colors">
              {session.gameName}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <Target className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-white">{session.shooterUsername}</span>
              <span className="text-xs font-display tracking-widest uppercase">Shooter</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-background/50 rounded-xl p-4 border border-white/5">
              <div className="text-xs text-muted-foreground mb-1 font-display uppercase tracking-widest">Total Buy-in</div>
              <div className="text-xl font-bold text-white">{formatCurrency(session.buyInUsd)}</div>
            </div>
            <div className="bg-background/50 rounded-xl p-4 border border-white/5">
              <div className="text-xs text-muted-foreground mb-1 font-display uppercase tracking-widest">Share Size</div>
              <div className="text-xl font-bold text-secondary">{session.sharePercent}%</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span className="text-muted-foreground flex items-center gap-1">
                <Users className="w-4 h-4" /> Backer Stake
              </span>
              <span className="text-white font-display tracking-wider">
                {session.soldShares} / {session.totalShares} Shares
              </span>
            </div>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-white/5">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isFilled ? 'bg-secondary' : 'bg-primary'}`}
                style={{ width: `${Math.min(percentFilled, 100)}%` }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between">
               <div className="text-xs text-muted-foreground flex items-center gap-1">
                 <Clock className="w-3 h-3" /> Live
               </div>
               <div className="text-primary font-display font-bold uppercase tracking-widest flex items-center gap-1 text-sm group-hover:translate-x-1 transition-transform">
                 Join Hunt <ArrowRight className="w-4 h-4" />
               </div>
            </div>
          </div>
          
        </div>
      </Link>
    </motion.div>
  );
}

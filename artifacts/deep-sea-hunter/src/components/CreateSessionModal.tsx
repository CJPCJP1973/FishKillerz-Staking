import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Target, DollarSign, PieChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  gameName: z.string().min(1, "Game name is required"),
  buyInUsd: z.coerce.number().min(10, "Minimum buy-in is $10"),
  sharePercent: z.coerce.number().min(1).max(75, "Maximum share percent is 75%"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateSessionModal() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateSession();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gameName: "",
      buyInUsd: 1000,
      sharePercent: 5,
    }
  });

  const buyIn = watch("buyInUsd") || 0;
  const sharePct = watch("sharePercent") || 5;
  const backerPool = buyIn * 0.75;
  const pricePerShare = buyIn * (sharePct / 100);
  const totalShares = Math.floor(75 / (sharePct || 1));

  const onSubmit = (data: FormValues) => {
    createMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Hunt Session Created", description: "Your session is now live." });
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setOpen(false);
        reset();
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to create session", 
          description: err.message || "An error occurred", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg">
          <PlusCircle className="w-5 h-5" />
          Start Hunt
        </button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-glow-primary text-primary font-display tracking-widest">
            Configure Hunt Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-display tracking-widest text-muted-foreground uppercase">Game / Table Name</label>
            <div className="relative">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                {...register("gameName")}
                className="w-full bg-background border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                placeholder="e.g. WSOP Event #12, Bobby's Room"
              />
            </div>
            {errors.gameName && <p className="text-destructive text-xs mt-1">{errors.gameName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-display tracking-widest text-muted-foreground uppercase">Total Buy-in ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="number"
                  {...register("buyInUsd")}
                  className="w-full bg-background border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              {errors.buyInUsd && <p className="text-destructive text-xs mt-1">{errors.buyInUsd.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-display tracking-widest text-muted-foreground uppercase">Share Size (%)</label>
              <div className="relative">
                <PieChart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="number"
                  step="0.1"
                  {...register("sharePercent")}
                  className="w-full bg-background border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              {errors.sharePercent && <p className="text-destructive text-xs mt-1">{errors.sharePercent.message}</p>}
            </div>
          </div>

          {/* Setup Preview */}
          <div className="bg-background/50 rounded-xl p-4 border border-primary/20 mt-4">
            <h4 className="text-sm font-display text-primary tracking-widest uppercase mb-3 border-b border-white/5 pb-2">Stake Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shooter Keeps (25%)</span>
                <span className="font-bold text-white">${(buyIn * 0.25).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Backer Pool (75%)</span>
                <span className="font-bold text-white">${backerPool.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5 mt-2">
                <span className="text-muted-foreground">Available Shares</span>
                <span className="font-bold text-secondary">{totalShares} shares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per Share</span>
                <span className="font-bold text-primary">${pricePerShare.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={createMutation.isPending}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:bg-primary/90 disabled:opacity-50 mt-6"
          >
            {createMutation.isPending ? "Initializing..." : "Launch Session"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

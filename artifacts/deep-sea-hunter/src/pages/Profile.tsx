import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Loader2, User, Save, Bitcoin, Zap, DollarSign, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";

const profileSchema = z.object({
  username: z.string().min(3, "At least 3 characters").max(20, "Too long").optional().or(z.literal("")),
  cashAppTag: z.string().optional(),
  venmoUsername: z.string().optional(),
  chimeHandle: z.string().optional(),
  btcAddress: z.string().optional(),
  lightningAddress: z.string().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-white/10"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PaymentField({
  label,
  icon,
  placeholder,
  name,
  register,
  value,
  showCopy = false,
}: {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  name: keyof ProfileValues;
  register: ReturnType<typeof useForm<ProfileValues>>["register"];
  value?: string;
  showCopy?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">{label}</label>
      <div className="relative flex items-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input
          {...register(name)}
          className="flex-1 w-full bg-background/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
          placeholder={placeholder}
        />
        {showCopy && value && <CopyButton value={value} />}
      </div>
    </div>
  );
}

export default function Profile() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isAuthenticated },
  });

  const updateMutation = useUpdateMyProfile();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  const watchedBtc = watch("btcAddress");
  const watchedLightning = watch("lightningAddress");

  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username || "",
        cashAppTag: profile.cashAppTag || "",
        venmoUsername: profile.venmoUsername || "",
        chimeHandle: profile.chimeHandle || "",
        btcAddress: profile.btcAddress || "",
        lightningAddress: profile.lightningAddress || "",
      });
    }
  }, [profile, reset]);

  if (authLoading) return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div></AppLayout>;
  if (!isAuthenticated) return <Redirect to="/" />;

  const onSubmit = (data: ProfileValues) => {
    updateMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Profile Updated", description: "Your hunter identity is secured." });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-white uppercase tracking-widest mb-8">
          Hunter Identity
        </h1>

        {profileLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Identity Card */}
            <div className="glass-panel p-6 rounded-2xl border border-primary/20 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={profile?.profileImageUrl || `${import.meta.env.BASE_URL}images/avatar-default.png`}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full border-2 border-primary object-cover"
                />
                <div>
                  <p className="text-lg font-bold text-white">{profile?.username || "No username set"}</p>
                  <p className="text-xs text-muted-foreground font-mono">ID: {profile?.id.substring(0, 12)}...</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      {...register("username")}
                      className="w-full bg-background/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      placeholder="Enter username (required to host sessions)"
                    />
                  </div>
                  {errors.username && <p className="text-destructive text-xs">{errors.username.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-display tracking-widest text-muted-foreground uppercase">Email (From Replit)</label>
                  <div className="w-full bg-black/40 border border-transparent rounded-xl py-3 px-4 text-muted-foreground text-sm cursor-not-allowed">
                    {profile?.email || "No email provided"}
                  </div>
                </div>
              </div>
            </div>

            {/* Payout Profile */}
            <div className="glass-panel p-6 rounded-2xl border border-secondary/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-secondary/10 rounded-xl">
                  <DollarSign className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-display uppercase tracking-widest text-white">Payout Profile</h2>
                  <p className="text-xs text-muted-foreground">Backers see these when paying into your session</p>
                </div>
              </div>

              <div className="space-y-4">
                <PaymentField
                  label="CashApp Tag"
                  icon={<span className="text-green-400 text-sm font-bold">$</span>}
                  placeholder="$YourCashTag"
                  name="cashAppTag"
                  register={register}
                />
                <PaymentField
                  label="Venmo Username"
                  icon={<span className="text-blue-400 text-sm font-bold">@</span>}
                  placeholder="@YourVenmo"
                  name="venmoUsername"
                  register={register}
                />
                <PaymentField
                  label="Chime Handle"
                  icon={<span className="text-purple-400 text-sm font-bold">#</span>}
                  placeholder="YourChimeHandle"
                  name="chimeHandle"
                  register={register}
                />

                <Separator className="bg-white/10 my-2" />

                <div className="space-y-2">
                  <label className="text-xs font-display tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                    <Bitcoin className="w-3.5 h-3.5 text-secondary" /> Bitcoin Address
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      {...register("btcAddress")}
                      className="flex-1 bg-background/60 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-muted-foreground/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all text-xs font-mono"
                      placeholder="bc1q..."
                    />
                    {watchedBtc && <CopyButton value={watchedBtc} />}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-display tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> Lightning Address / Invoice
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      {...register("lightningAddress")}
                      className="flex-1 bg-background/60 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-muted-foreground/50 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all text-xs font-mono"
                      placeholder="lnbc... or user@domain.com"
                    />
                    {watchedLightning && <CopyButton value={watchedLightning} />}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full py-4 rounded-xl bg-primary/10 text-primary border border-primary hover:bg-primary hover:text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Profile
            </button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Loader2, User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Too long"),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { enabled: isAuthenticated }
  });
  
  const updateMutation = useUpdateMyProfile();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({ username: profile.username || "" });
    }
  }, [profile, reset]);

  if (authLoading) return <AppLayout><div className="flex justify-center py-32"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div></AppLayout>;
  if (!isAuthenticated) return <Redirect to="/" />;

  const onSubmit = (data: ProfileValues) => {
    updateMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Profile Updated", description: "Your hunter identity is secured." });
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Update Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-white uppercase tracking-widest mb-8">
          Hunter Identity
        </h1>

        {profileLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="glass-panel p-8 rounded-2xl border border-primary/20 shadow-2xl">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex flex-col items-center">
                <img 
                  src={profile?.profileImageUrl || `${import.meta.env.BASE_URL}images/avatar-default.png`} 
                  alt="Avatar"
                  className="w-32 h-32 rounded-full border-4 border-primary box-glow-primary object-cover mb-4"
                />
                <div className="text-xs text-muted-foreground uppercase font-display tracking-widest text-center">
                  ID: <br/> {profile?.id.substring(0, 8)}...
                </div>
              </div>
              
              <div className="flex-1 w-full">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-display tracking-widest text-muted-foreground uppercase">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input 
                        {...register("username")}
                        className="w-full bg-background border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-lg font-bold"
                        placeholder="Enter username"
                      />
                    </div>
                    {errors.username && <p className="text-destructive text-xs mt-1">{errors.username.message}</p>}
                    <p className="text-xs text-muted-foreground mt-2">A unique username is required to host hunt sessions.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-display tracking-widest text-muted-foreground uppercase">Email (From Replit)</label>
                    <div className="w-full bg-black/40 border border-transparent rounded-xl py-3 px-4 text-muted-foreground cursor-not-allowed">
                      {profile?.email || 'No email provided'}
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    className="w-full py-4 rounded-xl bg-primary/10 text-primary border border-primary hover:bg-primary hover:text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:scale-[1.02] active:scale-[0.98] mt-6 flex justify-center items-center gap-2"
                  >
                    {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Identity
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

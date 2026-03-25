import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Anchor, LogIn, LogOut, LayoutDashboard, Trophy, UserCircle, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, login, logout } = useAuth();

  const navLinks = [
    { href: "/", label: "Live Hunt", icon: Anchor },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ...(isAuthenticated ? [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/profile", label: "Profile", icon: UserCircle },
    ] : [])
  ];

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 shadow-2xl shadow-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <Anchor className="w-8 h-8 text-primary" />
            </div>
            <div>
              <span className="block font-display font-bold text-2xl tracking-widest text-white leading-none">
                DEEP SEA
              </span>
              <span className="block font-display font-bold text-sm tracking-[0.3em] text-primary leading-none">
                HUNTER
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 font-display text-lg tracking-wide uppercase transition-all duration-300",
                    isActive 
                      ? "text-primary text-glow-primary" 
                      : "text-muted-foreground hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-semibold text-white">{user?.username || 'Hunter'}</div>
                  <div className="text-xs text-primary font-display tracking-widest">VERIFIED</div>
                </div>
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-primary box-glow-primary object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-primary box-glow-primary bg-primary/10 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-primary" />
                  </div>
                )}
                <button
                  onClick={logout}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-primary-foreground font-display tracking-widest uppercase font-bold transition-all duration-300 box-glow-primary hover:scale-105 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

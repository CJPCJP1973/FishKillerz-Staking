import { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      
      <Navbar />
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
}

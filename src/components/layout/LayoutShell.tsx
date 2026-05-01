"use client";

import { Navbar }    from "@/components/layout/Navbar";
import { Sidebar }   from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

interface Props {
  children:    React.ReactNode;
  isLoggedIn:  boolean;
}

export function LayoutShell({ children, isLoggedIn }: Props) {
  if (!isLoggedIn) {
    return (
      <>
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Fixed left sidebar — desktop only */}
      <Sidebar />

      {/* Main content area */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0 px-4 sm:px-6 pt-6">
        {children}
      </main>

      {/* Bottom tab bar — mobile only */}
      <BottomNav />
    </div>
  );
}

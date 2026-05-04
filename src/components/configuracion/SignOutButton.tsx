"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="w-full flex items-center justify-center gap-2 text-sm text-red-500 border border-red-200 bg-red-50/50 px-4 py-3 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Cerrar sesión
    </button>
  );
}

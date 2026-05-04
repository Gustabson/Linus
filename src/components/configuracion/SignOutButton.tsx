"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="w-full flex items-center justify-center gap-2 text-sm bg-primary text-primary-fg px-4 py-3 rounded-xl hover:bg-primary-h transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Cerrar sesión
    </button>
  );
}

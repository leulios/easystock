"use client";

import React, { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export function AdminSignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-xs font-semibold text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
      title="End session and return to login"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>{isPending ? "Signing Out..." : "Sign Out of Admin"}</span>
    </button>
  );
}

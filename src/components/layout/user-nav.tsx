"use client";

import React, { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { LogOut, User, Shield } from "lucide-react";
import Link from "next/link";


interface UserNavProps {
  user: {
    fullName: string;
    email: string;
    platformRole: string;
  };
  role: string;
}

export function UserNav({ user, role }: UserNavProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const roleLabel =
    role === "SHOP_OWNER"
      ? "Shop Owner"
      : role === "SHOP_MANAGER"
      ? "Manager"
      : "Shopkeeper";

  return (
    <div className="flex items-center gap-3">
      <div className="text-right hidden sm:block">
        <div className="text-sm font-semibold text-slate-800 leading-none">
          {user.fullName}
        </div>
        <div className="flex items-center justify-end gap-1 mt-1">
          {user.platformRole === "SUPER_ADMIN" && (
            <Link
              href="/platform-admin"
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
              title="Open Platform Administrator Console"
            >
              <Shield className="h-3 w-3" /> Platform Admin
            </Link>
          )}

          <span className="text-xs text-slate-500 font-medium">{roleLabel}</span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        disabled={isPending}
        title="Sign Out"
        className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

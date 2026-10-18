"use client";

import React, { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { LogOut, User, Shield } from "lucide-react";

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
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              <Shield className="h-2.5 w-2.5" /> ADMIN
            </span>
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

import React from "react";
import { ShopSwitcher } from "./shop-switcher";
import { UserNav } from "./user-nav";
import { LanguageSwitcher } from "./language-switcher";
import { ShopRole } from "@prisma/client";

interface HeaderProps {
  currentShop: {
    id: string;
    name: string;
    code: string;
  };
  availableShops: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  user: {
    fullName: string;
    email: string;
    platformRole: string;
  };
  role: ShopRole;
}

export function Header({ currentShop, availableShops, user, role }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex-1 max-w-[220px] sm:max-w-xs">
        <ShopSwitcher
          currentShopId={currentShop.id}
          currentShopName={currentShop.name}
          availableShops={availableShops}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <LanguageSwitcher />
        <UserNav user={user} role={role} />
      </div>
    </header>
  );
}


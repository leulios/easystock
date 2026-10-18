"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Tag,
  Truck,
  Users,
  Receipt,
  BarChart3,
  Settings,
  Shield,
} from "lucide-react";
import { ShopRole } from "@prisma/client";

interface SidebarProps {
  shopId: string;
  role: ShopRole;
  isPlatformAdmin?: boolean;
}

export function Sidebar({ shopId, role, isPlatformAdmin }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: `/${shopId}/dashboard`,
      icon: LayoutDashboard,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER, ShopRole.SHOPKEEPER],
    },
    {
      name: "Point of Sale",
      href: `/${shopId}/pos`,
      icon: ShoppingCart,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER, ShopRole.SHOPKEEPER],
      badge: "Fast POS",
    },
    {
      name: "Inventory",
      href: `/${shopId}/inventory`,
      icon: Boxes,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER, ShopRole.SHOPKEEPER],
    },
    {
      name: "Products & Catalog",
      href: `/${shopId}/products`,
      icon: Tag,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: "Purchases & Receiving",
      href: `/${shopId}/purchases`,
      icon: Truck,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: "Customers",
      href: `/${shopId}/customers`,
      icon: Users,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER, ShopRole.SHOPKEEPER],
    },
    {
      name: "Expenses",
      href: `/${shopId}/expenses`,
      icon: Receipt,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: "Reports & Financials",
      href: `/${shopId}/reports`,
      icon: BarChart3,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: "Shop Settings",
      href: `/${shopId}/settings`,
      icon: Settings,
      roles: [ShopRole.SHOP_OWNER],
    },
  ];

  const visibleNav = navigation.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
            ES
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">
            Easy<span className="text-blue-600">Stock</span>
          </span>
        </div>

        <nav className="space-y-1">
          {visibleNav.map((item) => {
            const isActive =
              item.href === `/${shopId}/dashboard`
                ? pathname === item.href
                : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {isPlatformAdmin && (
        <div className="p-4 border-t border-slate-200 bg-amber-50/50">
          <Link
            href="/platform-admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-900 hover:bg-amber-100/60 transition-colors"
          >
            <Shield className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Platform Admin Console</span>
          </Link>
        </div>
      )}
    </aside>
  );
}

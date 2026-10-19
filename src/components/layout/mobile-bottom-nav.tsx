"use client";

import React, { useState } from "react";
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
  Smartphone,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Scan,
} from "lucide-react";
import { ShopRole } from "@prisma/client";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "./language-switcher";
import { logoutAction } from "@/app/actions/auth";

interface MobileBottomNavProps {
  shopId: string;
  role: ShopRole;
  isPlatformAdmin?: boolean;
}

export function MobileBottomNav({ shopId, role, isPlatformAdmin }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Bottom Navigation Slots
  const navItems = [
    {
      name: t("navDashboard"),
      href: `/${shopId}/dashboard`,
      icon: LayoutDashboard,
      active: pathname === `/${shopId}/dashboard`,
    },
    {
      name: language === "am" ? "መሸጫ" : "Sell",
      href: `/${shopId}/pos`,
      icon: ShoppingCart,
      active: pathname.startsWith(`/${shopId}/pos`),
    },
    {
      name: language === "am" ? "መቃኛ" : "Scanner",
      href: `/scan`,
      icon: Scan,
      isCenter: true,
      active: pathname.includes("/scan"),
    },
    {
      name: language === "am" ? "ስቶክ" : "Stock",
      href: `/${shopId}/inventory`,
      icon: Boxes,
      active: pathname.startsWith(`/${shopId}/inventory`),
    },
  ];

  // More Drawer Items
  const moreItems = [
    {
      name: t("navItems"),
      href: `/${shopId}/products`,
      icon: Tag,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: t("navReceiveGoods"),
      href: `/${shopId}/purchases`,
      icon: Truck,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: t("navCustomers"),
      href: `/${shopId}/customers`,
      icon: Users,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER, ShopRole.SHOPKEEPER],
    },
    {
      name: t("navExpenses"),
      href: `/${shopId}/expenses`,
      icon: Receipt,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: t("navReports"),
      href: `/${shopId}/reports`,
      icon: BarChart3,
      roles: [ShopRole.SHOP_OWNER, ShopRole.SHOP_MANAGER],
    },
    {
      name: t("navSettings"),
      href: `/${shopId}/settings`,
      icon: Settings,
      roles: [ShopRole.SHOP_OWNER],
    },
  ];

  const visibleMore = moreItems.filter((i) => i.roles.includes(role));

  return (
    <>
      {/* Fixed Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1 flex items-center justify-between shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                    item.active
                      ? "bg-gradient-to-tr from-blue-700 to-indigo-600 text-white ring-4 ring-blue-100"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold text-blue-700 mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] ${
                item.active ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.name}</span>
            </Link>
          );
        })}

        {/* More Trigger Button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] ${
            isDrawerOpen ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">{language === "am" ? "ተጨማሪ" : "More"}</span>
        </button>
      </nav>

      {/* Slide-over More Drawer */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250">
            {/* Drawer Handle & Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  ES
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {language === "am" ? "ተጨማሪ አገልግሎቶች" : "Menu & Modules"}
                  </h3>
                  <p className="text-[11px] text-slate-400">EasyStock Retail</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Links */}
            <div className="p-4 overflow-y-auto space-y-1">
              {visibleMore.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                );
              })}

              {isPlatformAdmin && (
                <Link
                  href="/platform-admin"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl text-sm font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 transition-colors mt-2"
                >
                  <Shield className="h-5 w-5 text-amber-600" />
                  <span>Platform Admin Console</span>
                </Link>
              )}
            </div>

            {/* Drawer Footer: Language & Sign Out */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {language === "am" ? "ቋንቋ" : "Language"}:
                </span>
                <LanguageSwitcher />
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 py-1.5 px-3 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t("signOut")}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

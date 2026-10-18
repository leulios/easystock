import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { PlatformRole } from "@prisma/client";
import Link from "next/link";
import {
  Shield,
  LayoutDashboard,
  Store,
  Users,
  Activity,
  History,
  LifeBuoy,
  Settings,
  ArrowLeft,
} from "lucide-react";

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getCurrentContext();

  // Strict server-side authorization guard
  if (!context || (context.user.platformRole !== PlatformRole.SUPER_ADMIN && !context.isPlatformAdmin)) {
    redirect("/");
  }

  const navItems = [
    { name: "Overview & Health", href: "/platform-admin", icon: LayoutDashboard },
    { name: "Shops & Outlets", href: "/platform-admin/shops", icon: Store },
    { name: "Accounts & Sessions", href: "/platform-admin/accounts", icon: Users },
    { name: "Support & Incidents", href: "/platform-admin/support", icon: LifeBuoy },
    { name: "Security Audit Trail", href: "/platform-admin/audit-logs", icon: History },
    { name: "Platform Settings", href: "/platform-admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div className="p-5 space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-bold text-base text-white tracking-tight">
                Easy<span className="text-blue-400">Stock</span> <span className="text-xs text-amber-400 font-mono">ADMIN</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Platform Owner Console</p>
          </div>

          <nav className="space-y-1 text-xs font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="truncate">
              <div className="text-slate-300 font-bold truncate">{context.user.fullName}</div>
              <div className="text-[10px] text-slate-500 truncate">{context.user.email}</div>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Application
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen p-6 md:p-10">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

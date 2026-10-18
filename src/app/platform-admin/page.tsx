import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getPlatformOverview, getSystemHealthTelemetry } from "@/lib/services/platform-admin-service";
import {
  Shield,
  Building2,
  Store,
  Users,
  Activity,
  Server,
  Layers,
  History,
  LifeBuoy,
  Clock,
  Cpu,
  Database,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default async function PlatformAdminOverviewPage() {
  const context = await getCurrentContext();
  if (!context || !context.isPlatformAdmin) {
    redirect("/");
  }

  const [overviewData, healthData] = await Promise.all([
    getPlatformOverview(context),
    getSystemHealthTelemetry(context),
  ]);

  const { overview, plans, recentAudits } = overviewData;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Platform Overview & System Telemetry
          </h1>
          <p className="text-xs text-slate-400">
            Multi-tenant infrastructure health, subscription distribution, and security events
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              healthData.database.status === "HEALTHY" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            }`}
          />
          <span className="text-slate-300 font-mono">
            DB Ping: {healthData.database.latencyMs}ms ({healthData.database.status})
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Tenants</span>
            <Building2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {overview.totalOrganizations}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            {overview.activeOrganizations} active / {overview.suspendedOrganizations} suspended
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Shop Outlets</span>
            <Store className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {overview.totalShops}
          </div>
          <div className="text-[11px] text-slate-400">
            {overview.activeShops} operational / {overview.suspendedShops} suspended
          </div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Platform Users</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {overview.totalUsers}
          </div>
          <div className="text-[11px] text-slate-400">Registered staff & owners</div>
        </div>

        <div className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Support Tickets</span>
            <LifeBuoy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {overview.openTicketsCount}
          </div>
          <div className="text-[11px] text-slate-400">Pending customer issues</div>
        </div>
      </div>

      {/* Infrastructure Telemetry & Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscriptions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-400" /> Subscription Distributions
            </h2>
            <Link href="/platform-admin/shops" className="text-xs text-blue-400 hover:underline">
              Inspect Shops &rarr;
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {plans.map((p) => (
              <div
                key={p.plan}
                className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg flex items-center justify-between"
              >
                <span className="font-semibold capitalize text-xs text-slate-300">
                  {p.plan} Tier
                </span>
                <span className="font-bold text-blue-400 font-mono text-sm">{p.count} tenants</span>
              </div>
            ))}
          </div>
        </div>

        {/* Runtime Diagnostics */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" /> Monitored Runtime Telemetry
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-blue-400" /> Database Engine:
              </span>
              <p className="font-semibold text-slate-200">{healthData.database.provider}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                Round-trip Ping: {healthData.database.latencyMs}ms
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> System Uptime & Node:
              </span>
              <p className="font-semibold text-slate-200 font-mono">
                {Math.floor(healthData.runtime.uptimeSeconds / 60)}m {healthData.runtime.uptimeSeconds % 60}s
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Node {healthData.runtime.nodeVersion} ({healthData.runtime.platform} {healthData.runtime.arch})
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-400">Node.js Process Memory:</span>
              <p className="font-semibold text-slate-200 font-mono">
                Heap: {healthData.runtime.heapUsedMb} MB / {healthData.runtime.heapTotalMb} MB
              </p>
              <p className="text-[10px] text-slate-400 font-mono">RSS: {healthData.runtime.rssMb} MB</p>
            </div>

            <div className="p-3.5 bg-slate-950/60 border border-slate-800/60 rounded-lg space-y-1">
              <span className="text-slate-400">External APM Status:</span>
              <p className="font-semibold text-amber-400 font-mono">Internal Telemetry Active</p>
              <p className="text-[10px] text-slate-500">
                (External Sentry/Datadog APM not configured)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Audit Feed */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white text-base flex items-center gap-2">
            <History className="h-4 w-4 text-purple-400" /> Recent Security & Operational Events
          </h2>
          <Link href="/platform-admin/audit-logs" className="text-xs text-blue-400 hover:underline">
            View Complete Audit Trail &rarr;
          </Link>
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          {recentAudits.map((a) => (
            <div key={a.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono bg-slate-950 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-800">
                  {a.action}
                </span>
                <span className="text-slate-300">
                  Target: <span className="text-slate-400">{a.entityType}</span>
                </span>
              </div>
              <div className="text-right text-slate-400 text-[11px]">
                By <span className="text-slate-300 font-medium">{a.performedBy}</span> &bull;{" "}
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

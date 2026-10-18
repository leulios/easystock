"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Shield,
  Building2,
  Store,
  Users,
  Activity,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowLeft,
  Search,
  Check,
  Ban,
  RefreshCw,
} from "lucide-react";
import { toggleOrganizationStatusAction, updateOrganizationPlanAction } from "@/app/actions/admin";
import { useRouter } from "next/navigation";

interface AdminClientProps {
  metrics: {
    overview: {
      totalOrganizations: number;
      totalShops: number;
      totalUsers: number;
      activeOrganizations: number;
      suspendedOrganizations: number;
    };
    plans: Array<{ plan: string; count: number }>;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      planStatus: string;
      maxShops: number;
      shopsCount: number;
      membershipsCount: number;
      createdAt: Date;
    }>;
    systemHealth: {
      databaseStatus: string;
      databaseProvider: string;
      timestamp: string;
      uptimeSeconds: number;
    };
    recentAudits: Array<{
      id: string;
      action: string;
      entityType: string;
      performedBy: string;
      createdAt: Date;
    }>;
  };
}

export function AdminClient({ metrics }: AdminClientProps) {
  const router = useRouter();
  const { overview, plans, organizations, systemHealth, recentAudits } = metrics;

  const [activeTab, setActiveTab] = useState<"tenants" | "telemetry" | "audits">("tenants");
  const [tenantSearch, setTenantSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
      o.slug.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const filteredAudits = recentAudits.filter(
    (a) =>
      a.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.entityType.toLowerCase().includes(auditSearch.toLowerCase()) ||
      a.performedBy.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const handleToggleStatus = (orgId: string, currentStatus: string, orgName: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const confirmMsg =
      nextStatus === "suspended"
        ? `Are you sure you want to suspend tenant "${orgName}"? Their users will not be able to access shops.`
        : `Reactivate tenant "${orgName}"?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const res = await toggleOrganizationStatusAction(orgId, nextStatus as any);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to update tenant status");
      }
    });
  };

  const handlePlanChange = (orgId: string, newPlan: string) => {
    startTransition(async () => {
      const res = await updateOrganizationPlanAction(orgId, newPlan as any);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to update tenant plan");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <Link
              href="/"
              className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1 font-medium mb-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Application
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Platform Administrator Console
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Multi-tenant platform oversight, tenant governance, and system audit logs
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Postgres Engine: Connected</span>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Organizations (Tenants)
              </span>
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">
              {overview.totalOrganizations}
            </div>
            <div className="text-[11px] text-emerald-400 font-medium">
              {overview.activeOrganizations} active / {overview.suspendedOrganizations} suspended
            </div>
          </div>

          <div className="p-5 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Shop Outlets
              </span>
              <Store className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{overview.totalShops}</div>
            <div className="text-[11px] text-slate-400">Isolated operational databases</div>
          </div>

          <div className="p-5 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Platform Users
              </span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-3xl font-extrabold text-white">{overview.totalUsers}</div>
            <div className="text-[11px] text-slate-400">Owners, managers & cashiers</div>
          </div>

          <div className="p-5 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                System Uptime
              </span>
              <Server className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {Math.floor(systemHealth.uptimeSeconds / 60)}m {systemHealth.uptimeSeconds % 60}s
            </div>
            <div className="text-[11px] text-slate-400">{systemHealth.databaseProvider}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-3">
          <button
            onClick={() => setActiveTab("tenants")}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "tenants"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 className="h-4 w-4" /> Tenant Organizations ({organizations.length})
          </button>

          <button
            onClick={() => setActiveTab("telemetry")}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "telemetry"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="h-4 w-4" /> System Telemetry & Tiers
          </button>

          <button
            onClick={() => setActiveTab("audits")}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "audits"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="h-4 w-4" /> Platform Security Audits
          </button>
        </div>

        {/* TAB 1: Tenant Governance */}
        {activeTab === "tenants" && (
          <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-bold text-white text-base">Registered Tenant Organizations</h2>
                <p className="text-xs text-slate-400">
                  Manage active SaaS subscriptions, suspend past-due accounts, and inspect tenant scale
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  placeholder="Filter by name or slug..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-700/60">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Subscription Plan</th>
                    <th className="py-3 px-4 text-center">Outlets</th>
                    <th className="py-3 px-4 text-center">Staff Members</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Governance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{org.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">slug: {org.slug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={org.plan}
                          disabled={isPending}
                          onChange={(e) => handlePlanChange(org.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs capitalize font-medium focus:outline-none focus:border-blue-500"
                        >
                          <option value="standard">Standard (up to 3 shops)</option>
                          <option value="professional">Professional (up to 10 shops)</option>
                          <option value="enterprise">Enterprise (up to 50 shops)</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="font-bold text-white">{org.shopsCount}</span>
                        <span className="text-slate-400"> / {org.maxShops} max</span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {org.membershipsCount}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            org.planStatus === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {org.planStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          disabled={isPending}
                          onClick={() => handleToggleStatus(org.id, org.planStatus, org.name)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                            org.planStatus === "active"
                              ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                          }`}
                        >
                          {org.planStatus === "active" ? (
                            <>
                              <Ban className="h-3 w-3" /> Suspend
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3" /> Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: System Telemetry & Tiers */}
        {activeTab === "telemetry" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-400" /> Subscription Tier Breakdown
              </h2>

              <div className="space-y-3 pt-2">
                {plans.map((p) => (
                  <div key={p.plan} className="p-3 bg-slate-900/60 rounded-lg flex items-center justify-between">
                    <span className="font-semibold capitalize text-xs text-slate-200">
                      {p.plan} Tier
                    </span>
                    <span className="font-bold text-blue-400 font-mono text-sm">{p.count} tenants</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-800/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" /> Infrastructure Telemetry
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-3.5 bg-slate-900/60 rounded-lg space-y-1">
                  <span className="text-slate-400">Database Driver:</span>
                  <p className="font-semibold text-slate-200">Prisma ORM + PostgreSQL Connector</p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-lg space-y-1">
                  <span className="text-slate-400">Multi-Tenant Isolation Strategy:</span>
                  <p className="font-semibold text-emerald-400">Row-Level Context & Compound Indexes</p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-lg space-y-1">
                  <span className="text-slate-400">Security Standard:</span>
                  <p className="font-semibold text-slate-200">Argon2id/Bcrypt 12 Rounds + Signed HttpOnly</p>
                </div>

                <div className="p-3.5 bg-slate-900/60 rounded-lg space-y-1">
                  <span className="text-slate-400">Admin Account Provisioning:</span>
                  <p className="font-semibold text-amber-400">CLI Bootstrap Only (`npm run seed:admin`)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Platform Security Audits */}
        {activeTab === "audits" && (
          <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-bold text-white text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-400" /> Platform Audit Trail Feed
                </h2>
                <p className="text-xs text-slate-400">
                  Immutable chronological audit logs for platform governance actions
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search action or actor..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {filteredAudits.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No audit logs matching search.</div>
              ) : (
                filteredAudits.map((a) => (
                  <div key={a.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono bg-slate-900 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold">
                        {a.action}
                      </span>
                      <span className="text-slate-300">
                        Target Entity: <span className="text-slate-400">{a.entityType}</span>
                      </span>
                    </div>
                    <div className="text-right text-slate-400 text-[11px]">
                      By <span className="text-slate-300 font-medium">{a.performedBy}</span> &bull;{" "}
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

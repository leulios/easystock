"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { suspendShopAction, reactivateShopAction } from "@/app/actions/platform-admin";
import { useRouter } from "next/navigation";
import {
  Store,
  Search,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Calendar,
  Building2,
  Users,
  Boxes,
  ShoppingCart,
  X,
  ShieldAlert,
} from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  code: string;
  currency: string;
  isActive: boolean;
  suspensionReason: string | null;
  allowNegativeStock: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    planStatus: string;
  };
  salesCount: number;
  inventoryCount: number;
  staffCount: number;
  createdAt: Date;
}

interface ShopsAdminClientProps {
  initialShops: ShopItem[];
}

export function ShopsAdminClient({ initialShops }: ShopsAdminClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Suspension modal state
  const [suspendingShop, setSuspendingShop] = useState<ShopItem | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");

  // Reactivation modal state
  const [reactivatingShop, setReactivatingShop] = useState<ShopItem | null>(null);
  const [reactivationReason, setReactivationReason] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredShops = initialShops.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.organization.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.isActive) ||
      (statusFilter === "suspended" && !s.isActive);

    return matchesSearch && matchesStatus;
  });

  const handleConfirmSuspension = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendingShop) return;
    setError(null);

    if (suspensionReason.trim().length < 5) {
      setError("Please provide a descriptive suspension reason (at least 5 characters).");
      return;
    }

    startTransition(async () => {
      const res = await suspendShopAction({
        shopId: suspendingShop.id,
        reason: suspensionReason.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to suspend shop.");
      } else {
        setSuspendingShop(null);
        setSuspensionReason("");
        router.refresh();
      }
    });
  };

  const handleConfirmReactivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivatingShop) return;
    setError(null);

    if (reactivationReason.trim().length < 3) {
      setError("Please provide a reactivation reason (at least 3 characters).");
      return;
    }

    startTransition(async () => {
      const res = await reactivateShopAction({
        shopId: reactivatingShop.id,
        reason: reactivationReason.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to reactivate shop.");
      } else {
        setReactivatingShop(null);
        setReactivationReason("");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Shop Outlets Management
          </h1>
          <p className="text-xs text-slate-400">
            Inspect operational activity, manage branch availability, and enforce administrative suspensions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total Outlets:</span>
          <span className="font-mono font-bold text-sm bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-white">
            {initialShops.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by shop name, outlet code, or organization..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            All Outlets ({initialShops.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Active ({initialShops.filter((s) => s.isActive).length})
          </button>
          <button
            onClick={() => setStatusFilter("suspended")}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === "suspended"
                ? "bg-rose-600 text-white"
                : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            Suspended ({initialShops.filter((s) => !s.isActive).length})
          </button>
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Shop & Outlet Code</th>
                <th className="py-3 px-4">Parent Tenant</th>
                <th className="py-3 px-4 text-center">Usage Metrics</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Administrative Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Store className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-slate-400">No shops matching search</p>
                  </td>
                </tr>
              ) : (
                filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{shop.name}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>Code: {shop.code}</span>
                        <span>&bull;</span>
                        <span>Currency: {shop.currency}</span>
                      </div>
                      {!shop.isActive && shop.suspensionReason && (
                        <div className="mt-1.5 p-2 bg-rose-950/40 border border-rose-800/40 rounded text-[11px] text-rose-300">
                          <span className="font-bold text-rose-400">Suspension Reason: </span>
                          {shop.suspensionReason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{shop.organization.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        slug: {shop.organization.slug} ({shop.organization.plan} plan)
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                        <span title="Sales Completed" className="flex items-center gap-1 text-slate-300">
                          <ShoppingCart className="h-3 w-3 text-blue-400" /> {shop.salesCount}
                        </span>
                        <span title="Catalog Inventory Items" className="flex items-center gap-1 text-slate-300">
                          <Boxes className="h-3 w-3 text-emerald-400" /> {shop.inventoryCount}
                        </span>
                        <span title="Staff Members" className="flex items-center gap-1 text-slate-300">
                          <Users className="h-3 w-3 text-purple-400" /> {shop.staffCount}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          shop.isActive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {shop.isActive ? "Operational" : "Suspended"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {shop.isActive ? (
                        <button
                          onClick={() => {
                            setError(null);
                            setSuspensionReason("");
                            setSuspendingShop(shop);
                          }}
                          className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" /> Suspend Outlet
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setError(null);
                            setReactivationReason("");
                            setReactivatingShop(shop);
                          }}
                          className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 inline-flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspension Modal */}
      {suspendingShop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Suspend Shop Outlet</h2>
                  <p className="text-xs text-slate-400">{suspendingShop.name} ({suspendingShop.code})</p>
                </div>
              </div>
              <button
                onClick={() => setSuspendingShop(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSuspension} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Explaining Consequences to User */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Operational Impact of Suspension:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>Cashiers will be blocked from finalizing sales at the POS terminal.</li>
                  <li>Inventory balance adjustments and goods receiving will be halted.</li>
                  <li>Existing transaction records and ledger histories will remain completely preserved.</li>
                  <li>Affected shop users will see your reason message on screen.</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Mandatory Suspension Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Account audit pending, policy violation investigation, past-due organization subscription..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSuspendingShop(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Ban className="h-4 w-4" />
                  {isPending ? "Suspending..." : "Confirm Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reactivation Modal */}
      {reactivatingShop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 text-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Reactivate Shop Outlet</h2>
                  <p className="text-xs text-slate-400">{reactivatingShop.name} ({reactivatingShop.code})</p>
                </div>
              </div>
              <button
                onClick={() => setReactivatingShop(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReactivation} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <p className="text-slate-400">
                Reactivating this shop will instantly restore POS checkout, stock adjustments, and goods receiving for authorized cashiers and managers.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Reactivation Memo / Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={reactivationReason}
                  onChange={(e) => setReactivationReason(e.target.value)}
                  placeholder="e.g. Account compliance verified, subscription cleared..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReactivatingShop(null)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isPending ? "Reactivating..." : "Reactivate Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

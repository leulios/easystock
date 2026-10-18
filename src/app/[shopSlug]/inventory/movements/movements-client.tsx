"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { ArrowLeft, History, Filter, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { MovementType } from "@prisma/client";

interface MovementRow {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  movementType: MovementType;
  quantityDelta: number;
  resultingBalance: number;
  unitCost: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: Date;
}

interface MovementsClientProps {
  initialMovements: MovementRow[];
  shopSlug: string;
  currency: string;
}

export function MovementsClient({ initialMovements, shopSlug, currency }: MovementsClientProps) {
  const [movements] = useState<MovementRow[]>(initialMovements);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const filtered = movements.filter((m) => {
    return !typeFilter || m.movementType === typeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/${shopSlug}/inventory`}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium mb-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock Movement Ledger
          </h1>
          <p className="text-sm text-slate-500">
            Immutable, traceable history of all inventory balance changes
          </p>
        </div>

        <div className="w-full sm:w-56">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          >
            <option value="">All Movement Types</option>
            <option value="SALE_DEDUCTION">Sale Deductions</option>
            <option value="PURCHASE_RECEIPT">Purchase Receipts</option>
            <option value="MANUAL_ADJUSTMENT">Manual Adjustments</option>
            <option value="RETURN_RESTOCK">Return Restocks</option>
            <option value="DAMAGE_WASTE">Damage & Shrinkage</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4 text-right">Quantity Delta</th>
                <th className="py-3 px-4 text-right">Resulting Balance</th>
                <th className="py-3 px-4">Reference & Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <History className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No stock movements recorded</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const isPositive = m.quantityDelta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString()}{" "}
                        <span className="text-slate-400 font-mono">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{m.productName}</div>
                        <div className="font-mono text-xs text-slate-400">{m.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {m.movementType.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                          {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {m.resultingBalance}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {m.referenceId && (
                          <span className="font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded mr-1.5">
                            {m.referenceId}
                          </span>
                        )}
                        <span>{m.notes || "—"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

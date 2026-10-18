"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { ArrowLeft, Download, Boxes, DollarSign, TrendingUp, Search } from "lucide-react";

interface InventoryReportClientProps {
  items: any[];
  shopSlug: string;
  currency: string;
}

export function InventoryReportClient({ items, shopSlug, currency }: InventoryReportClientProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalCostValuation = items.reduce((sum, i) => sum + i.totalCostValuation, 0);
  const totalRetailValuation = items.reduce((sum, i) => sum + i.totalRetailValuation, 0);
  const potentialProfit = totalRetailValuation - totalCostValuation;
  const overallMargin = totalRetailValuation > 0 ? Math.round((potentialProfit / totalRetailValuation) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/${shopSlug}/reports`}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium mb-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports Hub
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Asset Valuation Statement
          </h1>
          <p className="text-sm text-slate-500">
            Stock assets evaluated under current unit cost vs retail selling price
          </p>
        </div>

        <a
          href={`/api/export/inventory`}
          download
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start"
        >
          <Download className="h-4 w-4 text-emerald-600" /> Export Inventory CSV
        </a>
      </div>

      {/* Valuation Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Units on Hand
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">{totalUnits} pcs</div>
          <span className="text-[10px] text-slate-500">{items.length} unique SKUs</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Asset Valuation (Cost)
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(totalCostValuation, currency)}
          </div>
          <span className="text-[10px] text-slate-500">Capital tied up</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Retail Valuation
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(totalRetailValuation, currency)}
          </div>
          <span className="text-[10px] text-slate-500">Gross revenue potential</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Gross Margin Potential
          </span>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {formatCurrency(potentialProfit, currency)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">{overallMargin}% margin</span>
        </div>
      </div>

      {/* Filter */}
      <div className="max-w-md relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter catalog by product, SKU, or category..."
          className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Units</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-right">Total Retail</th>
                <th className="py-3 px-4 text-right">Profit Potential</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching catalog products found.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => (
                  <tr key={i.sku} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{i.sku}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{i.name}</td>
                    <td className="py-3 px-4 text-slate-500">{i.category}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{i.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(i.unitCost, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(i.retailPrice, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(i.totalCostValuation, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(i.totalRetailValuation, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      {formatCurrency(i.potentialProfit, currency)}
                      <span className="text-[10px] text-slate-400 ml-1">({i.marginPct}%)</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

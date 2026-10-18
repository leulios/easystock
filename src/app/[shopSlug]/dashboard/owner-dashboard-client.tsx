"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { DateRangePreset } from "@/lib/services/reporting-service";
import {
  DollarSign,
  TrendingUp,
  Boxes,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  Download,
  ArrowRight,
  Package,
  Layers,
  ArrowUpRight,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface OwnerDashboardClientProps {
  initialData: any;
  shopSlug: string;
}

export function OwnerDashboardClient({ initialData, shopSlug }: OwnerDashboardClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<DateRangePreset>(initialData.period || "30d");
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: DateRangePreset) => {
    setPeriod(newPeriod);
    router.push(`/${shopSlug}/dashboard?period=${newPeriod}`);
  };

  const { financials, inventory, bestSellers, salesTrends, shop } = data;

  return (
    <div className="space-y-8">
      {/* Top Bar: Title & Date Range Presets & Action Shortcuts */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {shop.name} Executive Dashboard
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 uppercase tracking-wider">
              Shop Owner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audited financial metrics, inventory asset valuation, and performance analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            {(["today", "7d", "30d", "month", "all"] as DateRangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  period === p
                    ? "bg-white text-blue-600 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p === "today"
                  ? "Today"
                  : p === "7d"
                  ? "7 Days"
                  : p === "30d"
                  ? "30 Days"
                  : p === "month"
                  ? "This Month"
                  : "All Time"}
              </button>
            ))}
          </div>

          <Link href={`/${shopSlug}/pos`}>
            <Button size="sm">
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Launch POS
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Financial Metric Cards (Explicit distinction between Revenue, COGS, Expenses, and Net Profit) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gross Revenue
            </span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(financials.grossRevenue, shop.currency)}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>{financials.ordersCount} orders</span>
            <span>Avg: {formatCurrency(financials.averageOrderValue, shop.currency)}</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gross Profit
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {formatCurrency(financials.grossProfit, shop.currency)}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>COGS: {formatCurrency(financials.cogs, shop.currency)}</span>
            <span className="font-semibold text-emerald-700">{financials.grossMarginPct}% margin</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operating Expenses
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {formatCurrency(financials.operatingExpenses, shop.currency)}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>Rent, utilities & supplies</span>
            <Link href={`/${shopSlug}/expenses`} className="text-blue-600 hover:underline">
              Manage &rarr;
            </Link>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Operating Profit
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold ${
              financials.netProfit >= 0 ? "text-indigo-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(financials.netProfit, shop.currency)}
          </div>
          <div className="text-[11px] text-slate-500 flex justify-between">
            <span>Gross Profit - Expenses</span>
            <span className="font-semibold text-indigo-700">{financials.netMarginPct}% net</span>
          </div>
        </div>
      </div>

      {/* Inventory Asset Valuation Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300">
            <Boxes className="h-3.5 w-3.5" /> Inventory Asset Valuation (Cost Model)
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(inventory.assetValuationAtCost, shop.currency)}
          </div>
          <p className="text-xs text-slate-300">
            Total of {inventory.totalUnits} items on hand across all catalog SKUs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs border-t md:border-t-0 md:border-l border-slate-700/80 pt-4 md:pt-0 md:pl-6">
          <div>
            <div className="text-slate-400">Retail Value</div>
            <div className="text-sm font-bold text-slate-100">
              {formatCurrency(inventory.retailValuation, shop.currency)}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Potential Gross Margin</div>
            <div className="text-sm font-bold text-emerald-400">
              {formatCurrency(inventory.potentialGrossProfit, shop.currency)}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Stock Alerts</div>
            <div className="text-sm font-bold text-amber-400">
              {inventory.lowStockCount} low / {inventory.outOfStockCount} out
            </div>
          </div>
          <Link
            href={`/${shopSlug}/reports/inventory-valuation`}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Full Asset Report
          </Link>
        </div>
      </div>

      {/* Visual Sales Trends & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Sales Performance Trend</h2>
            <span className="text-xs text-slate-400 font-medium">{period.toUpperCase()}</span>
          </div>

          {salesTrends.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No sales recorded for this period. Complete transactions in POS to view trends.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-44 flex items-end gap-2 pt-6">
                {salesTrends.map((trend: any) => {
                  const maxRevenue = Math.max(...salesTrends.map((t: any) => t.revenue), 1);
                  const heightPercent = Math.max(8, Math.round((trend.revenue / maxRevenue) * 100));
                  return (
                    <div
                      key={trend.date}
                      className="flex-1 flex flex-col items-center gap-1.5 group relative"
                    >
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap z-20 pointer-events-none">
                        {formatCurrency(trend.revenue, shop.currency)} ({trend.ordersCount} sales)
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-sm transition-all"
                      />
                      <span className="text-[10px] text-slate-400 font-mono truncate w-full text-center">
                        {trend.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Top 5 Best Sellers */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-base">Best-Selling Items</h2>
          {bestSellers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No product sales data available for this range.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {bestSellers.map((item: any, idx: number) => (
                <div key={item.sku} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-slate-100 font-bold text-[10px] flex items-center justify-center text-slate-600">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {formatCurrency(item.revenue, shop.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500">{item.units} sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Low Stock Warnings & Reports Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Attention List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Stock Attention Required
            </h2>
            <Link
              href={`/${shopSlug}/inventory`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Manage Stock &rarr;
            </Link>
          </div>

          {inventory.lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              All catalog products have sufficient inventory above reorder thresholds.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {inventory.lowStockItems.map((item: any) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.sku} | Reorder min: {item.reorderLevel}
                    </div>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      item.stock <= 0
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.stock <= 0 ? "OUT OF STOCK" : `${item.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Report Access Hub */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-base">Financial & Export Center</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href={`/${shopSlug}/reports/sales`}
              className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 rounded-xl transition-colors block text-left"
            >
              <DollarSign className="h-4 w-4 text-blue-600 mb-2" />
              <div className="font-bold text-slate-900 text-xs">Sales Statement</div>
              <p className="text-[10px] text-slate-500 mt-1">Payment splits, taxes & CSV export</p>
            </Link>

            <Link
              href={`/${shopSlug}/reports/inventory-valuation`}
              className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 rounded-xl transition-colors block text-left"
            >
              <Boxes className="h-4 w-4 text-emerald-600 mb-2" />
              <div className="font-bold text-slate-900 text-xs">Inventory Assets</div>
              <p className="text-[10px] text-slate-500 mt-1">Valuation at cost vs retail price</p>
            </Link>

            <Link
              href={`/${shopSlug}/reports/profit-loss`}
              className="p-3 bg-slate-50 hover:bg-purple-50/50 border border-slate-200 rounded-xl transition-colors block text-left"
            >
              <TrendingUp className="h-4 w-4 text-purple-600 mb-2" />
              <div className="font-bold text-slate-900 text-xs">Profit & Loss</div>
              <p className="text-[10px] text-slate-500 mt-1">Net margins, COGS, operating overhead</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

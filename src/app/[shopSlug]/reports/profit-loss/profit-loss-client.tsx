"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { ArrowLeft, Download, TrendingUp, DollarSign, Layers, Info } from "lucide-react";
import { DateRangePreset } from "@/lib/services/reporting-service";
import { useRouter } from "next/navigation";

interface ProfitLossClientProps {
  data: any;
  period: DateRangePreset;
  shopSlug: string;
  currency: string;
}

export function ProfitLossClient({ data, period, shopSlug, currency }: ProfitLossClientProps) {
  const router = useRouter();
  const [currentPeriod, setCurrentPeriod] = useState<DateRangePreset>(period);

  const handlePeriodChange = (p: DateRangePreset) => {
    setCurrentPeriod(p);
    router.push(`/${shopSlug}/reports/profit-loss?period=${p}`);
  };

  const hasExpenses = Object.keys(data.expensesByCategory).length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            Profit & Loss Statement (P&L)
          </h1>
          <p className="text-sm text-slate-500">
            Standard income statement separating revenue, wholesale COGS, and operating expenses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            {(["today", "7d", "30d", "month", "all"] as DateRangePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  currentPeriod === p
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

          <a
            href={`/api/export/profit-loss?period=${currentPeriod}`}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download className="h-4 w-4 text-purple-600" /> Export Statement CSV
          </a>
        </div>
      </div>

      {/* Accounting Notice */}
      <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Accounting Note:</span> COGS is derived from individual product unit cost records at the time of each sale. Net operating profit reflects Gross Profit less logged operational expenses.
        </div>
      </div>

      {/* Formal Income Statement Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
        {/* 1. Operating Revenue */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
            1. Operating Revenue
          </h2>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-2.5 flex justify-between">
              <span className="text-slate-700">Gross Sales (Tendered Total)</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(data.grossRevenue, currency)}
              </span>
            </div>
            <div className="py-2.5 flex justify-between text-slate-500">
              <span>Less: Sales Discounts Given</span>
              <span className="text-rose-600">-{formatCurrency(data.discounts, currency)}</span>
            </div>
            <div className="py-2.5 flex justify-between text-slate-500">
              <span>Less: Sales Tax Collected</span>
              <span className="text-slate-600">-{formatCurrency(data.taxCollected, currency)}</span>
            </div>
            <div className="py-2.5 flex justify-between font-bold text-slate-900 bg-slate-50 px-3 rounded-lg">
              <span>Net Sales Revenue</span>
              <span>{formatCurrency(data.netRevenue, currency)}</span>
            </div>
          </div>
        </div>

        {/* 2. Cost of Goods Sold & Gross Profit */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
            2. Cost of Goods Sold (COGS)
          </h2>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-2.5 flex justify-between text-slate-600">
              <span>Cost of Items Sold (Wholesale Inventory Deductions)</span>
              <span>-{formatCurrency(data.cogs, currency)}</span>
            </div>
            <div className="py-2.5 flex justify-between font-bold text-emerald-600 bg-emerald-50/60 px-3 rounded-lg">
              <span>Gross Profit (Net Sales - COGS)</span>
              <div className="text-right">
                <span>{formatCurrency(data.grossProfit, currency)}</span>
                <span className="text-xs font-medium text-emerald-700 ml-2">
                  ({data.grossMarginPercent}% margin)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Operating Expenses */}
        <div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Operating Overhead & Expenses
            </h2>
            <Link
              href={`/${shopSlug}/expenses`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              + Log Expense
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-sm">
            {!hasExpenses ? (
              <div className="py-3 text-slate-400 text-xs italic">
                No operational expenses recorded for this period.
              </div>
            ) : (
              Object.entries(data.expensesByCategory).map(([cat, amt]) => (
                <div key={cat} className="py-2 flex justify-between text-slate-600 text-xs">
                  <span>{cat}</span>
                  <span>{formatCurrency(amt as number, currency)}</span>
                </div>
              ))
            )}
            <div className="py-2.5 flex justify-between font-bold text-rose-600 bg-rose-50/40 px-3 rounded-lg">
              <span>Total Operating Expenses</span>
              <span>-{formatCurrency(data.totalExpenses, currency)}</span>
            </div>
          </div>
        </div>

        {/* 4. Bottom Line: Net Operating Income */}
        <div className="pt-2">
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-base font-extrabold ${
              data.netProfit >= 0
                ? "bg-slate-900 text-white"
                : "bg-rose-600 text-white"
            }`}
          >
            <div>
              <div>NET OPERATING INCOME / PROFIT</div>
              <div className="text-xs font-normal opacity-80">
                Gross Profit minus Operating Expenses
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl">{formatCurrency(data.netProfit, currency)}</div>
              <div className="text-xs font-medium opacity-90">{data.netMarginPercent}% net margin</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

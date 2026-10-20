"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, DollarSign, Calendar } from "lucide-react";
import { DateRangePreset } from "@/lib/services/reporting-service";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

interface SalesReportClientProps {
  sales: any[];
  period: DateRangePreset;
  shopSlug: string;
  currency: string;
}

export function SalesReportClient({ sales, period, shopSlug, currency }: SalesReportClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [currentPeriod, setCurrentPeriod] = useState<DateRangePreset>(period);

  const handlePeriodChange = (p: DateRangePreset) => {
    setCurrentPeriod(p);
    router.push(`/${shopSlug}/reports/sales?period=${p}`);
  };

  const totalGross = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTax = sales.reduce((sum, s) => sum + s.tax, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);
  const totalCOGS = sales.reduce((sum, s) => sum + s.cogs, 0);
  const totalNetMargin = sales.reduce((sum, s) => sum + s.margin, 0);

  const getPresetLabel = (p: DateRangePreset) => {
    switch (p) {
      case "today": return t("dateRangeToday");
      case "7d": return t("dateRangeWeek");
      case "30d": return language === "am" ? "30 ቀናት" : "30 Days";
      case "month": return t("dateRangeMonth");
      case "all": return t("dateRangeAll");
      default: return p;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/${shopSlug}/reports`}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium mb-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("backToReportsHub")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("salesMarginReport")}
          </h1>
          <p className="text-sm text-slate-500">
            {t("salesReportDesc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Buttons */}
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
                {getPresetLabel(p)}
              </button>
            ))}
          </div>

          <a
            href={`/api/export/sales?period=${currentPeriod}`}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" /> {t("exportCsv")}
          </a>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {t("grossRevenue")}
          </span>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">
            {formatCurrency(totalGross, currency)}
          </div>
          <span className="text-[10px] text-slate-500">{sales.length} {t("transactionCount")}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {t("totalDiscountsGiven")}
          </span>
          <div className="text-lg font-extrabold text-rose-600 mt-0.5">
            {formatCurrency(totalDiscount, currency)}
          </div>
          <span className="text-[10px] text-slate-500">{language === "am" ? "የተደረገ ቅናሽ" : "Customer savings"}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {t("totalTaxCollected")}
          </span>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">
            {formatCurrency(totalTax, currency)}
          </div>
          <span className="text-[10px] text-slate-500">VAT / Sales Tax</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {t("costOfGoodsSold")}
          </span>
          <div className="text-lg font-extrabold text-slate-700 mt-0.5">
            {formatCurrency(totalCOGS, currency)}
          </div>
          <span className="text-[10px] text-slate-500">{language === "am" ? "የዕቃዎች የግዢ ዋጋ" : "Unit wholesale cost"}</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {t("grossProfit")}
          </span>
          <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
            {formatCurrency(totalNetMargin, currency)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {totalGross > 0 ? Math.round((totalNetMargin / (totalGross - totalTax)) * 100) : 0}% {language === "am" ? "ትርፍ" : "margin"}
          </span>
        </div>
      </div>

      {/* Sales Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{language === "am" ? "የደረሰኝ #" : "Receipt #"}</th>
                <th className="py-3 px-4">{t("date")}</th>
                <th className="py-3 px-4">{t("customerName")}</th>
                <th className="py-3 px-4 text-right">{t("subtotal")}</th>
                <th className="py-3 px-4 text-right">{t("tax")}</th>
                <th className="py-3 px-4 text-right">{t("totalToPay")}</th>
                <th className="py-3 px-4 text-right">{t("grossProfit")}</th>
                <th className="py-3 px-4">{t("paymentMethod")}</th>
                <th className="py-3 px-4 text-center">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {language === "am" ? "ለተመረጠው የጊዜ ገደብ ምንም የሽያጭ መዝገብ የለም።" : "No sales recorded for the selected date range."}
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.receiptNumber} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.receiptNumber}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(s.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{s.customer}</td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(s.subtotal, currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(s.tax, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(s.total, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      {formatCurrency(s.margin, currency)}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.paymentMethods}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        {s.status}
                      </span>
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

"use client";

import React from "react";
import Link from "next/link";
import { DollarSign, Boxes, TrendingUp, Download, ArrowRight, ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface ReportsHubClientProps {
  shopSlug: string;
  canViewReports: boolean;
}

export function ReportsHubClient({ shopSlug, canViewReports }: ReportsHubClientProps) {
  const { t, language } = useLanguage();

  if (!canViewReports) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">{t("restrictedAccess")}</h1>
        <p className="text-sm text-slate-500">{t("restrictedAccessDesc")}</p>
        <Link
          href={`/${shopSlug}/dashboard`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          {t("returnToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("reportsHubTitle")}</h1>
        <p className="text-sm text-slate-500">{t("reportsHubSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t("salesReport")}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{t("salesReportDesc")}</p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/${shopSlug}/reports/sales`}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              {t("openReport")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`/api/export/sales?period=30d`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Download 30d CSV"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Boxes className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t("inventoryValuationReport")}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{t("inventoryReportDesc")}</p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/${shopSlug}/reports/inventory-valuation`}
              className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              {t("openReport")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`/api/export/inventory`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Download CSV"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">{t("profitLossReport")}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{t("profitLossReportDesc")}</p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/${shopSlug}/reports/profit-loss`}
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              {t("openStatement")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`/api/export/profit-loss?period=month`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Download Month CSV"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

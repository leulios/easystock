"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { ReturnModal } from "./return-modal";
import { ReceiptModal } from "../receipt-modal";
import { ArrowLeft, ShoppingCart, RotateCcw, Printer, Filter } from "lucide-react";
import { SaleStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

interface HistoryClientProps {
  sales: any[];
  shopSlug: string;
  shopName: string;
  currency: string;
}

export function HistoryClient({ sales, shopSlug, shopName, currency }: HistoryClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<any>(null);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredSales = sales.filter((s) => !statusFilter || s.status === statusFilter);

  const getStatusLabel = (status: SaleStatus) => {
    switch (status) {
      case SaleStatus.COMPLETED: return language === "am" ? "የተጠናቀቀ" : "Completed";
      case SaleStatus.REFUNDED: return language === "am" ? "የተመለሰ" : "Refunded";
      case SaleStatus.PARTIALLY_REFUNDED: return language === "am" ? "በከፊል የተመለሰ" : "Partially Refunded";
      case SaleStatus.VOIDED: return language === "am" ? "የተሰረዘ" : "Voided";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/${shopSlug}/pos`}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium mb-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("backToPOS")}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("salesHistoryTitle")}</h1>
          <p className="text-sm text-slate-500">
            {t("salesHistorySubtitle")}
          </p>
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          >
            <option value="">{t("allTransactions")}</option>
            <option value="COMPLETED">{language === "am" ? "የተጠናቀቀ" : "Completed"}</option>
            <option value="REFUNDED">{language === "am" ? "የተመለሰ" : "Refunded"}</option>
            <option value="PARTIALLY_REFUNDED">{language === "am" ? "በከፊል የተመለሰ" : "Partially Refunded"}</option>
            <option value="VOIDED">{language === "am" ? "የተሰረዘ" : "Voided"}</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{language === "am" ? "የደረሰኝ #" : "Receipt #"}</th>
                <th className="py-3 px-4">{t("date")}</th>
                <th className="py-3 px-4">{language === "am" ? "የዕቃዎች ማጠቃለያ" : "Items Summary"}</th>
                <th className="py-3 px-4">{t("paymentMethod")}</th>
                <th className="py-3 px-4 text-right">{t("totalToPay")}</th>
                <th className="py-3 px-4 text-center">{t("status")}</th>
                <th className="py-3 px-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">{language === "am" ? "ምንም የተጠናቀቀ የሽያጭ መዝገብ የለም" : "No sale transactions found"}</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 text-xs">
                      {sale.receiptNumber}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString()}{" "}
                      <span className="text-slate-400">
                        {new Date(sale.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {sale.items?.map((i: any) => `${i.quantity}x ${i.variant?.product?.name}`).join(", ")}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {sale.payments?.map((p: any) => p.paymentMethod).join(", ")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(sale.totalAmount, currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          sale.status === SaleStatus.COMPLETED
                            ? "bg-emerald-50 text-emerald-700"
                            : sale.status === SaleStatus.REFUNDED
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {getStatusLabel(sale.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          title={language === "am" ? "ደረሰኝ በድጋሚ አትም" : "Reprint Receipt"}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {sale.status === SaleStatus.COMPLETED && (
                          <button
                            onClick={() => setSelectedSaleForReturn(sale)}
                            title={language === "am" ? "ዕቃ መመለሻ" : "Process Return"}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReturnModal
        isOpen={Boolean(selectedSaleForReturn)}
        onClose={() => setSelectedSaleForReturn(null)}
        sale={selectedSaleForReturn}
        currency={currency}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <ReceiptModal
        isOpen={Boolean(selectedSaleForReceipt)}
        onClose={() => setSelectedSaleForReceipt(null)}
        sale={selectedSaleForReceipt}
        shopName={shopName}
        currency={currency}
      />
    </div>
  );
}

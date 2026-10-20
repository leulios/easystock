"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { ReceiveModal } from "./receive-modal";
import { Truck, Plus, PackageCheck, Users } from "lucide-react";
import { POStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

interface PurchasesClientProps {
  orders: any[];
  shopSlug: string;
  currency: string;
}

export function PurchasesClient({ orders, shopSlug, currency }: PurchasesClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredOrders = orders.filter((po) => !statusFilter || po.status === statusFilter);

  const getStatusLabel = (status: POStatus) => {
    switch (status) {
      case POStatus.RECEIVED: return t("fullyReceived");
      case POStatus.PARTIALLY_RECEIVED: return t("partiallyReceived");
      case POStatus.ORDERED: return t("ordered");
      case POStatus.DRAFT: return t("draft");
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("purchasesTitle")}
          </h1>
          <p className="text-sm text-slate-500">
            {t("purchasesSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${shopSlug}/purchases/suppliers`}
            className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Users className="h-4 w-4" /> {t("suppliersDirectory")}
          </Link>
          <Link
            href={`/${shopSlug}/purchases/new`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> {t("createPoBtn")}
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex justify-end">
        <div className="w-full sm:w-52">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          >
            <option value="">{t("allOrders")}</option>
            <option value="ORDERED">{t("ordered")}</option>
            <option value="PARTIALLY_RECEIVED">{t("partiallyReceived")}</option>
            <option value="RECEIVED">{t("fullyReceived")}</option>
            <option value="DRAFT">{t("draft")}</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{t("poNumber")}</th>
                <th className="py-3 px-4">{t("supplierName")}</th>
                <th className="py-3 px-4">{t("date")}</th>
                <th className="py-3 px-4 text-center">{t("itemsCount")}</th>
                <th className="py-3 px-4 text-right">{t("totalCost")}</th>
                <th className="py-3 px-4 text-center">{t("orderStatus")}</th>
                <th className="py-3 px-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">{t("noPurchasesFound")}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === "am" ? "አዲስ የግዢ ትዕዛዝ ለመፍጠር 'አዲስ የግዢ ትዕዛዝ ፍጠር' የሚለውን ይጫኑ።" : "Click 'Create Purchase Order' to initiate vendor procurement."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const canReceive =
                    po.status === POStatus.ORDERED || po.status === POStatus.PARTIALLY_RECEIVED;
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 text-xs">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {po.supplier?.name || (language === "am" ? "ያልታወቀ አቅራቢ" : "Unknown Supplier")}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-slate-600">
                        {po.items?.length || 0} {language === "am" ? "ዕቃዎች" : "items"}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">
                        {formatCurrency(po.totalAmount, currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            po.status === POStatus.RECEIVED
                              ? "bg-emerald-50 text-emerald-700"
                              : po.status === POStatus.PARTIALLY_RECEIVED
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {getStatusLabel(po.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canReceive && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedPO(po)}
                          >
                            <PackageCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                            {t("receiveOrderBtn")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiveModal
        isOpen={Boolean(selectedPO)}
        onClose={() => setSelectedPO(null)}
        purchaseOrder={selectedPO}
        currency={currency}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

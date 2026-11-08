"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { ReceiveModal } from "./receive-modal";
import { Truck, Plus, PackageCheck, Users, FileText, Send, Clock, CheckCircle2 } from "lucide-react";
import { POStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

interface PurchasesClientProps {
  orders: any[];
  documents?: any[];
  shopSlug: string;
  currency: string;
}

export function PurchasesClient({ orders, documents = [], shopSlug, currency }: PurchasesClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"orders" | "documents">("orders");

  const pendingDocsCount = documents.filter((d) => d.status === "PENDING_REVIEW").length;
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "orders"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck className="h-4 w-4" />
          {language === "am" ? "የግዢ ትዕዛዞች" : "Purchase Orders"} ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "documents"
              ? "border-sky-500 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Send className="h-4 w-4 text-sky-500" />
          {language === "am" ? "የተላኩ ደረሰኞች (ቴሌግራም)" : "Uploaded Invoices (Telegram)"}
          {pendingDocsCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {pendingDocsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "orders" ? (
        <>
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
        </>
      ) : (
        /* Telegram Uploaded Invoices Tab */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {language === "am" ? "በቴሌግራም የተላኩ የአቅራቢ ደረሰኞች" : "Supplier Invoices Received via Telegram"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === "am"
                ? "ሰራተኞች ወይም እርስዎ በቴሌግራም የላኳቸው የወረቀት ደረሰኞች እዚህ ተቀምጠዋል።"
                : "Photos of supplier invoices or delivery notes sent by staff to the Telegram bot."}
            </p>
          </div>

          {documents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">
                {language === "am" ? "እስካሁን የተላከ ደረሰኝ የለም።" : "No invoices received yet."}
              </p>
              <p className="text-xs text-slate-400">
                {language === "am"
                  ? "የወረቀት ደረሰኝ በስልክዎ ካሜራ አንስተው ለኢዚስቶክ ቴሌግራም ቦት ይላኩ።"
                  : "Take a photo of any supplier delivery note and send it to the EasyStock Telegram bot."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors bg-slate-50/50 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                            {doc.documentType}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded border border-slate-100">
                            {doc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        doc.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : doc.status === "PENDING_REVIEW"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/${shopSlug}/purchases/new`}
                      className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {language === "am" ? "ግዢ ፍጠር" : "Create PO"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

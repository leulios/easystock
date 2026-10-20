"use client";

import React from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  shopName: string;
  currency: string;
}

export function ReceiptModal({ isOpen, onClose, sale, shopName, currency }: ReceiptModalProps) {
  const { t, language } = useLanguage();
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t("saleCompleted")}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-emerald-100/50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Style */}
        <div className="p-6 font-mono text-xs overflow-y-auto space-y-4 print:p-0">
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="font-bold text-sm tracking-tight">{shopName}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === "am" ? "የሽያጭ ደረሰኝ" : "Official Sale Receipt"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Receipt #: {sale.receiptNumber}</p>
            <p className="text-[10px] text-slate-400">
              {t("date")}: {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Line Items */}
          <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
            {sale.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start text-xs">
                <div>
                  <div className="font-semibold text-slate-900">
                    {item.variant?.product?.name || "Product"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {item.quantity} x {formatCurrency(item.unitPrice, currency)}
                  </div>
                </div>
                <div className="font-bold text-slate-900">
                  {formatCurrency(item.totalPrice, currency)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{t("subtotal")}:</span>
              <span>{formatCurrency(sale.subtotal, currency)}</span>
            </div>
            {Number(sale.discountAmount) > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>{t("discount")}:</span>
                <span>-{formatCurrency(sale.discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>{t("tax")}:</span>
              <span>{formatCurrency(sale.taxAmount, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>{t("totalToPay")}:</span>
              <span>{formatCurrency(sale.totalAmount, currency)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="text-[11px] text-slate-600">
            {sale.payments?.map((p: any) => (
              <div key={p.id} className="flex justify-between">
                <span>{t("paymentMethod")}: {p.paymentMethod}</span>
                <span>{formatCurrency(p.amount, currency)}</span>
              </div>
            ))}
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-2">
            {language === "am" ? "ስለጎበኙን እናመሰግናለን!" : "Thank you for shopping with us!"}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
          <Button variant="outline" size="sm" onClick={onClose} className="w-1/2">
            {t("close")}
          </Button>
          <Button size="sm" onClick={handlePrint} className="w-1/2">
            <Printer className="h-3.5 w-3.5 mr-1.5" /> {t("printReceipt")}
          </Button>
        </div>
      </div>
    </div>
  );
}

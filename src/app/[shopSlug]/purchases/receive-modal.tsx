"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { receivePurchaseStockAction } from "@/app/actions/purchases";
import { Truck, X, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
  currency: string;
  onSuccess?: () => void;
}

export function ReceiveModal({ isOpen, onClose, purchaseOrder, currency, onSuccess }: ReceiveModalProps) {
  const { t, language } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !purchaseOrder) return null;

  const handleQtyChange = (variantId: string, qty: number, max: number) => {
    const clamped = Math.max(0, Math.min(qty, max));
    setReceiveQuantities((prev) => ({ ...prev, [variantId]: clamped }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const itemsToReceive = Object.entries(receiveQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([variantId, receivedQuantity]) => ({
        variantId,
        receivedQuantity,
      }));

    if (itemsToReceive.length === 0) {
      setErrorMessage(language === "am" ? "እባክዎ ቢያንስ ለአንድ ዕቃ የተረከቡትን ብዛት ያስገቡ" : "Please enter received quantities for at least one item.");
      return;
    }

    startTransition(async () => {
      const result = await receivePurchaseStockAction({
        purchaseOrderId: purchaseOrder.id,
        items: itemsToReceive,
        notes: notes || null,
      });

      if (!result.success) {
        setErrorMessage(result.error || (language === "am" ? "የዕቃ ርክክቡን መመዝገብ አልተቻለም" : "Failed to receive purchase stock"));
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("receiveGoodsGrn")}</h2>
              <p className="text-xs text-slate-500">
                {t("poNumber")}: {purchaseOrder.poNumber} — {t("supplierName")}: {purchaseOrder.supplier?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {t("verifyReceivedQuantities")}
            </label>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {purchaseOrder.items?.map((item: any) => {
                const pending = item.orderedQuantity - item.receivedQuantity;
                const isCompleted = pending <= 0;
                const currentReceive = receiveQuantities[item.variantId] ?? (isCompleted ? 0 : pending);

                return (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.variant?.product?.name || "Product"}
                      </div>
                      <div className="text-slate-500">
                        {t("orderedQty")}: {item.orderedQuantity} | {t("receivedSoFar")}: {item.receivedQuantity} | {language === "am" ? "የቀረው" : "Pending"}:{" "}
                        <span className={pending > 0 ? "text-amber-600 font-semibold" : "text-emerald-600"}>
                          {pending}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{t("receivingNow")}:</span>
                      <input
                        type="number"
                        min="0"
                        max={pending}
                        disabled={isCompleted}
                        value={currentReceive}
                        onChange={(e) =>
                          handleQtyChange(item.variantId, parseInt(e.target.value, 10) || 0, pending)
                        }
                        className="w-16 h-8 px-2 border border-slate-300 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:opacity-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" isLoading={isPending}>
              {t("confirmReceiveStockBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

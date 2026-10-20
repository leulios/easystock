"use client";

import React, { useState, useTransition } from "react";
import { adjustStockAction } from "@/app/actions/inventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface AdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    variantId?: string;
    name: string;
    sku: string;
    currentStock: number;
  } | null;
  onSuccess?: () => void;
}

export function AdjustModal({ isOpen, onClose, product, onSuccess }: AdjustModalProps) {
  const { t, language } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [adjustmentType, setAdjustmentType] = useState<"SET_QUANTITY" | "ADD_QUANTITY" | "DEDUCT_QUANTITY">("SET_QUANTITY");
  const [quantity, setQuantity] = useState<number>(product?.currentStock ?? 0);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !product || !product.variantId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await adjustStockAction({
        variantId: product.variantId!,
        adjustmentType,
        quantity: Number(quantity),
        reason: reason || t("reasonCountCorrection"),
        notes: notes || null,
      });

      if (!result.success) {
        setErrorMessage(result.error || t("error"));
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("adjustStockBtn")}</h2>
              <p className="text-xs text-slate-500">{product.name} ({product.sku})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">{t("previousStock")}:</span>
            <span className="font-bold text-slate-900 text-sm">{product.currentStock}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("adjustmentType")}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType("SET_QUANTITY")}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  adjustmentType === "SET_QUANTITY"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("setQuantity")}
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("ADD_QUANTITY")}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  adjustmentType === "ADD_QUANTITY"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("addQuantity")}
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("DEDUCT_QUANTITY")}
                className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                  adjustmentType === "DEDUCT_QUANTITY"
                    ? "border-rose-600 bg-rose-50 text-rose-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t("deductQuantity")}
              </button>
            </div>
          </div>

          <Input
            label={
              adjustmentType === "SET_QUANTITY"
                ? t("setQuantity")
                : adjustmentType === "ADD_QUANTITY"
                ? t("addQuantity")
                : t("deductQuantity")
            }
            type="number"
            min={adjustmentType === "SET_QUANTITY" ? 0 : 1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("mandatoryReason")}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              required
            >
              <option value="">-- {t("mandatoryReason")} --</option>
              <option value="Physical inventory count">{t("reasonCountCorrection")}</option>
              <option value="Restock / New shipment">{t("reasonRestock")}</option>
              <option value="Damaged in transit / expired">{t("reasonDamaged")}</option>
              <option value="Customer return">{t("reasonCustomerReturn")}</option>
              <option value="Internal store use">{t("reasonInternalUse")}</option>
              <option value="Other">{t("reasonOther")}</option>
            </select>
          </div>

          <Input
            label={language === "am" ? "ተጨማሪ ማስታወሻ (አስገዳጅ አይደለም)" : "Internal Notes (Optional)"}
            placeholder={language === "am" ? "የቆጠራ ሰነድ ወይም ማብራሪያ..." : "Additional notes or sheet ID"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" isLoading={isPending}>
              {t("confirmAdjustmentBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

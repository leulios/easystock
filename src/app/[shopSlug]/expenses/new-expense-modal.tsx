"use client";

import React, { useState, useTransition } from "react";
import { createExpenseAction } from "@/app/actions/expenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, X, AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onSuccess?: () => void;
}

const CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Supplies",
  "Marketing",
  "Maintenance",
  "Insurance",
  "Other",
] as const;

export function NewExpenseModal({ isOpen, onClose, currency, onSuccess }: NewExpenseModalProps) {
  const { t, language } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      category: formData.get("category") as any,
      amount: parseFloat(formData.get("amount") as string) || 0,
      expenseDate: (formData.get("expenseDate") as string) || new Date().toISOString(),
      description: (formData.get("description") as string) || null,
    };

    startTransition(async () => {
      const result = await createExpenseAction(data);
      if (!result.success) {
        setErrorMessage(result.error || (language === "am" ? "ወጪውን መመዝገብ አልተቻለም" : "Failed to record expense"));
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  const getCategoryLabel = (cat: string) => {
    if (language !== "am") return cat;
    switch (cat) {
      case "Rent": return "ኪራይ (Rent)";
      case "Utilities": return "መብራትና ውሃ (Utilities)";
      case "Salaries": return "ደመወዝ (Salaries)";
      case "Supplies": return "የሱቅ ዕቃዎች (Supplies)";
      case "Marketing": return "ማስታወቂያ (Marketing)";
      case "Maintenance": return "ጥገና (Maintenance)";
      case "Insurance": return "ኢንሹራንስ (Insurance)";
      default: return "ሌላ (Other)";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("recordExpenseModalTitle")}</h2>
              <p className="text-xs text-slate-500">{t("recordExpenseModalDesc")}</p>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("expenseCategory")}</label>
            <select
              name="category"
              required
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={`${t("expenseAmount")} (${currency})`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="250.00"
          />

          <Input
            label={t("expenseDate")}
            name="expenseDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />

          <Input
            label={t("expenseDescription")}
            name="description"
            placeholder={language === "am" ? "ለምሳሌ፡ የጥቅምት ወር መብራት፣ የጽዳት ዕቃዎች..." : "e.g. Electricity bill for October, store cleaning supplies"}
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" isLoading={isPending}>
              {t("addExpenseBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

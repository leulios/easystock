"use client";

import React, { useState, useTransition } from "react";
import { createExpenseAction, addExpenseCategoryAction } from "@/app/actions/expenses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Receipt, X, AlertCircle, Plus, Tag, Check, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { ExpenseCategoriesResult, CustomExpenseCategory } from "@/lib/services/expense-service";

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  categories: ExpenseCategoriesResult;
  onSuccess?: () => void;
  onCategoriesChange?: (updated: ExpenseCategoriesResult) => void;
}

export function NewExpenseModal({
  isOpen,
  onClose,
  currency,
  categories,
  onSuccess,
  onCategoriesChange,
}: NewExpenseModalProps) {
  const { t, language } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Category state
  const standardCatName =
    language === "am" ? categories.standard.nameAm : categories.standard.nameEn;
  const [selectedCategory, setSelectedCategory] = useState<string>(standardCatName);

  // Quick inline add category
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categorySuccessNotice, setCategorySuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickAddCategory = async (e: React.MouseEvent) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;

    setIsCreatingCategory(true);
    setErrorMessage(null);

    const res = await addExpenseCategoryAction(clean);
    setIsCreatingCategory(false);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to add category");
    } else {
      setSelectedCategory(clean);
      setNewCategoryName("");
      setIsAddingNewCategory(false);
      setCategorySuccessNotice(`${t("newCategoryAddedSuccess")}: "${clean}"`);
      setTimeout(() => setCategorySuccessNotice(null), 3500);

      if (onCategoriesChange) {
        onCategoriesChange({
          ...categories,
          custom: res.categories as CustomExpenseCategory[],
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const amountVal = parseFloat(formData.get("amount") as string) || 0;
    const dateVal = (formData.get("expenseDate") as string) || new Date().toISOString().slice(0, 10);
    const descVal = (formData.get("description") as string)?.trim() || null;
    const notesVal = (formData.get("notes") as string)?.trim() || null;

    if (!selectedCategory) {
      setErrorMessage(language === "am" ? "እባክዎ የምድብ አይነት ይምረጡ" : "Please select an expense category");
      return;
    }

    if (amountVal <= 0) {
      setErrorMessage(
        language === "am" ? "የወጪ መጠን ከዜሮ መብለጥ አለበት" : "Expense amount must be greater than zero"
      );
      return;
    }

    const data = {
      category: selectedCategory,
      amount: amountVal,
      expenseDate: dateVal,
      description: descVal,
      notes: notesVal,
    };

    startTransition(async () => {
      const result = await createExpenseAction(data);
      if (!result.success) {
        setErrorMessage(
          result.error ||
            (language === "am" ? "ወጪውን መመዝገብ አልተቻለም" : "Failed to record expense")
        );
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  const isSelectedTransportation =
    selectedCategory === categories.standard.nameEn ||
    selectedCategory === categories.standard.nameAm ||
    selectedCategory.toLowerCase().includes("transport") ||
    selectedCategory.includes("ትራንስፖርት");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-xs">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("recordExpenseModalTitle")}</h2>
              <p className="text-xs text-slate-500">{t("recordExpenseModalDesc")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700 animate-in slide-in-from-top-1">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {categorySuccessNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-700 animate-in slide-in-from-top-1">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{categorySuccessNotice}</span>
            </div>
          )}

          {/* 1. Category Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span>{t("expenseCategory")}</span>
                <span className="text-rose-500">*</span>
              </label>

              {!isAddingNewCategory ? (
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t("quickAddCategory")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {t("cancel")}
                </button>
              )}
            </div>

            {/* Quick Add Inline Input */}
            {isAddingNewCategory && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 animate-in slide-in-from-top-2">
                <p className="text-[11px] text-blue-900 font-semibold">
                  {language === "am"
                    ? "አዲስ የወጪ ምድብ ስም ይጻፉ (ምሳሌ፦ ኪራይ፣ መብራት፣ ደመወዝ...)"
                    : "Enter custom category name (e.g. Rent, Electricity, Salaries...)"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={t("categoryPlaceholder")}
                    autoFocus
                    className="flex-1 h-9 px-3 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickAddCategory}
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    className="h-9 px-3 text-xs font-bold shrink-0"
                  >
                    {isCreatingCategory ? "..." : t("addCategory")}
                  </Button>
                </div>
              </div>
            )}

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
              className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
            >
              <optgroup label={language === "am" ? "መደበኛ ምድብ (ቋሚ)" : "Standard Category"}>
                <option value={standardCatName}>
                  🚚 {standardCatName} ({t("standardCategoryBadge")})
                </option>
              </optgroup>

              {categories.custom.length > 0 && (
                <optgroup label={language === "am" ? "የእርስዎ ብጁ ምድቦች" : "Your Custom Categories"}>
                  {categories.custom.map((c) => (
                    <option key={c.id} value={c.name}>
                      📂 {c.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {isSelectedTransportation && (
              <p className="text-[11px] text-blue-700 bg-blue-50/60 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5 leading-relaxed">
                <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{t("transportationAcquisitionNote")}</span>
              </p>
            )}
          </div>

          {/* 2. Amount (in ETB / ብር) */}
          <Input
            label={`${t("expenseAmount")} (${currency})`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className="h-11 font-mono font-bold text-base"
          />

          {/* 3. Expense Date */}
          <Input
            label={t("expenseDate")}
            name="expenseDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="h-11"
          />

          {/* 4. Optional Description */}
          <Input
            label={`${t("expenseDescription")} (${language === "am" ? "አስገዳጅ ያልሆነ" : "Optional"})`}
            name="description"
            placeholder={
              language === "am"
                ? "ለምሳሌ፦ ለጥቅምት ወር ሱቅ ኪራይ፣ የሸቀጣሸቀጥ ትራንስፖርት..."
                : "e.g. October store lease, inventory haulage from Merkato"
            }
            className="h-10 text-xs"
          />

          {/* 5. Optional Notes */}
          <Input
            label={`${t("expenseNotes")} (${language === "am" ? "አስገዳጅ ያልሆነ" : "Optional"})`}
            name="notes"
            placeholder={t("expenseNotesPlaceholder")}
            className="h-10 text-xs"
          />

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} className="h-10 text-xs font-semibold">
              {t("cancel")}
            </Button>
            <Button type="submit" isLoading={isPending} className="h-10 text-xs font-bold px-5 bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/20">
              {t("addExpenseBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

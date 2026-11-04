"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { NewExpenseModal } from "./new-expense-modal";
import {
  Receipt,
  Plus,
  Filter,
  Calendar,
  Tag,
  Edit2,
  Trash2,
  Check,
  X,
  Truck,
  Sparkles,
  Layers,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import {
  ExpenseCategoriesResult,
  CustomExpenseCategory,
  isTransportationCategory,
} from "@/lib/services/expense-service";
import {
  addExpenseCategoryAction,
  updateExpenseCategoryAction,
  deleteExpenseCategoryAction,
} from "@/app/actions/expenses";

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  expenseDate: Date;
  description: string | null;
  notes?: string | null;
  createdAt: Date;
}

interface ExpensesClientProps {
  initialExpenses: ExpenseItem[];
  initialCategories: ExpenseCategoriesResult;
  totalAmount: number;
  shopSlug: string;
  currency: string;
}

export function ExpensesClient({
  initialExpenses,
  initialCategories,
  totalAmount,
  shopSlug,
  currency,
}: ExpensesClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [categories, setCategories] = useState<ExpenseCategoriesResult>(initialCategories);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Category management in-modal editing state
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [categoryActionError, setCategoryActionError] = useState<string | null>(null);
  const [categoryActionNotice, setCategoryActionNotice] = useState<string | null>(null);
  const [isCategoryPending, startCategoryTransition] = useTransition();

  const standardCatLabel =
    language === "am" ? categories.standard.nameAm : categories.standard.nameEn;

  // Filter logic
  const filtered = expenses.filter((e) => {
    if (!selectedCategory) return true;
    if (isTransportationCategory(selectedCategory)) {
      return isTransportationCategory(e.category);
    }
    return e.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  // Calculate transportation total
  const transportationTotal = expenses.reduce((sum, e) => {
    return isTransportationCategory(e.category) ? sum + e.amount : sum;
  }, 0);

  // Handlers for Category Management
  const handleAddCategory = () => {
    const clean = newCatName.trim();
    if (!clean) return;
    setCategoryActionError(null);

    startCategoryTransition(async () => {
      const res = await addExpenseCategoryAction(clean);
      if (!res.success) {
        setCategoryActionError(res.error || "Failed to add category");
      } else {
        setCategories((prev) => ({
          ...prev,
          custom: res.categories as CustomExpenseCategory[],
        }));
        setNewCatName("");
        setCategoryActionNotice(`${t("newCategoryAddedSuccess")}: "${clean}"`);
        setTimeout(() => setCategoryActionNotice(null), 3000);
      }
    });
  };

  const handleStartEdit = (cat: CustomExpenseCategory) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setCategoryActionError(null);
  };

  const handleSaveEdit = (id: string) => {
    const clean = editingCatName.trim();
    if (!clean) return;
    setCategoryActionError(null);

    startCategoryTransition(async () => {
      const res = await updateExpenseCategoryAction(id, clean);
      if (!res.success) {
        setCategoryActionError(res.error || "Failed to update category");
      } else {
        setCategories((prev) => ({
          ...prev,
          custom: res.categories as CustomExpenseCategory[],
        }));
        // Update local expense category names if any matched
        setExpenses((prev) =>
          prev.map((e) => {
            const oldCat = categories.custom.find((c) => c.id === id);
            if (oldCat && e.category.toLowerCase() === oldCat.name.toLowerCase()) {
              return { ...e, category: clean };
            }
            return e;
          })
        );
        setEditingCatId(null);
        setCategoryActionNotice(t("categoryUpdatedSuccess"));
        setTimeout(() => setCategoryActionNotice(null), 3000);
      }
    });
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (
      !confirm(
        language === "am"
          ? `የ"${name}" ምድብን መሰረዝ ይፈልጋሉ?`
          : `Are you sure you want to delete the category "${name}"?`
      )
    ) {
      return;
    }
    setCategoryActionError(null);

    startCategoryTransition(async () => {
      const res = await deleteExpenseCategoryAction(id);
      if (!res.success) {
        setCategoryActionError(res.error || "Failed to delete category");
      } else {
        setCategories((prev) => ({
          ...prev,
          custom: res.categories as CustomExpenseCategory[],
        }));
        setCategoryActionNotice(t("categoryDeletedSuccess"));
        setTimeout(() => setCategoryActionNotice(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>{t("businessExpenses")}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("expensesSubtitle")}</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer text-xs h-10"
          >
            <Tag className="h-4 w-4 mr-1.5 text-blue-600" />
            <span>{t("customCategories")}</span>
            {categories.custom.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {categories.custom.length}
              </span>
            )}
          </Button>

          <Button
            onClick={() => setIsRecordModalOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer text-xs h-10 shadow-md shadow-rose-900/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>{t("addExpenseBtn")}</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Expenses */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {language === "am" ? "ጠቅላላ የተመዘገቡ ወጪዎች" : "Total Business Expenses"}
            </p>
            <p className="text-2xl font-black text-rose-600 mt-1 font-mono">
              {formatCurrency(totalAmount, currency)}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        {/* Transportation Acquisition Costs */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <span>{t("transportationCost")}</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 rounded">
                {language === "am" ? "የዕቃ ማግኛ" : "Acquisition"}
              </span>
            </p>
            <p className="text-2xl font-black text-blue-600 mt-1 font-mono">
              {formatCurrency(transportationTotal, currency)}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Truck className="h-6 w-6" />
          </div>
        </div>

        {/* Total Entries Count */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("expenseRecordsCount")}
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {expenses.length} {language === "am" ? "መዝገቦች" : "entries"}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center">
            <Calendar className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Category Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>{t("expenseCategory")}:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-64 h-10 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t("allCategories")}</option>
            <option value={standardCatLabel}>
              🚚 {standardCatLabel} ({t("standardCategoryBadge")})
            </option>
            {categories.custom.map((c) => (
              <option key={c.id} value={c.name}>
                📂 {c.name}
              </option>
            ))}
          </select>

          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory("")}
              className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {language === "am" ? "አጽዳ" : "Clear"}
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table & Cards View */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">{t("date")}</th>
                <th className="py-3 px-4">{t("category")}</th>
                <th className="py-3 px-4">{t("expenseDescription")}</th>
                <th className="py-3 px-4 text-right">{t("expenseAmount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-500">
                    <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">{t("noExpensesFound")}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === "am"
                        ? "ወጪ ለመመዝገብ 'ወጪ መዝግብ' የሚለውን ቁልፍ ይጫኑ።"
                        : "Click 'Record Expense' to log your first business expense."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => {
                  const isTrans = isTransportationCategory(e.category);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {new Date(e.expenseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isTrans
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-800 border border-slate-200"
                          }`}
                        >
                          {isTrans ? <Truck className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                          <span>{e.category}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                        <div className="font-medium text-slate-900">{e.description || "—"}</div>
                        {e.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5 font-sans italic">
                            {language === "am" ? "ማስታወሻ፦" : "Note:"} {e.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono">
                        {formatCurrency(e.amount, currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Stacked Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">{t("noExpensesFound")}</p>
            </div>
          ) : (
            filtered.map((e) => {
              const isTrans = isTransportationCategory(e.category);
              return (
                <div key={e.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        isTrans
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-slate-100 text-slate-800 border border-slate-200"
                      }`}
                    >
                      {isTrans ? <Truck className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                      <span>{e.category}</span>
                    </span>
                    <span className="font-mono font-extrabold text-base text-slate-900">
                      {formatCurrency(e.amount, currency)}
                    </span>
                  </div>

                  {e.description && (
                    <p className="text-xs font-medium text-slate-800 leading-relaxed">
                      {e.description}
                    </p>
                  )}

                  {e.notes && (
                    <p className="text-[11px] text-slate-500 italic">
                      {language === "am" ? "ማስታወሻ፦" : "Note:"} {e.notes}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-400 font-mono">
                    {new Date(e.expenseDate).toLocaleDateString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      <NewExpenseModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        currency={currency}
        categories={categories}
        onCategoriesChange={(updated) => setCategories(updated)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* CUSTOM CATEGORIES MANAGEMENT MODAL */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-xs">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t("manageCategories")}</h2>
                  <p className="text-xs text-slate-500">
                    {language === "am"
                      ? "ለሱቅዎ የሚስማሙ ብጁ የወጪ ምድቦችን ያስተዳድሩ"
                      : "Create and edit expense categories customized for your business"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryManagerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                title={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {categoryActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700 animate-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{categoryActionError}</span>
                </div>
              )}

              {categoryActionNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-700 animate-in slide-in-from-top-1">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{categoryActionNotice}</span>
                </div>
              )}

              {/* 1. Add New Category Input Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>{t("addCategory")}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    placeholder={t("categoryPlaceholder")}
                    className="flex-1 h-10 px-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={isCategoryPending || !newCatName.trim()}
                    className="h-10 px-4 text-xs font-bold shrink-0 bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                  >
                    {isCategoryPending ? "..." : t("addCategory")}
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  {language === "am"
                    ? "ምሳሌዎች፦ ኪራይ፣ መብራት፣ ደመወዝ፣ ጥገና፣ ማድረሻ..."
                    : "Examples: Rent, Electricity, Salaries, Maintenance, Delivery..."}
                </p>
              </div>

              {/* 2. Standard Category Display */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {language === "am" ? "መደበኛ ምድብ" : "Standard Category"}
                </h3>
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-extrabold text-blue-900">
                        {standardCatLabel}
                      </span>
                      <p className="text-[10px] text-blue-700">{t("standardCategoryNotice")}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold border border-blue-200">
                    {t("standardCategoryBadge")}
                  </span>
                </div>
              </div>

              {/* 3. Custom Categories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("customCategories")} ({categories.custom.length})
                  </h3>
                </div>

                {categories.custom.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                    {language === "am"
                      ? "እስካሁን ምንም ብጁ ምድብ አልተፈጠረም። ከላይ አዲስ ምድብ ማከል ይችላሉ።"
                      : "No custom categories created yet. Add your custom categories above."}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {categories.custom.map((c) => {
                      const isEditing = editingCatId === c.id;
                      return (
                        <div
                          key={c.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEdit(c.id);
                                  } else if (e.key === "Escape") {
                                    setEditingCatId(null);
                                  }
                                }}
                                autoFocus
                                className="flex-1 h-8 px-2 text-xs bg-slate-50 border border-blue-400 rounded-md text-slate-900 font-semibold focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(c.id)}
                                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="h-8 px-2 text-slate-500 hover:text-slate-700 rounded-md text-xs cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <Tag className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  {c.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(c)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title={t("editCategory")}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(c.id, c.name)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title={t("deleteCategory")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="h-9 text-xs font-semibold px-4 cursor-pointer"
                >
                  {t("close")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { NewExpenseModal } from "./new-expense-modal";
import { Receipt, Plus, Filter, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  expenseDate: Date;
  description: string | null;
  createdAt: Date;
}

interface ExpensesClientProps {
  initialExpenses: ExpenseItem[];
  totalAmount: number;
  shopSlug: string;
  currency: string;
}

export function ExpensesClient({
  initialExpenses,
  totalAmount,
  shopSlug,
  currency,
}: ExpensesClientProps) {
  const router = useRouter();
  const [expenses] = useState<ExpenseItem[]>(initialExpenses);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = expenses.filter((e) => !selectedCategory || e.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operating Expenses
          </h1>
          <p className="text-sm text-slate-500">
            Track business operational costs, store rent, utilities, and wages
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="self-start">
          <Plus className="h-4 w-4 mr-1.5" /> Record Expense
        </Button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Expenses on Record
            </p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              {formatCurrency(totalAmount, currency)}
            </p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Expense Records Count
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {expenses.length} entries
            </p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex justify-end">
        <div className="w-full sm:w-52">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Rent">Rent</option>
            <option value="Utilities">Utilities</option>
            <option value="Salaries">Salaries</option>
            <option value="Supplies">Supplies</option>
            <option value="Marketing">Marketing</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Insurance">Insurance</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No expense records found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(e.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded text-xs bg-slate-100 font-semibold text-slate-800">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{e.description || "—"}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(e.amount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NewExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currency={currency}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}

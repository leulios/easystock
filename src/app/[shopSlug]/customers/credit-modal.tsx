"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adjustCustomerCreditAction } from "@/app/actions/customers";
import { formatCurrency } from "@/lib/decimal";
import { X, CreditCard, Save, AlertCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: {
    id: string;
    name: string;
    outstandingCredit: number;
  };
  currency: string;
}

export function CreditModal({
  isOpen,
  onClose,
  onSuccess,
  customer,
  currency,
}: CreditModalProps) {
  const [mode, setMode] = useState<"PAYMENT" | "CHARGE">("PAYMENT");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    if (!reason.trim()) {
      setError("An audit reason is required for credit adjustments");
      return;
    }

    // PAYMENT reduces credit (negative delta), CHARGE increases credit (positive delta)
    const amountDelta = mode === "PAYMENT" ? -numericAmount : numericAmount;

    startTransition(async () => {
      const result = await adjustCustomerCreditAction({
        customerId: customer.id,
        amountDelta,
        reason: `${mode === "PAYMENT" ? "Repayment: " : "Manual Charge: "} ${reason.trim()}`,
      });

      if (!result.success) {
        setError(result.error || "Failed to update credit");
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Adjust Credit Account</h2>
              <p className="text-xs text-slate-500">{customer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Current Balance Owed:</span>
            <span
              className={`text-base font-extrabold font-mono ${
                customer.outstandingCredit > 0 ? "text-amber-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(customer.outstandingCredit, currency)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("PAYMENT");
                setReason("Customer cash/transfer repayment towards outstanding account balance");
              }}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                mode === "PAYMENT"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
              <span>Receive Repayment</span>
              <span className="text-[10px] font-normal text-slate-500">Decreases balance owed</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("CHARGE");
                setReason("Manual account debit / store credit extension");
              }}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                mode === "CHARGE"
                  ? "bg-amber-50 border-amber-500 text-amber-800 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
              <span>Add Debt / Charge</span>
              <span className="text-[10px] font-normal text-slate-500">Increases balance owed</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Amount ({currency}) *</label>
            <input
              type="number"
              step="0.01"
              required
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Audit Reason / Memo *</label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cash received at checkout counter, reference #..."
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-500 resize-none text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={`flex items-center gap-1.5 ${
                mode === "PAYMENT"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              <Save className="h-4 w-4" />
              {isPending
                ? "Processing..."
                : mode === "PAYMENT"
                ? "Record Repayment"
                : "Post Debit Charge"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

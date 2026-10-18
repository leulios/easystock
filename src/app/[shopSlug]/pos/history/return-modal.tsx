"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { returnSaleAction } from "@/app/actions/sales";
import { PaymentMethod } from "@prisma/client";
import { RotateCcw, X, AlertCircle } from "lucide-react";

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  currency: string;
  onSuccess?: () => void;
}

export function ReturnModal({ isOpen, onClose, sale, currency, onSuccess }: ReturnModalProps) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !sale) return null;

  const handleQtyChange = (variantId: string, qty: number, max: number) => {
    const clamped = Math.max(0, Math.min(qty, max));
    setReturnQuantities((prev) => ({ ...prev, [variantId]: clamped }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([variantId, quantity]) => ({
        variantId,
        quantity,
        restock,
      }));

    if (itemsToReturn.length === 0) {
      setErrorMessage("Please select at least one item and quantity to return.");
      return;
    }

    startTransition(async () => {
      const result = await returnSaleAction({
        saleId: sale.id,
        items: itemsToReturn,
        reason,
        refundMethod: PaymentMethod.CASH,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to process return");
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
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Process Sale Return</h2>
              <p className="text-xs text-slate-500">Receipt: {sale.receiptNumber}</p>
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
              Select Return Quantities
            </label>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {sale.items?.map((item: any) => {
                const selectedQty = returnQuantities[item.variantId] || 0;
                return (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.variant?.product?.name || "Product"}
                      </div>
                      <div className="text-slate-500">
                        Purchased: {item.quantity} @ {formatCurrency(item.unitPrice, currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Return Qty:</span>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        value={selectedQty}
                        onChange={(e) =>
                          handleQtyChange(item.variantId, parseInt(e.target.value, 10) || 0, item.quantity)
                        }
                        className="w-16 h-8 px-2 border border-slate-300 rounded text-center font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="restock-check"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="restock-check" className="text-xs text-slate-700 font-medium">
              Restock returned items back into active shop inventory (creates StockMovement entry)
            </label>
          </div>

          <Input
            label="Mandatory Reason for Return"
            placeholder="e.g. Defective unit, customer changed mind, wrong item"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isPending}>
              Confirm Return & Refund
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

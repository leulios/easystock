"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/decimal";
import { getCustomerDetailAction } from "@/app/actions/customers";
import { X, Receipt, ShoppingBag, Calendar, ArrowRight } from "lucide-react";

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  currency: string;
}

export function CustomerHistoryModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  currency,
}: CustomerHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    if (isOpen && customerId) {
      setLoading(true);
      getCustomerDetailAction(customerId).then((res) => {
        if (res.success) {
          setCustomer(res.customer);
        }
        setLoading(false);
      });
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Purchase History</h2>
              <p className="text-xs text-slate-500">{customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading purchase ledger...</div>
          ) : !customer || !customer.sales || customer.sales.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Receipt className="h-10 w-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">No purchase records found</p>
              <p className="text-xs text-slate-400">
                Sales associated with this customer will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.sales.map((sale: any) => (
                <div
                  key={sale.id}
                  className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                        {sale.receiptNumber}
                      </span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          sale.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sale.status}
                      </span>
                      <span className="font-extrabold font-mono text-sm text-slate-900">
                        {formatCurrency(sale.totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-600 space-y-1 bg-white p-3 rounded-lg border border-slate-100">
                    {sale.items.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span>
                          {item.quantity}x {item.variant.product.name} ({item.variant.name})
                        </span>
                        <span className="font-mono text-slate-500">
                          {formatCurrency(Number(item.totalPrice), currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payments summary */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-medium">Payment:</span>
                    {sale.payments.map((p: any) => (
                      <span
                        key={p.id}
                        className="bg-slate-200/60 px-1.5 py-0.5 rounded font-mono text-slate-700"
                      >
                        {p.paymentMethod}: {formatCurrency(Number(p.amount), currency)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

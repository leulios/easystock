"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/decimal";
import { quickSellItemAction } from "@/app/actions/sales";
import { useLanguage } from "@/lib/i18n/context";
import { PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Zap,
  X,
  Search,
  Barcode,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Banknote,
  Smartphone,
  CreditCard,
  Users,
  Package,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface POSProduct {
  id: string;
  variantId: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  categoryId: string | null;
  sellingPrice: number;
  currentStock: number;
}

interface QuickManualSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: POSProduct[];
  customers: Array<{
    id: string;
    name: string;
    phone: string | null;
    outstandingCredit: number;
  }>;
  currency: string;
}

export function QuickManualSellModal({
  isOpen,
  onClose,
  products,
  customers,
  currency,
}: QuickManualSellModalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    name: string;
    quantity: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setSelectedProduct(null);
      setQuantity(1);
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProducts = query.trim()
    ? products.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
        );
      })
    : [];

  const handleSelectProduct = (product: POSProduct) => {
    setSelectedProduct(product);
    setQuery("");
    setQuantity(1);
    setErrorMessage(null);
  };

  const handleQuickSell = () => {
    if (!selectedProduct) return;
    setErrorMessage(null);

    if (paymentMethod === PaymentMethod.STORE_CREDIT && !selectedCustomerId) {
      setErrorMessage(
        language === "am"
          ? "እባክዎ ለዱቤ ሽያጭ ደንበኛ ይምረጡ"
          : "Please select a customer for credit sales"
      );
      return;
    }

    startTransition(async () => {
      const result = await quickSellItemAction({
        variantId: selectedProduct.variantId,
        quantity,
        paymentMethod,
        customerId: selectedCustomerId || null,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to complete sale");
      } else {
        setSuccessInfo({
          name: selectedProduct.name,
          quantity,
          total: selectedProduct.sellingPrice * quantity,
        });
        setSelectedProduct(null);
        setQuantity(1);
        router.refresh();
      }
    });
  };

  const totalAmount = selectedProduct ? selectedProduct.sellingPrice * quantity : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {t("quickManualSell")}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {t("quickManualSellDesc")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Success Banner */}
          {successInfo && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-emerald-900 text-sm">
                  {t("saleCompleted")}
                </div>
                <div className="text-emerald-700 mt-0.5">
                  {successInfo.quantity}x <span className="font-semibold">{successInfo.name}</span> —{" "}
                  <span className="font-extrabold">{formatCurrency(successInfo.total, currency)}</span>
                </div>
                <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                  {t("soldDeductedSuccess")}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Search by Barcode or Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {t("typeBarcodeOrName")}
            </label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  language === "am"
                    ? "የዕቃ ስም፣ ባርኮድ ወይም SKU ይጻፉ..."
                    : "Type item name, barcode, or SKU..."
                }
                className="w-full h-10 pl-9 pr-10 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-500 font-medium"
              />
              <Barcode className="h-4 w-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {/* Filtered suggestions dropdown */}
            {filteredProducts.length > 0 && !selectedProduct && (
              <div className="border border-slate-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <button
                    key={p.variantId}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full p-2.5 text-left hover:bg-amber-50/60 flex items-center justify-between transition-colors text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {p.sku} {p.barcode ? `• Barcode: ${p.barcode}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">
                        {formatCurrency(p.sellingPrice, currency)}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          p.currentStock <= 0 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {p.currentStock} {t("inStock")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Product Review & Sell Card */}
          {selectedProduct && (
            <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    {t("scannedItem")}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {selectedProduct.name}
                  </h4>
                  <div className="text-[11px] font-mono text-slate-500">
                    SKU: {selectedProduct.sku} {selectedProduct.barcode ? `• Barcode: ${selectedProduct.barcode}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  {t("cancel")}
                </button>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                <span className="text-xs font-bold text-slate-700">{t("quantity")}:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-8 w-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-sm"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 h-8 text-center font-bold text-sm bg-white border border-slate-300 rounded-lg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-8 w-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {t("paymentMethod")}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                    className={`py-1.5 px-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      paymentMethod === PaymentMethod.CASH
                        ? "border-amber-600 bg-amber-500 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote className="h-3.5 w-3.5" /> Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.MOBILE_MONEY)}
                    className={`py-1.5 px-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      paymentMethod === PaymentMethod.MOBILE_MONEY
                        ? "border-amber-600 bg-amber-500 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Telebirr
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.CREDIT_CARD)}
                    className={`py-1.5 px-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      paymentMethod === PaymentMethod.CREDIT_CARD
                        ? "border-amber-600 bg-amber-500 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> CBE Birr
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(PaymentMethod.STORE_CREDIT)}
                    className={`py-1.5 px-1 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                      paymentMethod === PaymentMethod.STORE_CREDIT
                        ? "border-purple-600 bg-purple-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" /> Credit
                  </button>
                </div>
              </div>

              {/* Customer Selector for Credit */}
              {paymentMethod === PaymentMethod.STORE_CREDIT && (
                <div className="space-y-1 pt-1 animate-in fade-in">
                  <label className="block text-[11px] font-bold text-slate-600">
                    {t("selectCustomer")}
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full h-8 px-2 text-xs bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                  >
                    <option value="">-- {t("selectCustomer")} --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Total & Action Button */}
              <div className="pt-2 border-t border-amber-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">{t("totalToPay")}</div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {formatCurrency(totalAmount, currency)}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleQuickSell}
                  isLoading={isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs px-4 h-10 shadow-md"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  {t("quickSellAndDeductBtn")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

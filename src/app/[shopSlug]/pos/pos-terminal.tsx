"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { formatCurrency, calculateLineTotal, calculateTax } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { checkoutSaleAction } from "@/app/actions/sales";
import { ReceiptModal } from "./receipt-modal";
import { PaymentMethod } from "@prisma/client";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Barcode,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Package,
  Users,
  Camera,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CameraScannerModal } from "@/components/pos/camera-scanner-modal";
import { PhoneScannerModal } from "@/components/pos/phone-scanner-modal";
import { QuickManualSellModal } from "@/components/pos/quick-manual-sell-modal";
import { useLanguage } from "@/lib/i18n/context";

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

interface CartItem {
  variantId: string;
  productId: string;
  name: string;
  sku: string;
  sellingPrice: number;
  currentStock: number;
  quantity: number;
  discount: number;
}

interface POSTerminalProps {
  products: POSProduct[];
  categories: Array<{ id: string; name: string }>;
  customers?: Array<{
    id: string;
    name: string;
    phone: string | null;
    outstandingCredit: number;
  }>;
  shopSlug?: string;
  shop: {
    id: string;
    name: string;
    currency: string;
    taxRate: number;
  };
}

export function POSTerminal({ products, categories, customers = [], shopSlug, shop }: POSTerminalProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isQuickManualSellOpen, setIsQuickManualSellOpen] = useState(false);

  // Generate a fresh idempotency key when cart transitions from empty to having items
  useEffect(() => {
    if (cart.length > 0 && !idempotencyKey) {
      setIdempotencyKey(crypto.randomUUID());
    } else if (cart.length === 0) {
      setIdempotencyKey("");
    }
  }, [cart.length, idempotencyKey]);

  // Focus search bar on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const addToCart = (product: POSProduct) => {
    setErrorMessage(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === product.variantId);
      if (existing) {
        return prev.map((item) =>
          item.variantId === product.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          variantId: product.variantId,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          sellingPrice: product.sellingPrice,
          currentStock: product.currentStock,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variantId === variantId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  // Instant barcode scanner listener: if search exactly matches barcode or SKU, add immediately and clear search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    const clean = val.trim();
    if (!clean) return;

    const exactMatch = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === clean.toLowerCase()) ||
        p.sku.toLowerCase() === clean.toLowerCase()
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearch("");
    }
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const taxableAmount = Math.max(0, subtotal - totalDiscount);
  const taxAmount = Number(calculateTax(taxableAmount, shop.taxRate));
  const grandTotal = taxableAmount + taxAmount;

  const numericTendered = parseFloat(tenderedAmount) || grandTotal;
  const changeDue = Math.max(0, numericTendered - grandTotal);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setErrorMessage(null);

    if (paymentMethod === PaymentMethod.STORE_CREDIT && !selectedCustomerId) {
      setErrorMessage("Please select a customer account to purchase with Store Credit.");
      return;
    }

    const key = idempotencyKey || crypto.randomUUID();

    const checkoutData = {
      idempotencyKey: key,
      customerId: selectedCustomerId || null,
      items: cart.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        discount: item.discount,
      })),
      payments: [
        {
          paymentMethod,
          amount: grandTotal,
          tenderedAmount: numericTendered,
          changeGiven: changeDue,
        },
      ],
    };

    startTransition(async () => {
      const result = await checkoutSaleAction(checkoutData);
      if (!result.success) {
        setErrorMessage(result.error || "Checkout failed");
      } else {
        setCompletedSale(result.sale);
        setCart([]);
        setIdempotencyKey("");
        setTenderedAmount("");
        setSelectedCustomerId("");
        router.refresh();
      }
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6.5rem)]">
      {/* Left Pane: Product Catalog Grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("searchItemPlaceholder")}
                className="w-full h-10 pl-9 pr-10 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              />
              <Barcode className="h-5 w-5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>

            {/* Quick 1-Item Sell Modal Trigger */}
            <Button
              type="button"
              onClick={() => setIsQuickManualSellOpen(true)}
              className="h-10 px-3 bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shrink-0 text-xs font-bold shadow-sm"
              title={t("quickManualSell")}
            >
              <Zap className="h-4 w-4" />
              <span>{language === "am" ? "ፈጣን መሸጫ" : "Quick Sell"}</span>
            </Button>

            {/* Phone Scanner Modal Trigger */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPhoneModalOpen(true)}
              className="h-10 px-3 bg-blue-50/80 hover:bg-blue-100 border-blue-200 text-blue-700 flex items-center gap-1.5 shrink-0 text-xs font-bold shadow-sm"
              title={t("openPhoneScanner")}
            >
              <Smartphone className="h-4 w-4 text-blue-600" />
              <span>{language === "am" ? "የስልክ መቃኛ" : "Phone Scanner"}</span>
            </Button>

            {/* Local Webcam/Device Camera */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCameraOpen(true)}
              className="h-10 px-3 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 flex items-center gap-1.5 shrink-0 text-xs font-semibold shadow-sm"
              title="Scan with device camera"
            >
              <Camera className="h-4 w-4 text-slate-600" />
              <span className="hidden md:inline">{language === "am" ? "ካሜራ" : "Camera"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
                selectedCategory === ""
                  ? "bg-blue-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("all")} ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
                  selectedCategory === c.id
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-slate-600">
                {language === "am" ? "ምንም የተገኘ ዕቃ የለም" : "No matching products"}
              </p>
              <p className="text-xs">
                {language === "am"
                  ? "የፍለጋ ቃሉን ያጽዱ ወይም አዲስ ዕቃ በክምችት ገጽ ይመዝግቡ።"
                  : "Try clearing your search or add new products to the catalog."}
              </p>
            </div>
          ) : (
            filteredProducts.map((p) => (
              <button
                key={p.variantId}
                onClick={() => addToCart(p)}
                className="p-3.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition-all flex flex-col justify-between group active:scale-[0.98]"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-blue-700 text-sm line-clamp-2">
                    {p.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.sku}</div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(p.sellingPrice, shop.currency)}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                      p.currentStock <= 0
                        ? "bg-rose-100 text-rose-800"
                        : p.currentStock <= 5
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200/70 text-slate-700"
                    }`}
                  >
                    {p.currentStock <= 0 ? t("outOfStock") : `${p.currentStock} ${t("inStock")}`}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Active Cart & Tender Section */}
      <div className="w-full lg:w-96 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-sm">
              {t("cart")} ({cart.length})
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              {t("clearCart")}
            </button>
          )}
        </div>

        {/* Customer Account Selector */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Users className="h-3 w-3 text-slate-400" /> {t("selectCustomer")}
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          >
            <option value="">{t("walkInCustomer")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ""}{" "}
                {c.outstandingCredit > 0
                  ? `• [${t("customerCreditBalance")}: ${formatCurrency(c.outstandingCredit, shop.currency)}]`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cart Item Rows */}
        <div className="flex-1 p-3 overflow-y-auto divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <ShoppingCart className="h-10 w-10 text-slate-200 mb-2" />
              <p className="font-medium text-slate-600 text-sm">
                {language === "am" ? "የተመረጠ ዕቃ የለም" : "Cart is empty"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{t("emptyCart")}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-xs truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {formatCurrency(item.sellingPrice, shop.currency)} each
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.variantId, -1)}
                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.variantId, 1)}
                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <div className="text-right shrink-0 min-w-16">
                  <div className="font-bold text-slate-900 text-xs">
                    {formatCurrency(item.quantity * item.sellingPrice, shop.currency)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.variantId)}
                    className="text-[10px] text-slate-400 hover:text-red-600"
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Tender Box */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>{t("subtotal")}:</span>
              <span>{formatCurrency(subtotal, shop.currency)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span>
                  {t("tax")} ({shop.taxRate}%):
                </span>
                <span>{formatCurrency(taxAmount, shop.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>{t("totalToPay")}:</span>
              <span>{formatCurrency(grandTotal, shop.currency)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {t("paymentMethod")}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                className={`py-1.5 px-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  paymentMethod === PaymentMethod.CASH
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Banknote className="h-3.5 w-3.5" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.CREDIT_CARD)}
                className={`py-1.5 px-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  paymentMethod === PaymentMethod.CREDIT_CARD
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" /> Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.MOBILE_MONEY)}
                className={`py-1.5 px-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  paymentMethod === PaymentMethod.MOBILE_MONEY
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" /> Telebirr
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod(PaymentMethod.STORE_CREDIT)}
                className={`py-1.5 px-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  paymentMethod === PaymentMethod.STORE_CREDIT
                    ? "border-purple-600 bg-purple-50 text-purple-700 font-bold"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users className="h-3.5 w-3.5" /> Credit
              </button>
            </div>
          </div>

          {paymentMethod === PaymentMethod.CASH && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1">
                <input
                  type="number"
                  step="0.01"
                  placeholder={`${t("amountReceived")} (default: ${grandTotal.toFixed(2)})`}
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              {changeDue > 0 && (
                <div className="text-right text-xs">
                  <span className="text-slate-400 text-[10px]">{t("changeDue")}: </span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(changeDue, shop.currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === PaymentMethod.STORE_CREDIT && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium border ${
                !selectedCustomerId
                  ? "bg-amber-50 border-amber-300 text-amber-800"
                  : "bg-purple-50 border-purple-200 text-purple-800"
              }`}
            >
              {!selectedCustomerId ? (
                <span>
                  {language === "am"
                    ? "⚠️ እባክዎ ለዱቤ ሽያጭ ከላይ የደንበኛ አካውንት ይምረጡ።"
                    : "⚠️ Please select a customer account above to charge to Store Credit."}
                </span>
              ) : (
                <span>
                  {language === "am"
                    ? "✓ ሂሳቡ በደንበኛው የዱቤ ዕዳ ላይ ይመዘገባል።"
                    : "✓ Amount will be added to customer's outstanding store balance."}
                </span>
              )}
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            isLoading={isPending}
            className="w-full h-11 text-sm font-bold shadow-md"
          >
            {t("completeSaleBtn")} ({formatCurrency(grandTotal, shop.currency)})
          </Button>
        </div>
      </div>

      <ReceiptModal
        isOpen={Boolean(completedSale)}
        onClose={() => setCompletedSale(null)}
        sale={completedSale}
        shopName={shop.name}
        currency={shop.currency}
      />

      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={(code) => handleSearchChange(code)}
      />

      <PhoneScannerModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        shopSlug={shopSlug || shop.id}
      />

      <QuickManualSellModal
        isOpen={isQuickManualSellOpen}
        onClose={() => setIsQuickManualSellOpen(false)}
        products={products}
        customers={customers}
        currency={shop.currency}
      />
    </div>
  );
}

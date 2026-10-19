"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { quickSellItemAction } from "@/app/actions/sales";
import { useLanguage } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PaymentMethod } from "@prisma/client";
import {
  Camera,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";

interface ProductItem {
  id: string;
  variantId: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  sellingPrice: number;
  currentStock: number;
  unit: string;
}

interface MobileScannerClientProps {
  products: ProductItem[];
  customers: Array<{ id: string; name: string; phone: string | null; outstandingCredit: number }>;
  shop: { id: string; name: string; currency: string };
  shopSlug: string;
}

export function MobileScannerClient({ products, customers, shop, shopSlug }: MobileScannerClientProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");

  // Camera scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Selected item state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Search filter for manual mode
  const [manualQuery, setManualQuery] = useState<string>("");

  // Action states
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio chime feedback
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Start Camera Stream
  useEffect(() => {
    if (activeTab !== "camera") {
      stopCamera();
      return;
    }

    let stream: MediaStream | null = null;
    let detectorInterval: any = null;

    async function initCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsScanning(true);
        }

        // Try BarcodeDetector if available
        if ("BarcodeDetector" in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
          });

          detectorInterval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const scannedCode = barcodes[0].rawValue;
                  handleCodeDetected(scannedCode);
                }
              } catch {
                // Ignore detection frame errors
              }
            }
          }, 350);
        }
      } catch (err: any) {
        setHasCamera(false);
        setCameraError(t("cameraError"));
        setActiveTab("manual");
      }
    }

    initCamera();

    return () => {
      if (detectorInterval) clearInterval(detectorInterval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeTab]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleCodeDetected = (code: string) => {
    playBeep();
    const cleanCode = code.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
        p.sku.toLowerCase() === cleanCode
    );

    if (matched) {
      setSelectedProduct(matched);
      setQuantity(1);
      setSuccessMessage(null);
      setErrorMessage(null);
    } else {
      setErrorMessage(
        language === "am"
          ? `ባርኮድ ቁጥር "${code}" የተመዘገበ ዕቃ አልተገኘም`
          : `No product found matching barcode "${code}"`
      );
    }
  };

  // Filtered products for manual search
  const filteredProducts = products.filter((p) => {
    if (!manualQuery.trim()) return false;
    const q = manualQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  // Handle Quick Sell & Deduct
  const handleQuickSell = () => {
    if (!selectedProduct) return;
    setErrorMessage(null);
    setSuccessMessage(null);

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
        playBeep();
        setSuccessMessage(
          language === "am"
            ? `${selectedProduct.name} ተሽጧል! ${formatCurrency(result.totalAmount || 0, shop.currency)} ተቀብለዋል፤ ከክምችት ተቀንሷል።`
            : `${selectedProduct.name} sold! Received ${formatCurrency(result.totalAmount || 0, shop.currency)}; Stock deducted.`
        );

        // Update local item stock
        selectedProduct.currentStock = Math.max(0, selectedProduct.currentStock - quantity);
        setSelectedProduct(null);
        setQuantity(1);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href={`/${shopSlug}/pos`}
            className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white"
            title="Return to Sales Terminal"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>{t("phoneScannerTitle")}</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px]">{shop.name}</p>
          </div>
        </div>

        <LanguageSwitcher />
      </header>

      {/* Mode Tabs */}
      <div className="bg-slate-950/80 p-2 border-b border-slate-800 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "camera"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>{t("cameraScanTab")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "manual"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Barcode className="h-4 w-4" />
          <span>{t("manualLookupTab")}</span>
        </button>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="m-3 p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="m-3 p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-200 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 p-3 flex flex-col space-y-4">
        {/* CAMERA VIEW */}
        {activeTab === "camera" && (
          <div className="relative w-full aspect-4/3 sm:aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-48 h-32 border-2 border-dashed border-emerald-400/80 rounded-xl relative shadow-lg">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                <div className="w-full h-0.5 bg-emerald-400/70 absolute top-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            </div>

            <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-slate-300 font-medium border border-white/10">
                {t("phoneScannerInstruction")}
              </span>
            </div>
          </div>
        )}

        {/* MANUAL CODE OR NAME VIEW */}
        {activeTab === "manual" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={t("typeBarcodeOrName")}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {manualQuery.trim() && (
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/40 rounded-xl">
                    {language === "am" ? "የተገኘ ዕቃ የለም" : "No matching items found"}
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setQuantity(1);
                        setManualQuery("");
                      }}
                      className="w-full p-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl flex items-center justify-between text-left transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.barcode || p.sku} • {p.currentStock} {t("inStock")}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-emerald-400">
                        {formatCurrency(p.sellingPrice, shop.currency)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* SCANNED / SELECTED ITEM CARD */}
        {selectedProduct ? (
          <div className="bg-slate-950 border-2 border-emerald-500/80 rounded-2xl p-4 space-y-4 shadow-xl animate-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {t("scannedItem")}
                </span>
                <h2 className="text-base font-bold text-white mt-1">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedProduct.barcode ? `Barcode: ${selectedProduct.barcode}` : `SKU: ${selectedProduct.sku}`}
                </p>
              </div>

              <div className="text-right">
                <div className="text-lg font-extrabold text-emerald-400">
                  {formatCurrency(selectedProduct.sellingPrice, shop.currency)}
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    selectedProduct.currentStock > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {selectedProduct.currentStock} {t("inStock")}
                </span>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs font-medium text-slate-300">{t("quantity")}:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 active:bg-slate-700"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-base font-bold text-white min-w-6 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 active:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400">{t("paymentMethod")}:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                  className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                    paymentMethod === PaymentMethod.CASH
                      ? "bg-emerald-600 border-emerald-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  💵 {t("payCash")}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.MOBILE_MONEY)}
                  className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                    paymentMethod === PaymentMethod.MOBILE_MONEY
                      ? "bg-blue-600 border-blue-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  📱 {t("payTelebirr")}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.BANK_TRANSFER)}
                  className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                    paymentMethod === PaymentMethod.BANK_TRANSFER
                      ? "bg-purple-600 border-purple-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🏦 {t("payCbeBirr")}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod(PaymentMethod.STORE_CREDIT)}
                  className={`py-2 px-3 rounded-lg border font-semibold text-center transition-all ${
                    paymentMethod === PaymentMethod.STORE_CREDIT
                      ? "bg-amber-600 border-amber-500 text-white shadow-xs"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  📒 {t("payCredit")}
                </button>
              </div>
            </div>

            {/* Optional Customer Selection if credit */}
            {paymentMethod === PaymentMethod.STORE_CREDIT && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-amber-400">
                  {language === "am" ? "የባለዕዳ ደንበኛ ምረጥ" : "Select Credit Customer"}:
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                  required
                >
                  <option value="">-- {t("selectCustomer")} --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""} - Credit: {formatCurrency(c.outstandingCredit, shop.currency)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Total and Sell Button */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                <span>{t("totalToPay")}:</span>
                <span className="text-base font-extrabold text-white">
                  {formatCurrency(selectedProduct.sellingPrice * quantity, shop.currency)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleQuickSell}
                disabled={isPending}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>
                  {isPending ? t("loading") : `${t("quickSellAndDeductBtn")} (${formatCurrency(selectedProduct.sellingPrice * quantity, shop.currency)})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
              <Barcode className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-white">
              {language === "am" ? "ዕቃ ለመሸጥ ያዘጋጁ" : "Ready to Sell"}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {language === "am"
                ? "የዕቃውን ባርኮድ በካሜራው ይቃኙ ወይም 'በስም ወይም በኮድ' የሚለውን ነክተው የዕቃውን ስም ይፈልጉ።"
                : "Point your phone camera at an item's barcode, or tap 'Manual Code / Name' to type and sell."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

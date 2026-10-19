"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { quickSellItemAction } from "@/app/actions/sales";
import { adjustStockAction } from "@/app/actions/inventory";
import { logoutAction } from "@/app/actions/auth";
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
  Plus,
  Minus,
  Zap,
  Package,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  LogOut,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface ProductItem {
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
  const router = useRouter();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");

  // Camera scanner state
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [isCameraRunning, setIsCameraRunning] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  // Duplicate scan throttling
  const lastScanCodeRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // Selected item state
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  // Scanned item action mode: "sell" | "adjust" | "info"
  const [actionMode, setActionMode] = useState<"sell" | "adjust" | "info">("sell");

  // Quick Sell state
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Stock Adjustment state
  const [adjustType, setAdjustType] = useState<"ADD" | "DEDUCT">("ADD");
  const [stockAdjustQty, setStockAdjustQty] = useState<number>(1);
  const [stockAdjustReason, setStockAdjustReason] = useState<string>("Restock / New Shipment");

  // Search filter for manual mode
  const [manualQuery, setManualQuery] = useState<string>("");

  // Server action transitions
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
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.14);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } catch {
      // Audio not permitted
    }
  };

  // Start Camera Stream with Html5Qrcode
  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsTorchOn(false);

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("html5-scanner-box", {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
      }

      const qrCode = html5QrCodeRef.current;
      if (qrCode.isScanning) {
        return;
      }

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.75);
            return {
              width: Math.max(220, Math.min(qrboxSize, 320)),
              height: Math.max(160, Math.min(Math.floor(qrboxSize * 0.65), 240)),
            };
          },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // ignore drop frames
        }
      );

      setIsCameraRunning(true);
      setHasCamera(true);

      // Check torch capability
      try {
        const capabilities = qrCode.getRunningTrackCapabilities();
        if (capabilities && (capabilities as any).torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      setHasCamera(false);
      setIsCameraRunning(false);
      setCameraError(
        language === "am"
          ? "የካሜራ ፈቃድ አልተገኘም። እባክዎ በስልክዎ ብሮውዘር የካሜራ ፈቃድ ይስጡ ወይም በስም/በኮድ ይፈልጉ።"
          : "Camera access unavailable. Make sure permissions are granted or use manual lookup."
      );
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch {
      // ignore stop errors
    } finally {
      setIsCameraRunning(false);
      setIsTorchOn(false);
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isCameraRunning) return;
    try {
      const nextTorch = !isTorchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }] as any,
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn("Torch failed to toggle", e);
    }
  };

  // Switch tabs & manage camera lifecycle
  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Code detected handler with duplicate throttling
  const handleCodeDetected = (code: string) => {
    const now = Date.now();
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Throttle same barcode if scanned within 2.5 seconds
    if (lastScanCodeRef.current === cleanCode && now - lastScanTimeRef.current < 2500) {
      return;
    }
    lastScanCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    playBeep();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([70, 30, 70]);
    }

    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode.toLowerCase()) ||
        p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matched) {
      setSelectedProduct(matched);
      setNotFoundCode(null);
      setQuantity(1);
      setStockAdjustQty(1);
      setStockAdjustReason("Restock / New Shipment");
      setSuccessMessage(null);
      setErrorMessage(null);
    } else {
      setSelectedProduct(null);
      setNotFoundCode(cleanCode);
      setErrorMessage(
        language === "am"
          ? `ባርኮድ "${cleanCode}" የተመዘገበ ዕቃ አልተገኘም`
          : `No product found matching barcode "${cleanCode}"`
      );
    }
  };

  // Immediate "Scan Next Item" action
  const handleScanNext = () => {
    setSelectedProduct(null);
    setNotFoundCode(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    lastScanCodeRef.current = "";
    lastScanTimeRef.current = 0;
    if (activeTab !== "camera") {
      setActiveTab("camera");
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

  // Handle Quick Sell & Deduct with explicit confirmation
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
        const newStock = Math.max(0, selectedProduct.currentStock - quantity);
        selectedProduct.currentStock = newStock;

        setSuccessMessage(
          language === "am"
            ? `${selectedProduct.name} ተሽጧል! ${formatCurrency(result.totalAmount || 0, shop.currency)} ተቀብለዋል፤ ቀሪ ክምችት: ${newStock}`
            : `${selectedProduct.name} sold! Received ${formatCurrency(result.totalAmount || 0, shop.currency)}; Remaining stock: ${newStock}`
        );
      }
    });
  };

  // Handle Explicit Stock Adjustment (+ / -)
  const handleStockAdjust = () => {
    if (!selectedProduct) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await adjustStockAction({
        variantId: selectedProduct.variantId,
        adjustmentType: adjustType === "ADD" ? "ADD_QUANTITY" : "DEDUCT_QUANTITY",
        quantity: stockAdjustQty,
        reason: stockAdjustReason,
        notes: `Adjusted via Quick Scanner (${adjustType === "ADD" ? "+" : "-"}${stockAdjustQty})`,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to adjust stock");
      } else {
        playBeep();
        const newStock =
          adjustType === "ADD"
            ? selectedProduct.currentStock + stockAdjustQty
            : Math.max(0, selectedProduct.currentStock - stockAdjustQty);
        selectedProduct.currentStock = newStock;

        setSuccessMessage(
          language === "am"
            ? `${selectedProduct.name} ክምችት ተስተካክሏል! አሁን ያለው ክምችት: ${newStock}`
            : `Stock adjusted for ${selectedProduct.name}! New stock: ${newStock}`
        );
      }
    });
  };

  const handleSignOut = async () => {
    if (confirm(language === "am" ? "እርግጠኛ ነዎት መውጣት ይፈልጋሉ?" : "Are you sure you want to sign out?")) {
      await logoutAction();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-12">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href={`/${shopSlug}/dashboard`}
            className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Return to Main Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>{language === "am" ? "ፈጣን መቃኛ" : "Quick Scanner"}</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[170px] mt-0.5">{shop.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Mode Tabs */}
      <div className="bg-slate-900/60 p-2 border-b border-slate-800/80 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("camera")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "camera"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>{t("cameraScanTab")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "manual"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
              : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Barcode className="h-4 w-4" />
          <span>{t("manualLookupTab")}</span>
        </button>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="m-3 p-3.5 bg-emerald-950/90 border border-emerald-500/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="m-3 p-3.5 bg-rose-950/90 border border-rose-500/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-200 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 p-3 flex flex-col space-y-4">
        {/* CAMERA VIEWPORT */}
        {activeTab === "camera" && (
          <div className="space-y-3">
            <div className="relative w-full aspect-4/3 sm:aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
              {/* html5-qrcode DOM Target */}
              <div id="html5-scanner-box" className="w-full h-full object-cover" />

              {/* Viewfinder Target Reticle Overlay */}
              {isCameraRunning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  <div className="w-56 h-36 border-2 border-dashed border-emerald-400/80 rounded-2xl relative shadow-lg">
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />
                    <div className="w-full h-0.5 bg-emerald-400/80 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-sm shadow-emerald-400" />
                  </div>
                </div>
              )}

              {/* Torch & Camera Toggle Floating Controls */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {hasTorch && isCameraRunning && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`h-9 w-9 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isTorchOn
                        ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300"
                        : "bg-black/60 backdrop-blur-md text-white border border-white/20"
                    }`}
                    title="Toggle Flashlight"
                  >
                    {isTorchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={isCameraRunning ? stopCamera : startCamera}
                  className="bg-black/70 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-full text-slate-200 border border-white/10 hover:bg-black/90 transition-colors"
                >
                  {isCameraRunning
                    ? language === "am" ? "ካሜራ አቁም" : "Pause Camera"
                    : language === "am" ? "ካሜራ ጀምር" : "Start Camera"}
                </button>
              </div>

              {/* Bottom Camera Instruction */}
              {isCameraRunning && (
                <div className="absolute bottom-2.5 left-0 right-0 text-center pointer-events-none">
                  <span className="bg-black/70 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] text-slate-300 font-medium border border-white/10">
                    {language === "am" ? "የዕቃውን ባርኮድ ወደ መስመሩ ያቅርቡ" : "Align barcode or QR code within the frame"}
                  </span>
                </div>
              )}

              {/* Paused state message */}
              {!isCameraRunning && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-sm text-white">
                    {language === "am" ? "ካሜራው ቆሟል" : "Camera is Paused"}
                  </h3>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                  >
                    {language === "am" ? "መቃኘት ጀምር" : "Start Scanning"}
                  </button>
                </div>
              )}
            </div>

            {/* Camera error instructions */}
            {cameraError && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs space-y-2 text-rose-200">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{language === "am" ? "የካሜራ ችግር" : "Camera Access Notice"}</span>
                </div>
                <p className="leading-relaxed">{cameraError}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg text-xs"
                  >
                    {language === "am" ? "እንደገና ሞክር" : "Retry Permission"}
                  </button>
                  <button
                    onClick={() => setActiveTab("manual")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs"
                  >
                    {language === "am" ? "በእጅ ፈልግ" : "Use Manual Search"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL LOOKUP TAB */}
        {activeTab === "manual" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={language === "am" ? "ባርኮድ፣ SKU ወይም የዕቃ ስም ይተይቡ..." : "Type barcode, SKU, or item name..."}
                className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                autoFocus
              />
            </div>

            {manualQuery.trim() && (
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                    {language === "am" ? "ምንም የተገኘ ዕቃ የለም" : "No matching items found"}
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setNotFoundCode(null);
                        setQuantity(1);
                        setStockAdjustQty(1);
                        setStockAdjustReason("Restock / New Shipment");
                        setManualQuery("");
                      }}
                      className="w-full p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between text-left transition-colors active:scale-[0.99]"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {p.barcode ? `Barcode: ${p.barcode}` : `SKU: ${p.sku}`} • {p.currentStock} {t("inStock")}
                        </div>
                      </div>
                      <div className="text-xs font-extrabold text-emerald-400">
                        {formatCurrency(p.sellingPrice, shop.currency)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* NOT FOUND ITEM CARD */}
        {notFoundCode && !selectedProduct && (
          <div className="p-4 bg-amber-950/60 border border-amber-600/70 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-200">
                  {language === "am" ? "ዕቃው በክምችት ውስጥ አልተገኘም" : "Unrecognized Barcode"}
                </h3>
                <p className="text-[11px] text-amber-300/80 font-mono mt-0.5">
                  Code: <span className="font-bold text-white">{notFoundCode}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-amber-800/40">
              <Link
                href={`/${shopSlug}/products?new=1&barcode=${encodeURIComponent(notFoundCode)}`}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{language === "am" ? "አዲስ ዕቃ መዝግብ" : "Register as New Product"}</span>
              </Link>

              <button
                type="button"
                onClick={handleScanNext}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{language === "am" ? "ቀጣይ ዕቃ ቃኝ" : "Scan Next"}</span>
              </button>
            </div>
          </div>
        )}

        {/* SCANNED / SELECTED PRODUCT CARD */}
        {selectedProduct && (
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-4 space-y-4 shadow-2xl animate-in slide-in-from-bottom-3">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {t("scannedItem")}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{selectedProduct.category}</span>
                </div>
                <h2 className="text-base font-bold text-white mt-1.5 leading-snug">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedProduct.barcode ? `Barcode: ${selectedProduct.barcode}` : `SKU: ${selectedProduct.sku}`}
                </p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg font-extrabold text-emerald-400">
                  {formatCurrency(selectedProduct.sellingPrice, shop.currency)}
                </div>
                <span
                  className={`inline-block mt-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedProduct.currentStock <= 0
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : selectedProduct.currentStock <= 5
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {selectedProduct.currentStock <= 0
                    ? t("outOfStock")
                    : `${selectedProduct.currentStock} ${selectedProduct.unit || "pcs"} ${t("inStock")}`}
                </span>
              </div>
            </div>

            {/* Action Mode Toggle Bar */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActionMode("sell")}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  actionMode === "sell"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{language === "am" ? "ሽያጭ" : "Quick Sell"}</span>
              </button>

              <button
                type="button"
                onClick={() => setActionMode("adjust")}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  actionMode === "adjust"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{language === "am" ? "ክምችት ማስተካከያ" : "Adjust Stock"}</span>
              </button>

              <button
                type="button"
                onClick={() => setActionMode("info")}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  actionMode === "info"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>{language === "am" ? "ዝርዝር" : "Item Info"}</span>
              </button>
            </div>

            {/* TAB 1: QUICK SELL */}
            {actionMode === "sell" && (
              <div className="space-y-3.5 pt-1">
                {/* Quantity Controls */}
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">{t("quantity")}:</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 active:bg-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-base font-extrabold text-white min-w-8 text-center">{quantity}</span>
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
                      className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                        paymentMethod === PaymentMethod.CASH
                          ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      💵 {t("payCash")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod(PaymentMethod.MOBILE_MONEY)}
                      className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                        paymentMethod === PaymentMethod.MOBILE_MONEY
                          ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-950"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      📱 {t("payTelebirr")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod(PaymentMethod.BANK_TRANSFER)}
                      className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                        paymentMethod === PaymentMethod.BANK_TRANSFER
                          ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-950"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      🏦 {t("payCbeBirr")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod(PaymentMethod.STORE_CREDIT)}
                      className={`py-2 px-3 rounded-xl border font-bold text-center transition-all ${
                        paymentMethod === PaymentMethod.STORE_CREDIT
                          ? "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-950"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
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
                    <span className="text-base font-extrabold text-white font-mono">
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
                      {isPending
                        ? t("loading")
                        : `${t("quickSellAndDeductBtn")} (${formatCurrency(selectedProduct.sellingPrice * quantity, shop.currency)})`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: EXPLICIT STOCK ADJUSTMENT (+ / -) */}
            {actionMode === "adjust" && (
              <div className="space-y-3.5 pt-1">
                {/* Adjust Type: Add (+) vs Deduct (-) */}
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADD")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      adjustType === "ADD"
                        ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-950"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Plus className="h-4 w-4 text-emerald-400" />
                    <span>{language === "am" ? "ክምችት ጨምር (+)" : "Add Stock (+)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType("DEDUCT")}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                      adjustType === "DEDUCT"
                        ? "bg-rose-700 border-rose-600 text-white shadow-md shadow-rose-950"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Minus className="h-4 w-4 text-rose-300" />
                    <span>{language === "am" ? "ክምችት ቀንስ (-)" : "Deduct Stock (-)"}</span>
                  </button>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300">
                    {language === "am" ? "የሚስተካከለው ብዛት" : "Adjustment Quantity"}:
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStockAdjustQty((q) => Math.max(1, q - 1))}
                      className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 active:bg-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-base font-extrabold text-white min-w-8 text-center font-mono">
                      {stockAdjustQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStockAdjustQty((q) => q + 1)}
                      className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200 active:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Mandatory Reason Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    {language === "am" ? "የማስተካከያ ምክንያት (ግዴታ)" : "Mandatory Reason"}:
                  </label>
                  <select
                    value={stockAdjustReason}
                    onChange={(e) => setStockAdjustReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
                  >
                    <option value="Restock / New Shipment">
                      {language === "am" ? "አዲስ ጭነት ተቀበልኩ (Restock)" : "Restock / New Shipment"}
                    </option>
                    <option value="Damaged / Broken / Expired">
                      {language === "am" ? "የተበላሸ / የተሰበረ ዕቃ (Damaged)" : "Damaged / Broken / Expired"}
                    </option>
                    <option value="Count Correction">
                      {language === "am" ? "የቁጥር ማስተካከያ (Count Correction)" : "Inventory Count Correction"}
                    </option>
                    <option value="Customer Return">
                      {language === "am" ? "ከደንበኛ የተመለሰ ዕቃ (Customer Return)" : "Customer Return"}
                    </option>
                    <option value="Internal Store Use">
                      {language === "am" ? "ለሱቅ አገልግሎት የዋለ (Internal Use)" : "Internal Store Use"}
                    </option>
                  </select>
                </div>

                {/* Explicit Stock Confirmation Button */}
                <button
                  type="button"
                  onClick={handleStockAdjust}
                  disabled={isPending}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    adjustType === "ADD"
                      ? "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-950"
                      : "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-950"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>
                    {isPending
                      ? t("loading")
                      : language === "am"
                      ? `ክምችት ማስተካከያውን አረጋግጥ (${adjustType === "ADD" ? "+" : "-"}${stockAdjustQty})`
                      : `Confirm Stock ${adjustType === "ADD" ? "Addition (+)" : "Deduction (-)"} (${stockAdjustQty})`}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 3: STOCK INFO */}
            {actionMode === "info" && (
              <div className="space-y-2.5 pt-1 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>{language === "am" ? "ምድብ" : "Category"}:</span>
                    <span className="font-semibold text-white">{selectedProduct.category}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{language === "am" ? "የመለኪያ አሃድ" : "Unit"}:</span>
                    <span className="font-semibold text-white">{selectedProduct.unit || "pcs"}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{language === "am" ? "ያለ ክምችት" : "Current Stock"}:</span>
                    <span className="font-extrabold text-emerald-400 font-mono">
                      {selectedProduct.currentStock} {selectedProduct.unit || "pcs"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{language === "am" ? "የመሸጫ ዋጋ" : "Selling Price"}:</span>
                    <span className="font-extrabold text-white font-mono">
                      {formatCurrency(selectedProduct.sellingPrice, shop.currency)}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/${shopSlug}/inventory`}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>{language === "am" ? "ሙሉ የክምችት ዝርዝር ክፈት" : "Open in Desktop Inventory"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Scan Next Item Primary Button */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleScanNext}
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
                <span>{language === "am" ? "ቀጣይ ዕቃ ለመቃኘት እዚህ ይጫኑ" : "Scan Next Item Immediately"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Ready to scan placeholder when no item is selected */}
        {!selectedProduct && !notFoundCode && (
          <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800/80 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto">
              <Barcode className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm text-white">
              {language === "am" ? "ዕቃ ለመቃኘት ተዘጋጅቷል" : "Ready to Scan"}
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {language === "am"
                ? "የስልክዎን ካሜራ በዕቃው ባርኮድ ላይ ያሳዩ፣ ወይም 'በእጅ ፈልግ' የሚለውን ነክተው በስም ይፈልጉ።"
                : "Point your phone camera at an item's barcode, or tap 'Manual Code / Name' to search and sell."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

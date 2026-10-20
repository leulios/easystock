"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { checkoutSaleAction } from "@/app/actions/sales";
import { batchStockInAction } from "@/app/actions/inventory";
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
  ShoppingCart,
  Trash2,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Layers,
  ArrowDownToLine,
  SlidersHorizontal,
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
  costPrice?: number;
  currentStock: number;
  unit: string;
}

export interface SaleCartItem {
  product: ProductItem;
  quantity: number;
}

export interface StockInStagedItem {
  product: ProductItem;
  quantity: number;
  costPrice: number;
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

  // Primary Operational Mode: "sell" | "stock_in"
  const [mode, setMode] = useState<"sell" | "stock_in">("sell");

  // Input view tab: "camera" | "manual"
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");

  // Multi-item Sale Cart state (Sales Mode)
  const [saleCart, setSaleCart] = useState<SaleCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Staged Receiving List state (Stock In Mode)
  const [receivingList, setReceivingList] = useState<StockInStagedItem[]>([]);
  const [receivingNotes, setReceivingNotes] = useState<string>("");
  const [completedStockIn, setCompletedStockIn] = useState<{
    batchId: string;
    itemsCount: number;
    totalUnits: number;
  } | null>(null);

  // Review Drawer / Modal open state
  const [isReviewDrawerOpen, setIsReviewDrawerOpen] = useState<boolean>(false);

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

  // Toast banner feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  // Search filter for manual mode
  const [manualQuery, setManualQuery] = useState<string>("");

  // Action transitions
  const [isPending, startTransition] = useTransition();

  // Show transient toast
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  };

  // Audio chime feedback
  const playBeep = (freq = 880) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
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
    } catch {
      setHasCamera(false);
      setIsCameraRunning(false);
      setCameraError(t("cameraError"));
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

  // Manage camera lifecycle
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

  // Hardware Scanner Integration (USB / Bluetooth Keyboard Wedge)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is intentionally typing inside an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 65) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          e.preventDefault();
          handleCodeDetected(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode, products, saleCart, receivingList]);

  // Code detected handler with mode-specific handling and duplicate throttling
  const handleCodeDetected = (code: string) => {
    const now = Date.now();
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Throttle same barcode if scanned within 1.5 seconds to prevent accidental runaway
    if (lastScanCodeRef.current === cleanCode && now - lastScanTimeRef.current < 1500) {
      return;
    }
    lastScanCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === cleanCode.toLowerCase()) ||
        p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (!matched) {
      playBeep(440);
      setNotFoundCode(cleanCode);
      showToast(`${t("unrecognizedBarcode")}: ${cleanCode}`, "error");
      return;
    }

    setNotFoundCode(null);

    if (mode === "sell") {
      // SALES MODE: Add or Increment in Sale Cart
      playBeep(880);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([60, 30, 60]);
      }

      setSaleCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.variantId === matched.variantId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          showToast(`+1 ${matched.name} (${updated[existingIndex].quantity} ${t("inStock")})`);
          return updated;
        } else {
          showToast(`+1 ${matched.name}`);
          return [...prev, { product: matched, quantity: 1 }];
        }
      });
    } else {
      // STOCK IN MODE: Add or Increment in Receiving Staging List
      playBeep(1046.5); // C6 tone
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100]);
      }

      setReceivingList((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.variantId === matched.variantId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          showToast(`+1 ${matched.name} (${t("stockInItemAdded")}: ${updated[existingIndex].quantity})`);
          return updated;
        } else {
          showToast(`${matched.name} ${t("stockInItemAdded")}`);
          return [
            ...prev,
            {
              product: matched,
              quantity: 1,
              costPrice: matched.costPrice || 0,
            },
          ];
        }
      });
    }
  };

  // Add product from manual search
  const handleAddManualProduct = (p: ProductItem) => {
    if (mode === "sell") {
      playBeep(880);
      setSaleCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.variantId === p.variantId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          showToast(`+1 ${p.name}`);
          return updated;
        }
        showToast(`+1 ${p.name}`);
        return [...prev, { product: p, quantity: 1 }];
      });
    } else {
      playBeep(1046.5);
      setReceivingList((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.variantId === p.variantId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          showToast(`+1 ${p.name}`);
          return updated;
        }
        showToast(`${p.name} ${t("stockInItemAdded")}`);
        return [...prev, { product: p, quantity: 1, costPrice: p.costPrice || 0 }];
      });
    }
    setManualQuery("");
  };

  // Cart quantity adjustments
  const updateSaleCartQty = (variantId: string, delta: number) => {
    setSaleCart((prev) =>
      prev
        .map((item) => {
          if (item.product.variantId === variantId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as SaleCartItem[]
    );
  };

  const removeSaleCartItem = (variantId: string) => {
    setSaleCart((prev) => prev.filter((item) => item.product.variantId !== variantId));
  };

  // Receiving list adjustments
  const updateReceivingQty = (variantId: string, nextQty: number) => {
    if (nextQty <= 0) {
      setReceivingList((prev) => prev.filter((it) => it.product.variantId !== variantId));
    } else {
      setReceivingList((prev) =>
        prev.map((it) => (it.product.variantId === variantId ? { ...it, quantity: nextQty } : it))
      );
    }
  };

  const removeReceivingItem = (variantId: string) => {
    setReceivingList((prev) => prev.filter((it) => it.product.variantId !== variantId));
  };

  // Calculations for Sales Cart
  const totalSaleItemsCount = saleCart.reduce((sum, item) => sum + item.quantity, 0);
  const saleSubtotal = saleCart.reduce((sum, item) => sum + item.quantity * item.product.sellingPrice, 0);
  const grandTotal = saleSubtotal;
  const numericTendered = parseFloat(tenderedAmount) || grandTotal;
  const changeDue = Math.max(0, numericTendered - grandTotal);

  // Calculations for Stock In Staging List
  const totalReceivingUnits = receivingList.reduce((sum, it) => sum + it.quantity, 0);

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

  // Handle Checkout (Sales Mode)
  const handleCheckout = () => {
    if (saleCart.length === 0) return;

    if (paymentMethod === PaymentMethod.STORE_CREDIT && !selectedCustomerId) {
      showToast(t("selectCustomer"), "error");
      return;
    }

    startTransition(async () => {
      const checkoutData = {
        idempotencyKey: crypto.randomUUID(),
        customerId: selectedCustomerId || null,
        items: saleCart.map((it) => ({
          variantId: it.product.variantId,
          quantity: it.quantity,
          unitPrice: it.product.sellingPrice,
          discount: 0,
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

      const result = await checkoutSaleAction(checkoutData);
      if (!result.success) {
        showToast(result.error || t("error"), "error");
      } else {
        playBeep(1200);
        // Update local stock balances
        for (const item of saleCart) {
          item.product.currentStock = Math.max(0, item.product.currentStock - item.quantity);
        }
        setCompletedSale(result.sale);
        setSaleCart([]);
        setTenderedAmount("");
        setSelectedCustomerId("");
        setIsReviewDrawerOpen(false);
        showToast(t("saleCompleted"), "success");
      }
    });
  };

  // Handle Confirm Stock In (Stock In Mode)
  const handleConfirmStockIn = () => {
    if (receivingList.length === 0) return;

    startTransition(async () => {
      const result = await batchStockInAction({
        items: receivingList.map((it) => ({
          variantId: it.product.variantId,
          quantity: it.quantity,
          costPrice: it.costPrice,
        })),
        notes: receivingNotes || undefined,
      });

      if (!result.success) {
        showToast(result.error || t("error"), "error");
      } else {
        playBeep(1200);
        // Update local stock balances
        for (const it of receivingList) {
          it.product.currentStock += it.quantity;
        }
        setCompletedStockIn(result.result);
        setReceivingList([]);
        setReceivingNotes("");
        setIsReviewDrawerOpen(false);
        showToast(t("stockInSuccess"), "success");
      }
    });
  };

  const handleSignOut = async () => {
    if (confirm(t("areYouSure"))) {
      await logoutAction();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-28">
      {/* Top Header */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <Link
            href={`/${shopSlug}/dashboard`}
            className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
            title="Return to Main Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-1.5 leading-none">
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>{t("scannerTitle")}</span>
            </h1>
            <p className="text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">{shop.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleSignOut}
            title={t("signOut")}
            className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* DUAL MODE SELECTOR: SELL vs STOCK IN */}
      <div className="bg-slate-900/80 p-2 border-b border-slate-800 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("sell");
            setIsReviewDrawerOpen(false);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            mode === "sell"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950 ring-2 ring-emerald-500/50"
              : "bg-slate-800/70 text-slate-400 hover:text-slate-200"
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>{t("scannerModeSell")}</span>
          {saleCart.length > 0 && (
            <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {totalSaleItemsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("stock_in");
            setIsReviewDrawerOpen(false);
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
            mode === "stock_in"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-950 ring-2 ring-blue-500/50"
              : "bg-slate-800/70 text-slate-400 hover:text-slate-200"
          }`}
        >
          <ArrowDownToLine className="h-4 w-4" />
          <span>{t("scannerModeStockIn")}</span>
          {receivingList.length > 0 && (
            <span className="bg-blue-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {totalReceivingUnits}
            </span>
          )}
        </button>
      </div>

      {/* Sub-Tabs: Camera Scan vs Manual Search */}
      <div className="bg-slate-900/40 px-3 py-1.5 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === "camera"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>{t("cameraScanTab")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === "manual"
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Barcode className="h-3.5 w-3.5" />
            <span>{t("manualLookupTab")}</span>
          </button>
        </div>

        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          USB/Bluetooth Scanner Ready
        </span>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`mx-3 my-2 p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in shadow-xl ${
            toastMessage.type === "success"
              ? "bg-emerald-950/95 border border-emerald-500 text-emerald-200"
              : toastMessage.type === "error"
              ? "bg-rose-950/95 border border-rose-500 text-rose-200"
              : "bg-blue-950/95 border border-blue-500 text-blue-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 p-3 flex flex-col space-y-3">
        {/* CAMERA VIEWPORT */}
        {activeTab === "camera" && (
          <div className="space-y-2">
            <div className="relative w-full aspect-4/3 sm:aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
              {/* html5-qrcode DOM Target */}
              <div id="html5-scanner-box" className="w-full h-full object-cover" />

              {/* Viewfinder Target Reticle Overlay */}
              {isCameraRunning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  <div
                    className={`w-56 h-36 border-2 border-dashed rounded-2xl relative shadow-lg ${
                      mode === "sell" ? "border-emerald-400/80" : "border-blue-400/80"
                    }`}
                  >
                    <div
                      className={`absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 rounded-tl ${
                        mode === "sell" ? "border-emerald-400" : "border-blue-400"
                      }`}
                    />
                    <div
                      className={`absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 rounded-tr ${
                        mode === "sell" ? "border-emerald-400" : "border-blue-400"
                      }`}
                    />
                    <div
                      className={`absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 rounded-bl ${
                        mode === "sell" ? "border-emerald-400" : "border-blue-400"
                      }`}
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 rounded-br ${
                        mode === "sell" ? "border-emerald-400" : "border-blue-400"
                      }`}
                    />
                    <div
                      className={`w-full h-0.5 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-sm ${
                        mode === "sell"
                          ? "bg-emerald-400/80 shadow-emerald-400"
                          : "bg-blue-400/80 shadow-blue-400"
                      }`}
                    />
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
                    title={t("toggleTorch")}
                  >
                    {isTorchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={isCameraRunning ? stopCamera : startCamera}
                  className="bg-black/70 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-full text-slate-200 border border-white/10 hover:bg-black/90 transition-colors"
                >
                  {isCameraRunning ? t("pauseCamera") : t("startScanning")}
                </button>
              </div>

              {/* Instruction banner */}
              {isCameraRunning && (
                <div className="absolute bottom-2.5 left-0 right-0 text-center pointer-events-none">
                  <span
                    className={`backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-semibold border ${
                      mode === "sell"
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                        : "bg-blue-950/80 text-blue-300 border-blue-500/40"
                    }`}
                  >
                    {mode === "sell" ? t("cameraInstructionSell") : t("cameraInstructionStockIn")}
                  </span>
                </div>
              )}

              {/* Paused state overlay */}
              {!isCameraRunning && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Camera className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-sm text-white">{t("cameraPaused")}</h3>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-transform active:scale-95"
                  >
                    {t("startScanning")}
                  </button>
                </div>
              )}
            </div>

            {/* Camera error fallback */}
            {cameraError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs space-y-2 text-rose-200">
                <p className="leading-relaxed">{cameraError}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={startCamera}
                    className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded-lg text-xs"
                  >
                    {t("cameraRetry")}
                  </button>
                  <button
                    onClick={() => setActiveTab("manual")}
                    className="px-3 py-1 bg-slate-800 text-slate-200 font-bold rounded-lg text-xs"
                  >
                    {t("manualLookupTab")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL SEARCH TAB */}
        {activeTab === "manual" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={t("typeBarcodeOrName")}
                className="w-full pl-9 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                autoFocus
              />
            </div>

            {manualQuery.trim() && (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                    {t("emptyCart")}
                  </div>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddManualProduct(p)}
                      className="w-full p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between text-left transition-colors active:scale-[0.99]"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {p.barcode ? `Barcode: ${p.barcode}` : `SKU: ${p.sku}`} • {p.currentStock}{" "}
                          {t("inStock")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-xs font-extrabold ${
                            mode === "sell" ? "text-emerald-400" : "text-blue-400"
                          }`}
                        >
                          {mode === "sell"
                            ? formatCurrency(p.sellingPrice, shop.currency)
                            : `${t("costPrice")}: ${formatCurrency(p.costPrice || 0, shop.currency)}`}
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800">
                          + {mode === "sell" ? t("addToCart") : t("addToReceivingList")}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* UNRECOGNIZED BARCODE BANNER */}
        {notFoundCode && (
          <div className="p-4 bg-amber-950/70 border border-amber-600 rounded-2xl space-y-2.5 animate-in slide-in-from-bottom-2 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-200">{t("unrecognizedBarcode")}</h3>
                <p className="text-[11px] text-amber-300 font-mono">
                  Barcode: <span className="font-bold text-white">{notFoundCode}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-amber-800/40">
              <Link
                href={`/${shopSlug}/products?new=1&barcode=${encodeURIComponent(notFoundCode)}`}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("registerNewProduct")}</span>
              </Link>

              <button
                type="button"
                onClick={() => setNotFoundCode(null)}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                {t("close")}
              </button>
            </div>
          </div>
        )}

        {/* READY TO SCAN HINT (When lists are empty) */}
        {((mode === "sell" && saleCart.length === 0) ||
          (mode === "stock_in" && receivingList.length === 0)) &&
          !notFoundCode && (
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-center space-y-2">
              <div
                className={`h-11 w-11 rounded-2xl flex items-center justify-center mx-auto border ${
                  mode === "sell"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}
              >
                <Barcode className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-xs text-white">{t("readyToScan")}</h3>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                {t("readyToScanDesc")}
              </p>
            </div>
          )}

        {/* QUICK LIST PREVIEW (SHOWS LAST SCANNED ITEMS) */}
        {mode === "sell" && saleCart.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-emerald-400" />
                <span>
                  {t("cart")} ({totalSaleItemsCount})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setSaleCart([])}
                className="text-[11px] text-rose-400 hover:underline"
              >
                {t("clearCart")}
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {saleCart.map((item) => (
                <div
                  key={item.product.variantId}
                  className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-white truncate">{item.product.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatCurrency(item.product.sellingPrice, shop.currency)} x {item.quantity} ={" "}
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(item.product.sellingPrice * item.quantity, shop.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateSaleCartQty(item.product.variantId, -1)}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono font-extrabold text-white min-w-6 text-center text-xs">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateSaleCartQty(item.product.variantId, 1)}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSaleCartItem(item.product.variantId)}
                      className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-400 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STOCK IN STAGING PREVIEW */}
        {mode === "stock_in" && receivingList.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-400" />
                <span>
                  {t("receivingList")} ({totalReceivingUnits} {t("unitPcs")})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setReceivingList([])}
                className="text-[11px] text-rose-400 hover:underline"
              >
                {t("clearCart")}
              </button>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {receivingList.map((item) => (
                <div
                  key={item.product.variantId}
                  className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-white truncate">{item.product.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {t("previousStock")}: {item.product.currentStock} &rarr;{" "}
                      <span className="font-bold text-blue-400">
                        {t("newStock")}: {item.product.currentStock + item.quantity}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateReceivingQty(item.product.variantId, item.quantity - 1)}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateReceivingQty(item.product.variantId, parseInt(e.target.value) || 1)
                      }
                      className="w-10 h-7 text-center font-mono font-extrabold text-xs bg-slate-800 text-white rounded-lg border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => updateReceivingQty(item.product.variantId, item.quantity + 1)}
                      className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeReceivingItem(item.product.variantId)}
                      className="h-7 w-7 rounded-lg text-slate-500 hover:text-rose-400 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM ACTION BAR (SELL or STOCK IN) */}
      {mode === "sell" && saleCart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-20">
          <button
            type="button"
            onClick={() => setIsReviewDrawerOpen(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-between transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="bg-emerald-800 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {totalSaleItemsCount} {t("itemsInCart")}
              </span>
              <span className="text-sm">{t("viewCartAndCheckout")}</span>
            </div>
            <span className="font-mono text-base font-extrabold">
              {formatCurrency(grandTotal, shop.currency)} &rarr;
            </span>
          </button>
        </div>
      )}

      {mode === "stock_in" && receivingList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-20">
          <button
            type="button"
            onClick={() => setIsReviewDrawerOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-xl flex items-center justify-between transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="bg-blue-800 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                {totalReceivingUnits} {t("unitPcs")}
              </span>
              <span className="text-sm">{t("confirmStockInBtn")}</span>
            </div>
            <span className="font-mono text-sm font-bold">
              {receivingList.length} {language === "am" ? "ዕቃዎች" : "products"} &rarr;
            </span>
          </button>
        </div>
      )}

      {/* CHECKOUT / CONFIRMATION MODAL DRAWER */}
      {isReviewDrawerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col justify-end">
          <div className="bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[90vh] overflow-y-auto p-4 space-y-4 animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {mode === "sell" ? (
                  <>
                    <ShoppingCart className="h-5 w-5 text-emerald-400" />
                    <span>{t("cart")} ({totalSaleItemsCount})</span>
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5 text-blue-400" />
                    <span>{t("receivingList")} ({totalReceivingUnits} {t("unitPcs")})</span>
                  </>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setIsReviewDrawerOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* SALES CHECKOUT CONTENT */}
            {mode === "sell" && (
              <div className="space-y-4">
                {/* Cart summary lines */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {saleCart.map((it) => (
                    <div
                      key={it.product.variantId}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/60 border border-slate-800"
                    >
                      <div>
                        <div className="font-bold text-white">{it.product.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(it.product.sellingPrice, shop.currency)} x {it.quantity}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrency(it.product.sellingPrice * it.quantity, shop.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Total */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>{t("subtotal")}:</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(saleSubtotal, shop.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-slate-800">
                    <span>{t("totalToPay")}:</span>
                    <span className="font-mono text-emerald-400">
                      {formatCurrency(grandTotal, shop.currency)}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {t("paymentMethod")}
                  </label>
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

                {/* Optional Customer Selector */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    {t("selectCustomer")}
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white"
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

                {/* Quick Cash Tender Shortcuts */}
                {paymentMethod === PaymentMethod.CASH && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{t("amountReceived")}:</span>
                      {changeDue > 0 && (
                        <span className="text-emerald-400 font-bold">
                          {t("changeDue")}: {formatCurrency(changeDue, shop.currency)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTenderedAmount(String(grandTotal))}
                        className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg"
                      >
                        {t("exactAmount")}
                      </button>
                      {[100, 200, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTenderedAmount(String(amt))}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-mono font-bold rounded-lg"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commit Sale Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isPending || saleCart.length === 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950 transition-all cursor-pointer"
                >
                  <Zap className="h-4 w-4" />
                  <span>
                    {isPending
                      ? t("loading")
                      : `${t("completeSaleBtn")} (${formatCurrency(grandTotal, shop.currency)})`}
                  </span>
                </button>
              </div>
            )}

            {/* STOCK IN RECEIVING CONTENT */}
            {mode === "stock_in" && (
              <div className="space-y-4">
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {receivingList.map((it) => (
                    <div
                      key={it.product.variantId}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-white">{it.product.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {t("previousStock")}: {it.product.currentStock} &rarr;{" "}
                          <span className="font-bold text-blue-400">
                            {t("newStock")}: {it.product.currentStock + it.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-extrabold text-white bg-blue-950 px-2 py-1 rounded-lg border border-blue-800">
                        +{it.quantity} {t("unitPcs")}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    {t("receivingNotes")}
                  </label>
                  <input
                    type="text"
                    value={receivingNotes}
                    onChange={(e) => setReceivingNotes(e.target.value)}
                    placeholder="e.g. Shipment from Addis Wholesale"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleConfirmStockIn}
                  disabled={isPending || receivingList.length === 0}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-950 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isPending
                      ? t("loading")
                      : `${t("confirmStockInBtn")} (+${totalReceivingUnits} ${t("unitPcs")})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLETED SALE RECEIPT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 animate-in zoom-in-95 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{t("saleCompleted")}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Receipt #{completedSale.receiptNumber}
              </p>
              <div className="text-xl font-black text-emerald-400 font-mono mt-2">
                {formatCurrency(Number(completedSale.totalAmount), shop.currency)}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{t("printReceipt")}</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>{t("newSale")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED STOCK IN SUMMARY MODAL */}
      {completedStockIn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 animate-in zoom-in-95 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{t("stockInSuccess")}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Batch #{completedStockIn.batchId.slice(0, 8)}
              </p>
              <div className="text-lg font-black text-blue-400 font-mono mt-2">
                +{completedStockIn.totalUnits} {t("unitPcs")} ({completedStockIn.itemsCount}{" "}
                {language === "am" ? "ዕቃዎች" : "items"})
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCompletedStockIn(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

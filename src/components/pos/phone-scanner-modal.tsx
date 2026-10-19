"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";
import { createScannerSessionTokenAction } from "@/app/actions/auth";
import {
  Smartphone,
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Zap,
  Sparkles,
} from "lucide-react";

interface PhoneScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopSlug: string;
}

export function PhoneScannerModal({ isOpen, onClose, shopSlug }: PhoneScannerModalProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      createScannerSessionTokenAction(shopSlug)
        .then((res) => {
          if (res.success && res.token) {
            setToken(res.token);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, shopSlug]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scannerUrl = token
    ? `${origin}/${shopSlug}/scan?token=${token}`
    : `${origin}/${shopSlug}/scan`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(scannerUrl)}`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(scannerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {t("phoneCameraScannerBtn")}
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {t("instantAccessNoLogin")}
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
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs font-medium">
            {t("scanQrInstantInstruction")}
          </p>

          {/* QR Code Container */}
          <div className="p-3 bg-white border-2 border-dashed border-blue-300 rounded-2xl shadow-inner flex flex-col items-center">
            {isLoading ? (
              <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400 text-xs font-semibold">
                {t("loading")}
              </div>
            ) : (
              <img
                src={qrCodeUrl}
                alt="Scan QR code with phone"
                width={180}
                height={180}
                className="rounded-lg shadow-sm"
              />
            )}
            <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold text-blue-600">
              <QrCode className="h-4 w-4" />
              <span>{t("scanQrWithPhone")}</span>
            </div>
          </div>

          {/* Link box with Copy button */}
          <div className="w-full">
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="text"
                readOnly
                value={scannerUrl}
                className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-700 outline-none truncate select-all"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCopy}
                className={`h-8 px-3 text-xs font-bold transition-all shrink-0 ${
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {t("linkCopied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {t("copyLink")}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="w-full grid grid-cols-2 gap-2 text-left pt-1">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2">
              <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <div className="font-bold text-emerald-900">
                  {language === "am" ? "ያለ ፓስዎርድ ይከፍታል" : "Instant Authentication"}
                </div>
                <div className="text-emerald-700 text-[10px]">
                  {language === "am" ? "በቀጥታ ስልኩን ያገናኛል" : "Zero login required on phone"}
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px]">
                <div className="font-bold text-blue-900">
                  {language === "am" ? "ፈጣን ሽያጭና ቅነሳ" : "Live Stock Deduction"}
                </div>
                <div className="text-blue-700 text-[10px]">
                  {language === "am" ? "ወዲያው ከስቶክ ይቀንሳል" : "Real-time inventory deduction"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <a
            href={scannerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("openInNewTab")}
          </a>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addStaffAction } from "@/app/actions/staff";
import { ShopRole } from "@prisma/client";
import { X, UserPlus, Save, AlertCircle, KeyRound, Shield } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<ShopRole>(ShopRole.SHOPKEEPER);
  const [pin, setPin] = useState("");
  const [canViewReports, setCanViewReports] = useState(false);
  const [canApplyDiscount, setCanApplyDiscount] = useState(false);
  const [canAdjustStock, setCanAdjustStock] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !fullName.trim()) {
      setError(language === "am" ? "ኢሜይል እና ሙሉ ስም ማስገባት ግዴታ ነው" : "Email and Full Name are required.");
      return;
    }

    if (pin && !/^\d{4,6}$/.test(pin)) {
      setError(language === "am" ? "የገንዘብ መቀበያ ፒን ከ 4 እስከ 6 አሃዝ መሆን አለበት" : "POS PIN must be 4 to 6 numeric digits.");
      return;
    }

    startTransition(async () => {
      const result = await addStaffAction({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        role,
        pin: pin.trim() || undefined,
        canViewReports,
        canApplyDiscount,
        canAdjustStock,
      });

      if (!result.success) {
        setError(result.error || (language === "am" ? "ሰራተኛውን መመዝገብ አልተቻለም" : "Failed to add staff member."));
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("inviteStaffModalTitle")}</h2>
              <p className="text-xs text-slate-500">
                {t("inviteStaffModalDesc")}
              </p>
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">{t("fullNameLabel")} *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">{t("emailLabel")} *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t("staffRole")} *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ShopRole)}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              >
                <option value={ShopRole.SHOPKEEPER}>{t("roleShopkeeper")}</option>
                <option value={ShopRole.SHOP_MANAGER}>{t("roleManager")}</option>
                <option value={ShopRole.SHOP_OWNER}>{t("roleOwner")}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t("posPinLabel")}</label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono tracking-widest"
              />
            </div>
          </div>

          {/* Granular Permission Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              {language === "am" ? "ዝርዝር የስራ ፈቃዶች" : "Granular Operational Privileges"}
            </span>

            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={canViewReports || role === ShopRole.SHOP_OWNER}
                disabled={role === ShopRole.SHOP_OWNER}
                onChange={(e) => setCanViewReports(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700 font-medium">
                {t("canViewReportsLabel")}
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={canApplyDiscount || role === ShopRole.SHOP_OWNER}
                disabled={role === ShopRole.SHOP_OWNER}
                onChange={(e) => setCanApplyDiscount(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700 font-medium">
                {t("canApplyDiscountLabel")}
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={canAdjustStock || role === ShopRole.SHOP_OWNER}
                disabled={role === ShopRole.SHOP_OWNER}
                onChange={(e) => setCanAdjustStock(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="text-xs text-slate-700 font-medium">
                {t("canAdjustStockLabel")}
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
              <Save className="h-4 w-4" />
              {isPending ? t("loading") : t("sendInviteBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

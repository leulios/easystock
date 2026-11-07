"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { addStaffAction } from "@/app/actions/staff";
import { ShopRole } from "@prisma/client";
import {
  X,
  UserPlus,
  Save,
  AlertCircle,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const { t, language } = useLanguage();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<ShopRole>(ShopRole.SHOPKEEPER);
  const [pin, setPin] = useState("");
  const [canViewReports, setCanViewReports] = useState(false);
  const [canApplyDiscount, setCanApplyDiscount] = useState(false);
  const [canAdjustStock, setCanAdjustStock] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handover state after creation
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    fullName: string;
    password: string;
    role: ShopRole;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += "1!";
    setPassword(pass);
    setShowPassword(true);
  };

  const handleClose = () => {
    if (createdCredentials) {
      onSuccess();
    }
    setCreatedCredentials(null);
    setError(null);
    onClose();
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `EasyStock Login Credentials:
---------------------------
Staff Name: ${createdCredentials.fullName}
Role: ${createdCredentials.role}
Username: ${createdCredentials.username}
Password: ${createdCredentials.password}
Login URL: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = usernameOrEmail.trim().toLowerCase();
    const trimmedFullName = fullName.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedFullName) {
      setError(
        language === "am"
          ? "የተጠቃሚ ስም እና ሙሉ ስም ማስገባት ግዴታ ነው"
          : "Username and Full Name are required."
      );
      return;
    }

    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError(
        language === "am"
          ? "የይለፍ ቃል ቢያንስ 6 ፊደላት/ቁጥሮች መሆን አለበት"
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (pin && !/^\d{4,6}$/.test(pin.trim())) {
      setError(
        language === "am"
          ? "የገንዘብ መቀበያ ፒን ከ 4 እስከ 6 አሃዝ መሆን አለበት"
          : "POS PIN must be 4 to 6 numeric digits."
      );
      return;
    }

    startTransition(async () => {
      const result = await addStaffAction({
        usernameOrEmail: trimmedUsername,
        fullName: trimmedFullName,
        password: trimmedPassword,
        phone: phone.trim() || undefined,
        role,
        pin: pin.trim() || undefined,
        canViewReports,
        canApplyDiscount,
        canAdjustStock,
      });

      if (!result.success) {
        setError(result.error || (language === "am" ? "ሰራተኛውን መመዝገብ አልተቻለም" : "Failed to add staff member."));
      } else {
        // Show handover card with credentials
        setCreatedCredentials({
          username: trimmedUsername,
          fullName: trimmedFullName,
          password: trimmedPassword,
          role,
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              {createdCredentials ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {createdCredentials ? t("credentialsCardTitle") : t("inviteStaffModalTitle")}
              </h2>
              <p className="text-xs text-slate-500">
                {createdCredentials ? t("credentialsCardDesc") : t("inviteStaffModalDesc")}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Credentials Ready Handover Card */}
        {createdCredentials ? (
          <div className="p-6 space-y-5">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {language === "am" ? "የመግቢያ መረጃ ለሰራተኛው ለመስጠት ዝግጁ ነው" : "Login Credentials Ready to Handover"}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-emerald-100 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    {t("fullNameLabel")}
                  </span>
                  <span className="font-bold text-slate-900">{createdCredentials.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    {t("staffRole")}
                  </span>
                  <span className="font-bold text-blue-700">{createdCredentials.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    {t("usernameLabel")}
                  </span>
                  <span className="font-bold text-slate-900 select-all">{createdCredentials.username}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    {t("staffPasswordLabel")}
                  </span>
                  <span className="font-bold text-emerald-700 select-all">{createdCredentials.password}</span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-900 leading-relaxed font-sans">
                {language === "am"
                  ? "ሰራተኛው በስልኩ ወይም በኮምፒውተር ላይ ወደ /login ገብቶ በዚህ የተጠቃሚ ስም እና ሚስጥር ቃል መሸጥ መጀመር ይችላል።"
                  : "The staff member can now sign in at /login with this username and password to process sales."}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">{t("credentialsCopied")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-slate-500" />
                    <span>{t("copyCredentialsBtn")}</span>
                  </>
                )}
              </button>

              <Button onClick={handleClose} className="px-6">
                {language === "am" ? "ተጠናቀቀ" : "Done"}
              </Button>
            </div>
          </div>
        ) : (
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
                placeholder={language === "am" ? "ለምሳሌ አበበ ከበደ" : "e.g. Alex Morgan"}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {t("usernameOrEmailLabel")} *
                </label>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={language === "am" ? "ለምሳሌ abebe ወይም abebe@shop.com" : "e.g. abebe or cashier1"}
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {t("staffPasswordLabel")} *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {language === "am" ? "አመንጭ" : "Suggest"}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("staffPasswordPlaceholder")}
                    className="w-full h-10 pl-3 pr-9 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <label className="text-xs font-semibold text-slate-700">
                  {language === "am" ? "ስልክ ቁጥር (አማራጭ)" : "Phone (Optional)"}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+251 91 123 4567"
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
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
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                {isPending ? t("loading") : t("sendInviteBtn")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

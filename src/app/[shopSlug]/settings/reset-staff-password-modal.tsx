"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resetStaffPasswordAction } from "@/app/actions/staff";
import { X, KeyRound, Save, AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2, Copy, Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

interface ResetStaffPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: {
    id: string; // membership id
    fullName: string;
    email: string;
  };
}

export function ResetStaffPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  staff,
}: ResetStaffPasswordModalProps) {
  const { t, language } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += "1!";
    setNewPassword(pass);
    setShowPassword(true);
  };

  const handleCopyNewCredentials = () => {
    const text = `EasyStock Login Credentials:
---------------------------
Staff Name: ${staff.fullName}
Username: ${staff.email}
New Password: ${newPassword}
Login URL: ${window.location.origin}/login`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleClose = () => {
    if (isSuccess) {
      onSuccess();
    }
    setIsSuccess(false);
    setError(null);
    setNewPassword("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = newPassword.trim();
    if (!trimmed || trimmed.length < 6) {
      setError(
        language === "am"
          ? "አዲስ የይለፍ ቃል ቢያንስ 6 ፊደላት/ቁጥሮች መሆን አለበት"
          : "Password must be at least 6 characters long."
      );
      return;
    }

    startTransition(async () => {
      const result = await resetStaffPasswordAction({
        membershipId: staff.id,
        newPassword: trimmed,
      });

      if (!result.success) {
        setError(result.error || (language === "am" ? "የይለፍ ቃሉን መቀየር አልተቻለም" : "Failed to reset staff password."));
      } else {
        setIsSuccess(true);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("resetPasswordModalTitle")}</h2>
              <p className="text-xs text-slate-500 font-mono">
                {staff.fullName} ({staff.email})
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

        {isSuccess ? (
          <div className="p-6 space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{t("passwordChangedSuccess")}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 text-xs font-mono space-y-1">
                <div>
                  <span className="text-slate-400 font-sans">{t("usernameLabel")}: </span>
                  <span className="font-bold text-slate-900">{staff.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-sans">{t("newPasswordLabel")}: </span>
                  <span className="font-bold text-emerald-700 select-all">{newPassword}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyNewCredentials}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {t("newPasswordLabel")} *
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === "am" ? "አዲስ የይለፍ ቃል ያስገቡ" : "Enter new password"}
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

            <p className="text-xs text-slate-500 leading-relaxed">
              {t("resetPasswordModalDesc")}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                {isPending ? t("loading") : t("changeStaffPasswordBtn")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

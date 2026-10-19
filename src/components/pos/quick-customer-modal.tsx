"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/context";
import { createCustomerAction } from "@/app/actions/customers";
import { UserPlus, X, AlertCircle, CheckCircle2, Phone, MapPin, User } from "lucide-react";

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: {
    id: string;
    name: string;
    phone: string | null;
    outstandingCredit: number;
  }) => void;
}

export function QuickCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
}: QuickCustomerModalProps) {
  const { t, language } = useLanguage();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
      setName("");
      setPhone("");
      setAddress("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(
        language === "am" ? "እባክዎ የደንበኛውን ስም ያስገቡ" : "Customer name is required"
      );
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await createCustomerAction({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });

      if (!result.success || !result.customer) {
        setErrorMessage(result.error || "Failed to create customer");
      } else {
        onCustomerCreated({
          id: result.customer.id,
          name: result.customer.name,
          phone: result.customer.phone,
          outstandingCredit: 0,
        });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t("addNewCustomer")}</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {language === "am" ? "ለዱቤ ሽያጭ አዲስ ደንበኛ መዝግብ" : "Register customer for store credit"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              {t("customerName")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                ref={nameInputRef}
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aster Bedane"
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              {t("customerPhone")}
            </label>
            <div className="relative">
              <Phone className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0911223344"
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              {t("customerAddress")}
            </label>
            <div className="relative">
              <MapPin className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Bole Medhanialem"
                className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {t("saveAndSelectCustomer")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

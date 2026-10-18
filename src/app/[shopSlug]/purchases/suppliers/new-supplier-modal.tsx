"use client";

import React, { useState, useTransition } from "react";
import { createSupplierAction } from "@/app/actions/purchases";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Users, AlertCircle } from "lucide-react";

interface NewSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NewSupplierModal({ isOpen, onClose, onSuccess }: NewSupplierModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      contactName: (formData.get("contactName") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      paymentTerms: (formData.get("paymentTerms") as string) || "Net 30",
    };

    startTransition(async () => {
      const result = await createSupplierAction(data);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to create supplier");
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Supplier</h2>
              <p className="text-xs text-slate-500">Record vendor contact and payment terms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Input label="Supplier / Company Name" name="name" required placeholder="Acme Logistics Ltd" />
          <Input label="Contact Person" name="contactName" placeholder="John Smith" />
          <Input label="Phone Number" name="phone" placeholder="+1 555-0199" />
          <Input label="Email Address" name="email" type="email" placeholder="orders@acme.com" />
          <Input label="Payment Terms" name="paymentTerms" defaultValue="Net 30" placeholder="e.g. Net 30, COD" />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Create Supplier
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

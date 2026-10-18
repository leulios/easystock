"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateStaffAction } from "@/app/actions/staff";
import { ShopRole } from "@prisma/client";
import { X, Save, AlertCircle, Shield } from "lucide-react";

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  staff: {
    id: string;
    fullName: string;
    email: string;
    role: ShopRole;
    hasPin: boolean;
    canViewReports: boolean;
    canApplyDiscount: boolean;
    canAdjustStock: boolean;
    isOrgOwner: boolean;
  };
}

export function EditStaffModal({ isOpen, onClose, onSuccess, staff }: EditStaffModalProps) {
  const [role, setRole] = useState<ShopRole>(staff.role);
  const [pin, setPin] = useState("");
  const [canViewReports, setCanViewReports] = useState(staff.canViewReports);
  const [canApplyDiscount, setCanApplyDiscount] = useState(staff.canApplyDiscount);
  const [canAdjustStock, setCanAdjustStock] = useState(staff.canAdjustStock);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin && !/^\d{4,6}$/.test(pin)) {
      setError("POS PIN must be 4 to 6 numeric digits.");
      return;
    }

    startTransition(async () => {
      const result = await updateStaffAction({
        membershipId: staff.id,
        role,
        pin: pin.trim() || undefined,
        canViewReports,
        canApplyDiscount,
        canAdjustStock,
      });

      if (!result.success) {
        setError(result.error || "Failed to update staff permissions.");
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
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Manage Staff Permissions</h2>
              <p className="text-xs text-slate-500">
                {staff.fullName} ({staff.email})
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Operational Role *</label>
              <select
                value={role}
                disabled={staff.isOrgOwner}
                onChange={(e) => setRole(e.target.value as ShopRole)}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              >
                <option value={ShopRole.SHOPKEEPER}>Shopkeeper (Cashier)</option>
                <option value={ShopRole.SHOP_MANAGER}>Shop Manager</option>
                <option value={ShopRole.SHOP_OWNER}>Co-Owner</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Reset POS PIN (4-6 digits)
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={staff.hasPin ? "Leave blank to keep current" : "Set 4-6 digit PIN"}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono tracking-widest"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Granular Operational Privileges
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
                Can view P&L financial reports and margins
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
                Can apply cashier price discounts at POS checkout
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
                Can execute manual inventory adjustments & write-offs
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
              <Save className="h-4 w-4" />
              {isPending ? "Saving..." : "Save Privileges"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

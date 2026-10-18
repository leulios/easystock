"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateShopSettingsAction } from "@/app/actions/shop";
import { removeStaffAction } from "@/app/actions/staff";
import { InviteStaffModal } from "./invite-staff-modal";
import { EditStaffModal } from "./edit-staff-modal";
import { useRouter } from "next/navigation";
import { ShopRole } from "@prisma/client";
import {
  Settings,
  Building2,
  Receipt,
  Shield,
  Users,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  KeyRound,
  Trash2,
  Edit2,
  Lock,
} from "lucide-react";

interface StaffItem {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  role: ShopRole;
  hasPin: boolean;
  canViewReports: boolean;
  canApplyDiscount: boolean;
  canAdjustStock: boolean;
  isOrgOwner: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface SettingsClientProps {
  initialShop: {
    id: string;
    organizationId: string;
    name: string;
    code: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    currency: string;
    taxRate: number;
    taxNumber: string | null;
    receiptHeader: string | null;
    receiptFooter: string | null;
    allowNegativeStock: boolean;
    organization: {
      id: string;
      name: string;
      plan: string;
      planStatus: string;
    };
  };
  initialStaff: StaffItem[];
  currentUserRole: ShopRole;
}

export function SettingsClient({
  initialShop,
  initialStaff,
  currentUserRole,
}: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"general" | "financial" | "receipt" | "staff">("general");

  // Shop settings form state
  const [name, setName] = useState(initialShop.name);
  const [phone, setPhone] = useState(initialShop.phone || "");
  const [email, setEmail] = useState(initialShop.email || "");
  const [address, setAddress] = useState(initialShop.address || "");
  const [currency, setCurrency] = useState(initialShop.currency);
  const [taxRate, setTaxRate] = useState(initialShop.taxRate.toString());
  const [taxNumber, setTaxNumber] = useState(initialShop.taxNumber || "");
  const [receiptHeader, setReceiptHeader] = useState(initialShop.receiptHeader || "");
  const [receiptFooter, setReceiptFooter] = useState(initialShop.receiptFooter || "");
  const [allowNegativeStock, setAllowNegativeStock] = useState(initialShop.allowNegativeStock);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Staff modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);

  const isOwner = currentUserRole === ShopRole.SHOP_OWNER;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    const numericTax = parseFloat(taxRate);
    if (isNaN(numericTax) || numericTax < 0) {
      setErrorMessage("Tax rate must be a valid positive number");
      return;
    }

    startTransition(async () => {
      const res = await updateShopSettingsAction({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        currency: currency.trim().toUpperCase(),
        taxRate: numericTax,
        taxNumber: taxNumber.trim() || null,
        receiptHeader: receiptHeader.trim() || null,
        receiptFooter: receiptFooter.trim() || null,
        allowNegativeStock,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update shop settings");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        router.refresh();
      }
    });
  };

  const handleRemoveStaff = async (staffId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to remove ${fullName} from this shop's staff?`)) return;
    const res = await removeStaffAction(staffId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to remove staff member");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shop Settings</h1>
            <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
              {initialShop.code}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Configure currency, tax policies, thermal receipts, and team permissions
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Subscription Tier:</span>
          <span className="font-bold capitalize bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
            {initialShop.organization.plan}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "general"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="h-4 w-4" /> General Info
        </button>

        <button
          onClick={() => setActiveTab("financial")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "financial"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="h-4 w-4" /> Financial & Policies
        </button>

        <button
          onClick={() => setActiveTab("receipt")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "receipt"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="h-4 w-4" /> Thermal Receipts
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "staff"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="h-4 w-4" /> Staff & Roles ({initialStaff.length})
        </button>
      </div>

      {/* Feedback alerts */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Shop settings updated successfully!</span>
        </div>
      )}

      {/* TAB 1: General Info */}
      {activeTab === "general" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900">General Shop Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Shop Outlet Name *</label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Outlet Code</label>
              <input
                type="text"
                disabled
                value={initialShop.code}
                className="w-full h-10 px-3 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
              <input
                type="tel"
                disabled={!isOwner}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0100"
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Email</label>
              <input
                type="email"
                disabled={!isOwner}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="branch@easystock.app"
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Physical Address</label>
            <textarea
              rows={2}
              disabled={!isOwner}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Suite, Street, City, State/Province, Country"
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
            />
          </div>

          {isOwner && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* TAB 2: Financial & Operational Policies */}
      {activeTab === "financial" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Financial & Tax Policies</h2>
            <p className="text-xs text-slate-500">
              Specify pricing currency, tax calculation rates, and out-of-stock sale policies
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Currency Code *</label>
              <select
                value={currency}
                disabled={!isOwner}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold font-mono"
              >
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="CAD">CAD ($ - Canadian Dollar)</option>
                <option value="AUD">AUD ($ - Australian Dollar)</option>
                <option value="KES">KES (KSh - Kenyan Shilling)</option>
                <option value="ETB">ETB (Br - Ethiopian Birr)</option>
                <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                <option value="ZAR">ZAR (R - South African Rand)</option>
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="AED">AED (AED - UAE Dirham)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Sales Tax Rate (%) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={!isOwner}
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="15.00"
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tax ID / VAT Number</label>
              <input
                type="text"
                disabled={!isOwner}
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="e.g. VAT-987654321"
                className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Negative Stock Policy */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Allow Negative Stock (Backorders)
                </span>
                <p className="text-xs text-slate-500 max-w-lg mt-0.5">
                  When enabled, cashiers can complete sales even if the recorded inventory balance is 0.
                  When disabled (recommended), sales will be rejected atomically if insufficient stock is available.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!isOwner}
                  checked={allowNegativeStock}
                  onChange={(e) => setAllowNegativeStock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Policies"}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* TAB 3: Thermal Receipts */}
      {activeTab === "receipt" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Thermal Receipt Layout</h2>
            <p className="text-xs text-slate-500">
              Customize the header and footer messages printed on customer receipts (80mm / 58mm thermal rolls)
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Receipt Header Note</label>
            <textarea
              rows={3}
              disabled={!isOwner}
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
              placeholder="e.g. Welcome to EasyStock Outlet! Check our daily specials."
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Receipt Footer Note</label>
            <textarea
              rows={3}
              disabled={!isOwner}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. Thank you for your patronage! Returns accepted within 7 days with valid receipt."
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none font-mono text-xs"
            />
          </div>

          {isOwner && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                {isPending ? "Saving..." : "Save Receipt Text"}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* TAB 4: Staff & Access Control */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Authorized Team Members</h2>
              <p className="text-xs text-slate-500">
                Manage cashier accounts, configure role permissions, and assign quick POS PINs
              </p>
            </div>

            {isOwner && (
              <Button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-1.5 self-start sm:self-auto bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" /> Add Staff Member
              </Button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Name & Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">POS PIN</th>
                    <th className="py-3 px-4">Operational Privileges</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{s.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider ${
                            s.role === ShopRole.SHOP_OWNER
                              ? "bg-purple-100 text-purple-800"
                              : s.role === ShopRole.SHOP_MANAGER
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {s.role.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {s.hasPin ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <KeyRound className="h-3 w-3" /> Set
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No PIN</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {s.canViewReports && (
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              Reports
                            </span>
                          )}
                          {s.canApplyDiscount && (
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              Discounts
                            </span>
                          )}
                          {s.canAdjustStock && (
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              Stock Adjust
                            </span>
                          )}
                          {!s.canViewReports && !s.canApplyDiscount && !s.canAdjustStock && (
                            <span className="text-slate-400 text-[10px]">Standard POS only</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isOwner && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingStaff(s)}
                              title="Edit Permissions & PIN"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {!s.isOrgOwner && (
                              <button
                                onClick={() => handleRemoveStaff(s.id, s.fullName)}
                                title="Remove Staff Member"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modals */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => router.refresh()}
      />

      {editingStaff && (
        <EditStaffModal
          isOpen={true}
          onClose={() => setEditingStaff(null)}
          onSuccess={() => router.refresh()}
          staff={editingStaff}
        />
      )}
    </div>
  );
}

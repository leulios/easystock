"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { transferStockAction } from "@/app/actions/inventory";
import { ArrowRightLeft, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SiblingShop {
  id: string;
  name: string;
  code: string;
}

interface InventoryVariant {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  currentStock: number;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShopId: string;
  siblingShops: SiblingShop[];
  inventoryItems: InventoryVariant[];
  preselectedVariantId?: string;
}

export function TransferModal({
  isOpen,
  onClose,
  currentShopId,
  siblingShops,
  inventoryItems,
  preselectedVariantId,
}: TransferModalProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState(
    preselectedVariantId || inventoryItems[0]?.variantId || ""
  );
  const [targetShopId, setTargetShopId] = useState(
    siblingShops.filter((s) => s.id !== currentShopId)[0]?.id || ""
  );
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const currentItem = inventoryItems.find((i) => i.variantId === selectedVariantId);
  const otherShops = siblingShops.filter((s) => s.id !== currentShopId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMessage("Transfer quantity must be a positive number.");
      return;
    }

    if (!targetShopId) {
      setErrorMessage("Please select a target destination shop.");
      return;
    }

    if (currentItem && numQty > currentItem.currentStock) {
      setErrorMessage(
        `Cannot transfer ${numQty} units. Current available stock is only ${currentItem.currentStock}.`
      );
      return;
    }

    startTransition(async () => {
      const res = await transferStockAction({
        targetShopId,
        variantId: selectedVariantId,
        quantity: numQty,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage(
          `Successfully transferred ${res.result.quantity} units to ${res.result.targetShopName}. Batch: ${res.result.transferBatchId}`
        );
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 1800);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Inter-Branch Stock Transfer</h2>
              <p className="text-[11px] text-slate-500">Move inventory between shops in your organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {otherShops.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1">
              <p className="text-xs font-bold text-amber-900">Only One Shop Configured</p>
              <p className="text-xs text-amber-700">
                Inter-branch transfers require at least two shops in your organization. You can create additional branch outlets in Platform Settings.
              </p>
            </div>
          ) : (
            <>
              {/* Product Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Select Item to Transfer</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
                >
                  {inventoryItems.map((item) => (
                    <option key={item.variantId} value={item.variantId}>
                      {item.productName} ({item.sku}) — Available: {item.currentStock}
                    </option>
                  ))}
                </select>
                {currentItem && (
                  <p className="text-[11px] text-slate-500">
                    Currently available in this branch: <strong className="text-slate-800">{currentItem.currentStock} units</strong>
                  </p>
                )}
              </div>

              {/* Destination Shop */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Destination Shop Branch</label>
                <select
                  value={targetShopId}
                  onChange={(e) => setTargetShopId(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
                >
                  {otherShops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transfer Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Quantity to Transfer</label>
                <Input
                  type="number"
                  min="1"
                  max={currentItem ? currentItem.currentStock : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  placeholder="e.g. 10"
                />
              </div>

              {/* Transfer Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Transfer Reason / Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Replenishing branch stock for weekend demand"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || (currentItem && currentItem.currentStock <= 0)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isPending ? "Transferring..." : "Confirm Stock Transfer"}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

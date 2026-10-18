"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPurchaseOrderAction } from "@/app/actions/purchases";
import { ArrowLeft, Plus, Trash2, Truck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProductOption {
  variantId: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface NewPOClientProps {
  suppliers: SupplierOption[];
  products: ProductOption[];
  shopSlug: string;
  currency: string;
}

export function NewPOClient({ suppliers, products, shopSlug, currency }: NewPOClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [poNumber, setPoNumber] = useState(
    `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ variantId: string; orderedQuantity: number; unitCost: number }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addItem = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setItems((prev) => [
      ...prev,
      {
        variantId: defaultProduct.variantId,
        orderedQuantity: 10,
        unitCost: defaultProduct.costPrice,
      },
    ]);
  };

  const updateItem = (index: number, field: string, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      if (field === "variantId") {
        const prod = products.find((p) => p.variantId === val);
        if (prod) copy[index].unitCost = prod.costPrice;
      }
      return copy;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, item) => sum + item.orderedQuantity * item.unitCost, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Please add at least one line item to the purchase order.");
      return;
    }

    startTransition(async () => {
      const result = await createPurchaseOrderAction({
        supplierId,
        poNumber,
        notes: notes || null,
        items,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create purchase order");
      } else {
        router.push(`/${shopSlug}/purchases`);
        router.refresh();
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href={`/${shopSlug}/purchases`}
          className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium mb-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Purchase Orders
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create New Purchase Order
        </h1>
        <p className="text-sm text-slate-500">
          Order incoming inventory from authorized suppliers
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Purchase Order Number"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            required
          />
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ordered Line Items
            </h2>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Product Line
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-sm text-slate-400">
              No items added yet. Click 'Add Product Line' to select products to purchase.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {items.map((item, index) => {
                const lineTotal = item.orderedQuantity * item.unitCost;
                return (
                  <div key={index} className="p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] text-slate-400 mb-1">Product</label>
                      <select
                        value={item.variantId}
                        onChange={(e) => updateItem(index, "variantId", e.target.value)}
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {products.map((p) => (
                          <option key={p.variantId} value={p.variantId}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1">Ordered Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.orderedQuantity}
                        onChange={(e) =>
                          updateItem(index, "orderedQuantity", parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-lg text-center font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] text-slate-400 mb-1">Unit Cost</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) =>
                          updateItem(index, "unitCost", parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-lg text-right font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <label className="block text-[10px] text-slate-400 mb-1">Total</label>
                      <div className="font-bold text-slate-900 text-sm">
                        {formatCurrency(lineTotal, currency)}
                      </div>
                    </div>

                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <div>
            <span className="text-xs text-slate-500">Estimated Total Order Value:</span>
            <div className="text-xl font-extrabold text-slate-900">
              {formatCurrency(totalCost, currency)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href={`/${shopSlug}/purchases`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" isLoading={isPending} disabled={items.length === 0}>
              Create & Issue PO
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

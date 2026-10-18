"use client";

import React, { useState, useTransition } from "react";
import { createProductAction } from "@/app/actions/products";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, AlertCircle } from "lucide-react";

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function NewProductModal({ isOpen, onClose, categories, onSuccess }: NewProductModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      barcode: (formData.get("barcode") as string) || null,
      categoryId: (formData.get("categoryId") as string) || null,
      description: (formData.get("description") as string) || null,
      unitOfMeasure: (formData.get("unitOfMeasure") as string) || "pcs",
      costPrice: parseFloat(formData.get("costPrice") as string) || 0,
      sellingPrice: parseFloat(formData.get("sellingPrice") as string) || 0,
      reorderLevel: parseInt(formData.get("reorderLevel") as string, 10) || 5,
      initialStock: parseInt(formData.get("initialStock") as string, 10) || 0,
    };

    startTransition(async () => {
      const result = await createProductAction(data);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to create product");
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      } else {
        onSuccess?.();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Product</h2>
              <p className="text-xs text-slate-500">Create SKU and initialize shop inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Product Name"
                name="name"
                required
                placeholder="e.g. Wireless Barcode Scanner"
                error={fieldErrors.name?.[0]}
              />
            </div>

            <Input
              label="SKU (Stock Keeping Unit)"
              name="sku"
              required
              placeholder="SCAN-001"
              error={fieldErrors.sku?.[0]}
            />

            <Input
              label="Barcode / EAN / UPC"
              name="barcode"
              placeholder="793573192842"
              error={fieldErrors.barcode?.[0]}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                name="categoryId"
                className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Unit of Measure"
              name="unitOfMeasure"
              defaultValue="pcs"
              placeholder="pcs, box, kg, liter"
              error={fieldErrors.unitOfMeasure?.[0]}
            />

            <Input
              label="Cost Price ($)"
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="15.00"
              error={fieldErrors.costPrice?.[0]}
            />

            <Input
              label="Selling Price ($)"
              name="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="29.99"
              error={fieldErrors.sellingPrice?.[0]}
            />

            <Input
              label="Reorder Threshold"
              name="reorderLevel"
              type="number"
              defaultValue="5"
              min="0"
              helperText="Alerts when stock drops to or below this"
              error={fieldErrors.reorderLevel?.[0]}
            />

            <Input
              label="Initial Opening Stock"
              name="initialStock"
              type="number"
              defaultValue="0"
              min="0"
              helperText="Recorded in stock ledger"
              error={fieldErrors.initialStock?.[0]}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Create Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

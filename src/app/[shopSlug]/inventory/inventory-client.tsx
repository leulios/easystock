"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { AdjustModal } from "./adjust-modal";
import { TransferModal } from "./transfer-modal";
import {
  Boxes,
  Search,
  AlertTriangle,
  History,
  SlidersHorizontal,
  DollarSign,
  TrendingDown,
  ArrowRight,
  ArrowRightLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

interface InventoryRow {
  productId: string;
  variantId: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
}

interface SiblingShop {
  id: string;
  name: string;
  code: string;
}

interface InventoryClientProps {
  initialItems: InventoryRow[];
  shopSlug: string;
  currency: string;
  currentShopId?: string;
  siblingShops?: SiblingShop[];
}

export function InventoryClient({
  initialItems,
  shopSlug,
  currency,
  currentShopId,
  siblingShops,
}: InventoryClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [items, setItems] = useState<InventoryRow[]>(initialItems);
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    variantId?: string;
    name: string;
    sku: string;
    currentStock: number;
  } | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferVariantId, setTransferVariantId] = useState<string | undefined>();

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase().includes(search.toLowerCase()));

    const matchesLowStock = !onlyLowStock || item.isLowStock;
    return matchesSearch && matchesLowStock;
  });

  const totalUnits = items.reduce((sum, item) => sum + item.currentStock, 0);
  const totalValuation = items.reduce((sum, item) => sum + item.currentStock * item.costPrice, 0);
  const lowStockCount = items.filter((item) => item.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("inventoryTitle")}</h1>
          <p className="text-sm text-slate-500">
            {t("inventorySubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          {siblingShops && siblingShops.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTransferVariantId(undefined);
                setIsTransferModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white shadow-sm"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" /> {t("transferStockBtn")}
            </Button>
          )}

          <Link
            href={`/${shopSlug}/inventory/movements`}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            <History className="h-3.5 w-3.5 text-blue-600" />
            {t("navStockHistory")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Summary Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {language === "am" ? "ጠቅላላ ፍሬ ክምችት" : "Total Units in Stock"}
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalUnits}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("totalStockValuation")}
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalValuation, currency)}
            </p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("lowStockItems")}
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchItemPlaceholder")}
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>

        <button
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-2 self-start sm:self-auto ${
            onlyLowStock
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          {onlyLowStock
            ? language === "am" ? "የሚያልቁ ብቻ በማሳየት ላይ" : "Showing: Low Stock Only"
            : t("lowStockItems")}
        </button>
      </div>

      {/* Desktop Stock Table (hidden md:block) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-right">Threshold</th>
                <th className="py-3 px-4 text-right">Stock Valuation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No stock records found</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const lineValuation = item.currentStock * item.costPrice;
                  return (
                    <tr key={item.variantId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="font-mono text-xs text-slate-400">{item.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(item.costPrice, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 font-bold">
                          {item.isLowStock && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                              <AlertTriangle className="h-3 w-3" /> LOW
                            </span>
                          )}
                          <span className={item.isLowStock ? "text-amber-600" : "text-slate-900"}>
                            {item.currentStock} {item.unitOfMeasure}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-slate-500">
                        {item.reorderLevel}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        {formatCurrency(lineValuation, currency)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {siblingShops && siblingShops.length > 1 && item.currentStock > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setTransferVariantId(item.variantId);
                                setIsTransferModalOpen(true);
                              }}
                              className="text-xs h-8 px-2"
                              title="Transfer stock to another shop"
                            >
                              <ArrowRightLeft className="h-3 w-3 text-blue-600 mr-1" /> Transfer
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedProduct({
                                variantId: item.variantId,
                                name: item.name,
                                sku: item.sku,
                                currentStock: item.currentStock,
                              })
                            }
                            className="text-xs h-8"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Adjust
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Stock Cards (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
            <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No stock records found</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const lineValuation = item.currentStock * item.costPrice;
            return (
              <div
                key={item.variantId}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-slate-400">{item.sku}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        item.currentStock <= 0
                          ? "bg-rose-100 text-rose-800"
                          : item.isLowStock
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {item.isLowStock && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                      <span>
                        {item.currentStock} {item.unitOfMeasure}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Alert &le; {item.reorderLevel}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Valuation: <strong className="text-slate-900">{formatCurrency(lineValuation, currency)}</strong>
                  </span>
                  <span className="text-slate-500">
                    Cost: {formatCurrency(item.costPrice, currency)}
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  {siblingShops && siblingShops.length > 1 && item.currentStock > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTransferVariantId(item.variantId);
                        setIsTransferModalOpen(true);
                      }}
                      className="flex-1 h-9 text-xs font-semibold"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600 mr-1.5" /> Transfer
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() =>
                      setSelectedProduct({
                        variantId: item.variantId,
                        name: item.name,
                        sku: item.sku,
                        currentStock: item.currentStock,
                      })
                    }
                    className="flex-1 h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" /> Adjust Stock
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AdjustModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {currentShopId && siblingShops && (
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          currentShopId={currentShopId}
          siblingShops={siblingShops}
          inventoryItems={items.map((i) => ({
            variantId: i.variantId,
            productName: i.name,
            variantName: "Standard",
            sku: i.sku,
            currentStock: i.currentStock,
          }))}
          preselectedVariantId={transferVariantId}
        />
      )}
    </div>
  );
}

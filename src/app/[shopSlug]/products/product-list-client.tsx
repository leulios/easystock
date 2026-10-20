"use client";

import React, { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewProductModal } from "./new-product-modal";
import { BarcodeModal } from "./barcode-modal";
import { archiveProductAction } from "@/app/actions/products";
import { Search, Plus, Trash2, AlertTriangle, Package, Filter, Barcode, Upload, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category: string;
  categoryId: string | null;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
  createdAt: Date;
}

interface ProductListClientProps {
  initialProducts: ProductItem[];
  categories: Array<{ id: string; name: string }>;
  shopSlug: string;
  currency: string;
}

export function ProductListClient({
  initialProducts,
  categories,
  shopSlug,
  currency,
}: ProductListClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<ProductItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      !selectedCategory || p.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleArchive = (id: string, name: string) => {
    if (!confirm(t("areYouSure"))) {
      return;
    }

    startTransition(async () => {
      const result = await archiveProductAction(id);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        alert(result.error || t("error"));
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("productsTitle")}</h1>
          <p className="text-sm text-slate-500">
            {t("productsSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <a
            href="/api/export/products"
            download
            className="inline-flex items-center px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> {t("exportCsv")}
          </a>

          <Link
            href={`/${shopSlug}/products/import`}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> {t("navImportItems")}
          </Link>

          <Button onClick={() => setIsModalOpen(true)} className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> {t("addProductBtn")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchItemPlaceholder")}
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          >
            <option value="">{t("all")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Products Table (hidden md:block) */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search || selectedCategory
                        ? "Try adjusting your search filters"
                        : "Click 'Add New Product' to create your first catalog item"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">
                      <div className="font-semibold text-slate-900">{product.sku}</div>
                      {product.barcode && (
                        <div className="text-[11px] text-slate-400">{product.barcode}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-400">Unit: {product.unitOfMeasure}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-semibold">
                        {product.isLowStock && (
                          <span title="Low Stock Warning">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </span>
                        )}
                        <span className={product.isLowStock ? "text-amber-600" : "text-slate-900"}>
                          {product.currentStock}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">Min: {product.reorderLevel}</div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatCurrency(product.costPrice, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatCurrency(product.sellingPrice, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setBarcodeProduct(product)}
                          title="Print Barcode Label"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(product.id, product.name)}
                          disabled={isPending}
                          title="Archive Product"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Product Cards (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
            <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No products found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or category filter</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-slate-400">{product.sku}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                      {product.category}
                    </span>
                  </div>
                  {product.barcode && (
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                      <Barcode className="h-3 w-3" /> {product.barcode}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      product.currentStock <= 0
                        ? "bg-rose-100 text-rose-800"
                        : product.isLowStock
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {product.isLowStock && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                    <span>{product.currentStock} in stock</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Min alert: {product.reorderLevel}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Selling Price: </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {formatCurrency(product.sellingPrice, currency)}
                  </span>
                </div>
                <div className="text-slate-500 text-right">
                  Cost: {formatCurrency(product.costPrice, currency)}
                </div>
              </div>

              <div className="pt-1 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBarcodeProduct(product)}
                  className="h-8 px-3 text-xs font-semibold"
                >
                  <Barcode className="h-3.5 w-3.5 mr-1" /> Label
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleArchive(product.id, product.name)}
                  disabled={isPending}
                  className="h-8 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Archive
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <NewProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <BarcodeModal
        isOpen={Boolean(barcodeProduct)}
        onClose={() => setBarcodeProduct(null)}
        product={barcodeProduct}
        currency={currency}
        shopName="EasyStock Outlet"
      />
    </div>
  );
}

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
    if (!confirm(`Are you sure you want to archive "${name}"? Historical sales will remain intact.`)) {
      return;
    }

    startTransition(async () => {
      const result = await archiveProductAction(id);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      } else {
        alert(result.error || "Failed to archive product");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products & Catalog</h1>
          <p className="text-sm text-slate-500">
            Manage your centralized SKU inventory, barcodes, and pricing
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <a
            href="/api/export/products"
            download
            className="inline-flex items-center px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Export CSV
          </a>

          <Link
            href={`/${shopSlug}/products/import`}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> Import CSV
          </Link>

          <Button onClick={() => setIsModalOpen(true)} className="text-xs">
            <Plus className="h-4 w-4 mr-1.5" /> Add New Product
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
            placeholder="Search by product name, SKU, or barcode..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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

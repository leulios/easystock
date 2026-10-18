"use client";

import React from "react";
import { formatCurrency } from "@/lib/decimal";
import { X, Printer, Barcode as BarcodeIcon } from "lucide-react";

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    name: string;
    sku: string;
    barcode: string | null;
    sellingPrice: number;
    unitOfMeasure: string;
  } | null;
  currency: string;
  shopName: string;
}

export function BarcodeModal({
  isOpen,
  onClose,
  product,
  currency,
  shopName,
}: BarcodeModalProps) {
  if (!isOpen || !product) return null;

  const displayBarcode = product.barcode || product.sku;

  const handlePrint = () => {
    window.print();
  };

  // Simple pseudo-barcode generator (lines of varying widths based on character charcodes)
  const generateBarcodeLines = (str: string) => {
    const chars = str.split("");
    return chars.map((char, idx) => {
      const code = char.charCodeAt(0);
      const width = (code % 3) + 1.5;
      const isSpace = (code + idx) % 5 === 0;
      return (
        <rect
          key={idx}
          x={idx * 5 + 10}
          y={10}
          width={width}
          height={45}
          fill={isSpace ? "none" : "#0f172a"}
        />
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BarcodeIcon className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Print Shelf Barcode Label</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Label Canvas */}
        <div className="p-6 bg-slate-50 flex flex-col items-center justify-center">
          <div
            id="printable-barcode-label"
            className="w-64 bg-white border border-dashed border-slate-300 rounded-lg p-4 shadow-sm text-center space-y-1.5"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {shopName}
            </div>

            <div className="text-sm font-bold text-slate-900 truncate">{product.name}</div>

            <div className="text-base font-extrabold text-blue-700 font-mono">
              {formatCurrency(product.sellingPrice, currency)}
              <span className="text-[11px] font-normal text-slate-500">
                {" "}
                / {product.unitOfMeasure}
              </span>
            </div>

            {/* SVG Barcode */}
            <div className="flex justify-center py-1">
              <svg width="200" height="65" className="overflow-visible">
                {/* Guard start lines */}
                <rect x="2" y="10" width="2" height="50" fill="#0f172a" />
                <rect x="6" y="10" width="1.5" height="50" fill="#0f172a" />

                {generateBarcodeLines(displayBarcode)}

                {/* Guard end lines */}
                <rect x="188" y="10" width="1.5" height="50" fill="#0f172a" />
                <rect x="192" y="10" width="2" height="50" fill="#0f172a" />

                <text
                  x="100"
                  y="64"
                  textAnchor="middle"
                  className="font-mono text-[9px] fill-slate-600 font-semibold tracking-widest"
                >
                  {displayBarcode}
                </text>
              </svg>
            </div>

            <div className="text-[10px] text-slate-400 font-mono">SKU: {product.sku}</div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Compatible with standard 50mm × 30mm & 60mm × 40mm thermal label printers
          </p>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Print Label
          </button>
        </div>
      </div>
    </div>
  );
}

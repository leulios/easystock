"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Search,
  Barcode,
  Boxes,
  AlertTriangle,
  History,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
} from "lucide-react";

interface ShopkeeperDashboardClientProps {
  initialData: any;
  shopSlug: string;
}

export function ShopkeeperDashboardClient({
  initialData,
  shopSlug,
}: ShopkeeperDashboardClientProps) {
  const { shop, shift, inventoryAlerts, recentMovements } = initialData;
  const [productSearch, setProductSearch] = useState("");

  return (
    <div className="space-y-8">
      {/* Top Banner: Shift Overview & Quick Launch POS */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm mb-2">
            <Clock className="h-3.5 w-3.5 text-blue-200" /> Active Cashier Shift
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to {shop.name} Terminal
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-md">
            Process checkouts, scan customer items, and review stock availability in real time.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href={`/${shopSlug}/pos`} className="w-full sm:w-auto">
            <button className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white text-blue-700 font-bold text-sm shadow hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" /> Start New Sale (POS)
            </button>
          </Link>
        </div>
      </div>

      {/* Cashier Shift Stats (Zero disclosure of confidential profit margins or operational expenses) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Orders Processed
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">
              {shift.todaySalesCount} completed
            </p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Shift Sales Volume
            </p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              {formatCurrency(shift.todayVolume, shop.currency)}
            </p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Stock Status & Permitted Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low-Stock & Out-of-Stock Warnings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Stock Alerts for Cashiers
            </h2>
            <Link
              href={`/${shopSlug}/inventory`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Browse Catalog &rarr;
            </Link>
          </div>

          {inventoryAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              All inventory levels are currently healthy.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {inventoryAlerts.map((item: any) => (
                <div key={item.sku} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.sku} (Min: {item.reorderLevel})
                    </div>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      item.isOut
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.isOut ? "OUT OF STOCK" : `${item.currentStock} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permitted Recent Shift Sales (Allows receipt lookup and reprints) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Your Recent Transactions</h2>
            <Link
              href={`/${shopSlug}/pos/history`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Full History &rarr;
            </Link>
          </div>

          {shift.recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions completed in your shift today yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {shift.recentTransactions.map((tx: any) => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-mono font-semibold text-slate-900">
                      {tx.receiptNumber}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(tx.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">
                      {formatCurrency(tx.amount, shop.currency)}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

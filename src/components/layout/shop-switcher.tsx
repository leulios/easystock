"use client";

import React, { useState, useTransition } from "react";
import { Store, ChevronDown, Check } from "lucide-react";
import { switchShopAction } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

interface ShopOption {
  id: string;
  name: string;
  code: string;
}

interface ShopSwitcherProps {
  currentShopId: string;
  currentShopName: string;
  availableShops: ShopOption[];
}

export function ShopSwitcher({
  currentShopId,
  currentShopName,
  availableShops,
}: ShopSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSelect = (shopId: string) => {
    setIsOpen(false);
    if (shopId === currentShopId) return;

    startTransition(async () => {
      const result = await switchShopAction(shopId);
      if (result.success) {
        router.push(`/${shopId}/dashboard`);
        router.refresh();
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 rounded-lg text-left transition-colors text-sm font-medium text-slate-800"
      >
        <div className="flex items-center gap-2 truncate">
          <Store className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="truncate">{currentShopName || "Select Shop"}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 max-h-60 overflow-y-auto">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Available Shops ({availableShops.length})
            </div>
            {availableShops.map((shop) => {
              const isSelected = shop.id === currentShopId;
              return (
                <button
                  key={shop.id}
                  onClick={() => handleSelect(shop.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    isSelected ? "font-semibold text-blue-600 bg-blue-50/50" : "text-slate-700"
                  }`}
                >
                  <div className="truncate">
                    <div>{shop.name}</div>
                    <div className="text-xs text-slate-400">{shop.code}</div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

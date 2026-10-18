"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Store,
  PackagePlus,
  Boxes,
  Receipt,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OnboardingWizardClientProps {
  shopSlug: string;
  shop: {
    id: string;
    name: string;
    code: string;
    currency: string;
    taxRate: number;
    phone: string | null;
  };
  metrics: {
    productCount: number;
    inventoryTotalQty: number;
    salesCount: number;
  };
}

export function OnboardingWizardClient({
  shopSlug,
  shop,
  metrics,
}: OnboardingWizardClientProps) {
  const router = useRouter();

  const steps = [
    {
      id: "settings",
      title: "1. Configure Shop Profile & Currency",
      description: "Confirm currency (ETB), tax percentage (VAT/TOT), and thermal receipt headers.",
      isCompleted: Boolean(shop.currency && shop.name),
      href: `/${shopSlug}/settings`,
      cta: "Review Settings",
      icon: Store,
    },
    {
      id: "products",
      title: "2. Add Products or Import CSV Spreadsheet",
      description: "Build your product catalog manually or bulk upload via Excel/CSV spreadsheet.",
      isCompleted: metrics.productCount > 0,
      href: `/${shopSlug}/products`,
      importHref: `/${shopSlug}/products/import`,
      cta: "Add Products",
      icon: PackagePlus,
    },
    {
      id: "stock",
      title: "3. Verify Opening Stock Ledger",
      description: "Ensure stock quantities match your physical shelves with double-entry stock tracking.",
      isCompleted: metrics.inventoryTotalQty > 0,
      href: `/${shopSlug}/inventory`,
      cta: "Check Inventory",
      icon: Boxes,
    },
    {
      id: "pos",
      title: "4. Launch POS Terminal & Ring First Sale",
      description: "Test high-speed barcode scanning, customer selection, split payments, and thermal receipts.",
      isCompleted: metrics.salesCount > 0,
      href: `/${shopSlug}/pos`,
      cta: "Open POS Checkout",
      icon: Receipt,
    },
  ];

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            Quick Setup Guide
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to EasyStock, {shop.name}!
          </h1>
          <p className="text-sm text-blue-100 max-w-xl leading-relaxed">
            Follow this 4-step checklist to configure your retail outlet, populate your catalog, and start serving customers today.
          </p>

          {/* Progress Bar */}
          <div className="pt-2 max-w-md space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span>Setup Progress</span>
              <span>{progressPercent}% Complete</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={`p-5 rounded-2xl border transition-all ${
                step.isCompleted
                  ? "bg-emerald-50/40 border-emerald-200 shadow-sm"
                  : "bg-white border-slate-200 shadow-sm hover:border-blue-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl shrink-0 ${
                      step.isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {step.isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                      {step.isCompleted && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  {step.importHref && (
                    <Link
                      href={step.importHref}
                      className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Import CSV
                    </Link>
                  )}

                  <Button
                    size="sm"
                    variant={step.isCompleted ? "outline" : "primary"}
                    onClick={() => router.push(step.href)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <span>{step.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Done Footer */}
      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <span>Need assistance? Review our operational guides or reach out to support.</span>
        <Link
          href={`/${shopSlug}/dashboard`}
          className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Go to Main Dashboard <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

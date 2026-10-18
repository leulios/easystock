import Link from "next/link";
import { getCurrentContext } from "./actions/auth";
import { redirect } from "next/navigation";
import { ShieldCheck, Store, TrendingUp, Layers, CheckCircle2, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const context = await getCurrentContext();

  if (context && context.shopId) {
    redirect(`/${context.shopId}/dashboard`);
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm font-bold text-lg">
              ES
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              Easy<span className="text-blue-600">Stock</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              Register Shop <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 lg:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-6">
          <ShieldCheck className="h-3.5 w-3.5" /> Multi-Tenant Inventory & POS Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-tight sm:leading-none">
          Professional Inventory & Shop Management Built for Real Scale
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
          Ledger-backed stock movements, high-speed transactional POS, multi-branch switching, and real-time financial reporting powered by Neon Serverless Postgres.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="h-12 px-8 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-md transition-all flex items-center gap-2 text-base"
          >
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="h-12 px-8 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-base"
          >
            Cashier & Staff Login
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left">
          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Store className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Multi-Shop Isolation</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Manage multiple shops, branches, and warehouses from a single account with strict tenant data boundary enforcement.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Immutable Stock Ledger</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Every stock deduction, purchase receiving, and return is permanently recorded in a transactionally consistent audit ledger.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Exact Decimal Financials</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Zero floating-point rounding errors. Exact profit margins, tax computations, and automated COGS tracking.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} EasyStock SaaS. Enterprise Architecture. All rights reserved.
      </footer>
    </div>
  );
}

import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DollarSign, Boxes, TrendingUp, Download, ArrowRight, ShieldAlert } from "lucide-react";
import { ShopRole } from "@prisma/client";

interface ReportsPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  // Ensure caller has reporting permissions
  const canViewReports =
    context.role === ShopRole.SHOP_OWNER ||
    (context.role === ShopRole.SHOP_MANAGER && context.permissions.canViewReports);

  if (!canViewReports) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Restricted Access</h1>
        <p className="text-sm text-slate-500">
          You do not have administrative permission to view shop financial and profit reports.
          Please contact the shop owner if you require access.
        </p>
        <Link
          href={`/${shopSlug}/dashboard`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Business Reports Hub</h1>
        <p className="text-sm text-slate-500">
          Exportable financial statements, sales metrics, and inventory valuation ledgers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Sales & Revenue Report</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Detailed chronological ledger of sales transactions, subtotal breakdowns, taxes collected, discounts given, and tender splits.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/${shopSlug}/reports/sales`}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              Open Report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`/api/export/sales?period=30d`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Download 30d CSV"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Boxes className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Inventory Asset Valuation</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete catalog asset valuation based on current unit cost vs retail price, potential gross margins, and stock on hand.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/${shopSlug}/reports/inventory-valuation`}
              className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Open Report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`/api/export/inventory`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Download CSV"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Profit & Loss Statement</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Operating statement reflecting net revenue, cost of goods sold (COGS), gross margins, categorized operating expenses, and net profit.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Link
              href={`/${shopSlug}/reports/profit-loss`}
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              Open Statement <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`/api/export/profit-loss?period=month`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Download Month CSV"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

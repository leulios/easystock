import { NextRequest, NextResponse } from "next/server";
import { getCurrentContext } from "@/app/actions/auth";
import {
  getSalesReportData,
  getInventoryValuationReportData,
  getProfitLossReportData,
  DateRangePreset,
} from "@/lib/services/reporting-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const context = await getCurrentContext();

  if (!context) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as DateRangePreset) || "30d";

  let csvContent = "";
  let filename = `easystock-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  if (type === "sales") {
    const data = await getSalesReportData(context, period);
    const headers = [
      "Receipt Number",
      "Date",
      "Customer",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
      "COGS",
      "Gross Margin",
      "Payment Methods",
      "Status",
    ];
    const rows = data.map((d) => [
      d.receiptNumber,
      d.date,
      `"${d.customer.replace(/"/g, '""')}"`,
      d.subtotal.toFixed(2),
      d.discount.toFixed(2),
      d.tax.toFixed(2),
      d.total.toFixed(2),
      d.cogs.toFixed(2),
      d.margin.toFixed(2),
      `"${d.paymentMethods}"`,
      d.status,
    ]);
    csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (type === "inventory") {
    const data = await getInventoryValuationReportData(context);
    const headers = [
      "SKU",
      "Barcode",
      "Product Name",
      "Category",
      "Quantity On Hand",
      "Unit Cost",
      "Retail Price",
      "Total Cost Valuation",
      "Total Retail Valuation",
      "Potential Gross Profit",
      "Margin %",
    ];
    const rows = data.map((d) => [
      d.sku,
      d.barcode,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.category.replace(/"/g, '""')}"`,
      d.quantity,
      d.unitCost.toFixed(2),
      d.retailPrice.toFixed(2),
      d.totalCostValuation.toFixed(2),
      d.totalRetailValuation.toFixed(2),
      d.potentialProfit.toFixed(2),
      `${d.marginPct}%`,
    ]);
    csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else if (type === "profit-loss") {
    const data = await getProfitLossReportData(context, period);
    const rows = [
      ["Metric", "Amount"],
      ["Period", data.period],
      ["Gross Revenue", data.grossRevenue.toFixed(2)],
      ["Discounts Given", data.discounts.toFixed(2)],
      ["Taxes Collected", data.taxCollected.toFixed(2)],
      ["Net Sales", data.netRevenue.toFixed(2)],
      ["Cost of Goods Sold (COGS)", data.cogs.toFixed(2)],
      ["Gross Profit", data.grossProfit.toFixed(2)],
      ["Gross Margin %", `${data.grossMarginPercent}%`],
      ["", ""],
      ["Operating Expenses by Category", ""],
      ...Object.entries(data.expensesByCategory).map(([cat, amt]) => [cat, amt.toFixed(2)]),
      ["Total Operating Expenses", data.totalExpenses.toFixed(2)],
      ["", ""],
      ["Net Operating Profit", data.netProfit.toFixed(2)],
      ["Net Margin %", `${data.netMarginPercent}%`],
    ];
    csvContent = rows.map((r) => r.join(",")).join("\n");
  } else if (type === "products") {
    const { prisma } = await import("@/lib/db");
    const products = await prisma.product.findMany({
      where: { organizationId: context.organizationId, deletedAt: null },
      include: {
        category: true,
        variants: {
          include: {
            inventoryItems: {
              where: { shopId: context.shopId },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const headers = [
      "SKU",
      "Barcode",
      "Product Name",
      "Category",
      "Unit",
      "Cost Price",
      "Selling Price",
      "Reorder Level",
      "Current Stock",
      "Status",
    ];

    const rows = products.flatMap((p) =>
      p.variants.map((v) => {
        const stock = v.inventoryItems[0]?.quantity || 0;
        return [
          v.sku,
          v.barcode || "",
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.category?.name?.replace(/"/g, '""') || "Uncategorized"}"`,
          p.unitOfMeasure,
          Number(v.costPrice).toFixed(2),
          Number(v.sellingPrice).toFixed(2),
          v.reorderLevel,
          stock,
          p.isActive ? "Active" : "Archived",
        ];
      })
    );
    csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  } else {
    return new NextResponse("Invalid export type", { status: 400 });
  }

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

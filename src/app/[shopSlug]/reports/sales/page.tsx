import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getSalesReportData, DateRangePreset } from "@/lib/services/reporting-service";
import { prisma } from "@/lib/db";
import { SalesReportClient } from "./sales-report-client";
import { ShopRole } from "@prisma/client";

interface SalesReportPageProps {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function SalesReportPage({ params, searchParams }: SalesReportPageProps) {
  const { shopSlug } = await params;
  const { period = "30d" } = await searchParams;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const canViewReports =
    context.role === ShopRole.SHOP_OWNER ||
    (context.role === ShopRole.SHOP_MANAGER && context.permissions.canViewReports);

  if (!canViewReports) {
    redirect(`/${shopSlug}/dashboard`);
  }

  const [sales, shop] = await Promise.all([
    getSalesReportData(context, period as DateRangePreset),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  return (
    <SalesReportClient
      sales={sales}
      period={period as DateRangePreset}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}

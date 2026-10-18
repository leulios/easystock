import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getProfitLossReportData, DateRangePreset } from "@/lib/services/reporting-service";
import { prisma } from "@/lib/db";
import { ProfitLossClient } from "./profit-loss-client";
import { ShopRole } from "@prisma/client";

interface ProfitLossPageProps {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function ProfitLossPage({ params, searchParams }: ProfitLossPageProps) {
  const { shopSlug } = await params;
  const { period = "month" } = await searchParams;
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

  const [plData, shop] = await Promise.all([
    getProfitLossReportData(context, period as DateRangePreset),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  return (
    <ProfitLossClient
      data={plData}
      period={period as DateRangePreset}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}

import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getInventoryValuationReportData } from "@/lib/services/reporting-service";
import { prisma } from "@/lib/db";
import { InventoryReportClient } from "./inventory-report-client";
import { ShopRole } from "@prisma/client";

interface InventoryReportPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function InventoryReportPage({ params }: InventoryReportPageProps) {
  const { shopSlug } = await params;
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

  const [items, shop] = await Promise.all([
    getInventoryValuationReportData(context),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  return (
    <InventoryReportClient
      items={items}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}

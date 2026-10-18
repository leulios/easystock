import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import {
  getShopOwnerDashboardMetrics,
  getShopkeeperDashboardMetrics,
  DateRangePreset,
} from "@/lib/services/reporting-service";
import { OwnerDashboardClient } from "./owner-dashboard-client";
import { ShopkeeperDashboardClient } from "./shopkeeper-dashboard-client";
import { ShopRole } from "@prisma/client";

interface DashboardPageProps {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { shopSlug } = await params;
  const { period = "30d" } = await searchParams;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  // Determine whether caller has owner/manager financial report visibility
  const canViewFinancials =
    context.role === ShopRole.SHOP_OWNER ||
    (context.role === ShopRole.SHOP_MANAGER && context.permissions.canViewReports);

  if (canViewFinancials) {
    const metrics = await getShopOwnerDashboardMetrics(context, period as DateRangePreset);
    return <OwnerDashboardClient initialData={metrics} shopSlug={shopSlug} />;
  }

  // Otherwise, render dedicated operational Shopkeeper Terminal Dashboard
  const shopkeeperMetrics = await getShopkeeperDashboardMetrics(context);
  return (
    <ShopkeeperDashboardClient
      initialData={shopkeeperMetrics}
      shopSlug={shopSlug}
    />
  );
}

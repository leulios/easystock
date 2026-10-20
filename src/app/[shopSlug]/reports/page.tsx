import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { ShopRole } from "@prisma/client";
import { ReportsHubClient } from "./reports-hub-client";

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

  return <ReportsHubClient shopSlug={shopSlug} canViewReports={Boolean(canViewReports)} />;
}

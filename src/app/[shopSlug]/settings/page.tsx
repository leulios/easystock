import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getShopSettings } from "@/lib/services/shop-service";
import { listShopStaff } from "@/lib/services/staff-service";
import { SettingsClient } from "./settings-client";
import { ShopRole } from "@prisma/client";

interface SettingsPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context || context.shopId !== shopSlug) {
    redirect(`/${shopSlug}/dashboard`);
  }

  // Only Shop Owners and platform admins have access to shop settings
  if (context.role !== ShopRole.SHOP_OWNER && !context.isPlatformAdmin) {
    redirect(`/${shopSlug}/dashboard`);
  }

  const [shop, staff] = await Promise.all([
    getShopSettings(context),
    listShopStaff(context),
  ]);

  return (
    <SettingsClient
      initialShop={shop}
      initialStaff={staff}
      currentUserRole={context.role}
    />
  );
}

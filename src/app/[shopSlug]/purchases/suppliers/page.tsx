import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listSuppliers } from "@/lib/services/purchase-service";
import { SuppliersClient } from "./suppliers-client";
import { ShopRole } from "@prisma/client";

interface SuppliersPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function SuppliersPage({ params }: SuppliersPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    redirect(`/${shopSlug}/dashboard`);
  }

  const suppliers = await listSuppliers(context);

  return <SuppliersClient suppliers={suppliers} shopSlug={shopSlug} />;
}

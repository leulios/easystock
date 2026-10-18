import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listSuppliers } from "@/lib/services/purchase-service";
import { SuppliersClient } from "./suppliers-client";

interface SuppliersPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function SuppliersPage({ params }: SuppliersPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const suppliers = await listSuppliers(context);

  return <SuppliersClient suppliers={suppliers} shopSlug={shopSlug} />;
}

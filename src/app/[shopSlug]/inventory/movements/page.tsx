import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listStockMovements } from "@/lib/services/inventory-service";
import { prisma } from "@/lib/db";
import { MovementsClient } from "./movements-client";

interface MovementsPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function MovementsPage({ params }: MovementsPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [movementsResult, shop] = await Promise.all([
    listStockMovements(context, { pageSize: 100 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  return (
    <MovementsClient
      initialMovements={movementsResult.items}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}

import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { ProductListClient } from "./product-list-client";

interface ProductsPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [productsResult, categories, shop] = await Promise.all([
    listProducts(context, { pageSize: 100 }),
    prisma.category.findMany({
      where: { organizationId: context.organizationId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  return (
    <ProductListClient
      initialProducts={productsResult.items}
      categories={categories}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}

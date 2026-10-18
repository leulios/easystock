import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listSuppliers } from "@/lib/services/purchase-service";
import { listProducts } from "@/lib/services/product-service";
import { prisma } from "@/lib/db";
import { NewPOClient } from "./new-po-client";

interface NewPOPageProps {
  params: Promise<{ shopSlug: string }>;
}

export default async function NewPOPage({ params }: NewPOPageProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  const [suppliers, productsResult, shop] = await Promise.all([
    listSuppliers(context),
    listProducts(context, { pageSize: 150 }),
    prisma.shop.findUnique({
      where: { id: context.shopId },
      select: { currency: true },
    }),
  ]);

  const productOptions = productsResult.items.map((p) => ({
    variantId: p.variantId!,
    name: p.name,
    sku: p.sku,
    costPrice: p.costPrice,
  }));

  return (
    <NewPOClient
      suppliers={suppliers}
      products={productOptions}
      shopSlug={shopSlug}
      currency={shop?.currency || "USD"}
    />
  );
}

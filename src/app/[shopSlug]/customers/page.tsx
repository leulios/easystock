import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listCustomers } from "@/lib/services/customer-service";
import { prisma } from "@/lib/db";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context || context.shopId !== shopSlug) {
    redirect(`/${shopSlug}/dashboard`);
  }

  const shop = await prisma.shop.findUnique({
    where: { id: context.shopId },
    select: { id: true, currency: true },
  });

  if (!shop) {
    redirect("/");
  }

  const { items } = await listCustomers(context);

  return (
    <CustomersClient
      initialCustomers={items}
      shop={{ id: shop.id, currency: shop.currency }}
    />
  );
}

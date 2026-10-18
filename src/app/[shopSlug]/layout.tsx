import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

interface ShopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
  const { shopSlug } = await params;
  const context = await getCurrentContext();

  if (!context) {
    redirect("/login");
  }

  // Find shop matching the param (shopSlug can be ID or Shop code)
  const currentShop = await prisma.shop.findFirst({
    where: {
      organizationId: context.organizationId,
      OR: [{ id: shopSlug }, { code: shopSlug.toUpperCase() }],
      deletedAt: null,
    },
  });

  if (!currentShop) {
    redirect("/");
  }

  // Fetch all shops available to this user in their organization
  const availableShops = await prisma.shop.findMany({
    where: {
      organizationId: context.organizationId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar
        shopId={currentShop.id}
        role={context.role}
        isPlatformAdmin={context.isPlatformAdmin}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentShop={currentShop}
          availableShops={availableShops}
          user={context.user}
          role={context.role}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listAdminShops } from "@/lib/services/platform-admin-service";
import { ShopsAdminClient } from "./shops-admin-client";

export default async function AdminShopsPage() {
  const context = await getCurrentContext();
  if (!context || !context.isPlatformAdmin) {
    redirect("/");
  }

  const { items } = await listAdminShops(context, { pageSize: 100 });

  return <ShopsAdminClient initialShops={items} />;
}

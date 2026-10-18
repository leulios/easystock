import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listSupportTickets, listAdminShops } from "@/lib/services/platform-admin-service";
import { SupportAdminClient } from "./support-admin-client";

export default async function AdminSupportPage() {
  const context = await getCurrentContext();
  if (!context || !context.isPlatformAdmin) {
    redirect("/");
  }

  const [tickets, shopsResult] = await Promise.all([
    listSupportTickets(context),
    listAdminShops(context, { pageSize: 100 }),
  ]);

  const simplifiedShops = shopsResult.items.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    organizationName: s.organization.name,
  }));

  return <SupportAdminClient initialTickets={tickets} shops={simplifiedShops} />;
}

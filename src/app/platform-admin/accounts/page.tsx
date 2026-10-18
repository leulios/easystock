import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listAdminUsers } from "@/lib/services/platform-admin-service";
import { AccountsAdminClient } from "./accounts-admin-client";

export default async function AdminAccountsPage() {
  const context = await getCurrentContext();
  if (!context || !context.isPlatformAdmin) {
    redirect("/");
  }

  const { items } = await listAdminUsers(context, { pageSize: 100 });

  return <AccountsAdminClient initialUsers={items} />;
}

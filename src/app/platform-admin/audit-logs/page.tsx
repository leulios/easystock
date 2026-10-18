import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { listAuditLogs } from "@/lib/services/platform-admin-service";
import { AuditAdminClient } from "./audit-admin-client";

export default async function AdminAuditLogsPage() {
  const context = await getCurrentContext();
  if (!context || !context.isPlatformAdmin) {
    redirect("/");
  }

  const { items } = await listAuditLogs(context, { pageSize: 100 });

  return <AuditAdminClient initialLogs={items} />;
}

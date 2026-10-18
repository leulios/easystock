import React from "react";
import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getPlatformConfig } from "@/lib/services/platform-admin-service";
import { SettingsAdminClient } from "./settings-admin-client";

export default async function AdminSettingsPage() {
  const context = await getCurrentContext();
  if (!context || !context.isPlatformAdmin) {
    redirect("/");
  }

  const config = await getPlatformConfig(context);

  return <SettingsAdminClient initialConfig={config} />;
}

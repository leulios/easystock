import { getCurrentContext } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { getPlatformAdminMetrics } from "@/lib/services/reporting-service";
import { AdminClient } from "./admin-client";
import { PlatformRole } from "@prisma/client";

export default async function AdminPage() {
  redirect("/platform-admin");
}

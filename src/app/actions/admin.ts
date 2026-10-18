"use server";

import { getCurrentContext } from "./auth";
import { prisma } from "@/lib/db";
import { PlatformRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function toggleOrganizationStatusAction(
  organizationId: string,
  newStatus: "active" | "suspended"
) {
  const context = await getCurrentContext();
  if (!context || (context.user.platformRole !== PlatformRole.SUPER_ADMIN && !context.isPlatformAdmin)) {
    return { success: false, error: "Unauthorized: Super Admin access required." };
  }

  try {
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { planStatus: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: context.user.id,
        action: newStatus === "suspended" ? "ORGANIZATION_SUSPENDED" : "ORGANIZATION_ACTIVATED",
        entityType: "Organization",
        entityId: org.id,
        newData: { planStatus: newStatus },
      },
    });

    revalidatePath("/admin");
    return { success: true, organization: org };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update tenant status" };
  }
}

export async function updateOrganizationPlanAction(
  organizationId: string,
  newPlan: "standard" | "professional" | "enterprise"
) {
  const context = await getCurrentContext();
  if (!context || (context.user.platformRole !== PlatformRole.SUPER_ADMIN && !context.isPlatformAdmin)) {
    return { success: false, error: "Unauthorized: Super Admin access required." };
  }

  const maxShopsByPlan = {
    standard: 3,
    professional: 10,
    enterprise: 50,
  };

  try {
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        plan: newPlan,
        maxShops: maxShopsByPlan[newPlan],
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: context.user.id,
        action: "ORGANIZATION_PLAN_CHANGED",
        entityType: "Organization",
        entityId: org.id,
        newData: { plan: newPlan, maxShops: maxShopsByPlan[newPlan] },
      },
    });

    revalidatePath("/admin");
    return { success: true, organization: org };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update tenant plan" };
  }
}

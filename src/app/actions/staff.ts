"use server";

import { getCurrentContext } from "./auth";
import {
  inviteStaffSchema,
  InviteStaffInput,
  updateStaffSchema,
  UpdateStaffInput,
} from "@/lib/validations/staff";
import {
  listShopStaff,
  addStaffMember,
  updateStaffMember,
  removeStaffMember,
} from "@/lib/services/staff-service";
import { revalidatePath } from "next/cache";
import { ShopRole } from "@prisma/client";

export async function listStaffAction() {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return { success: false, error: "Unauthorized: Only Shop Owners can view staff lists." };
  }

  try {
    const staff = await listShopStaff(context);
    return { success: true, staff };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load staff list" };
  }
}

export async function addStaffAction(data: InviteStaffInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return { success: false, error: "Unauthorized: Only Shop Owners can invite staff." };
  }

  const parsed = inviteStaffSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const member = await addStaffMember(context, parsed.data);
    revalidatePath(`/${context.shopId}/settings`);
    return { success: true, member };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add staff member" };
  }
}

export async function updateStaffAction(data: UpdateStaffInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return { success: false, error: "Unauthorized: Only Shop Owners can modify staff permissions." };
  }

  const parsed = updateStaffSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const member = await updateStaffMember(context, parsed.data);
    revalidatePath(`/${context.shopId}/settings`);
    return { success: true, member };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update staff permissions" };
  }
}

export async function removeStaffAction(membershipId: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  if (context.role === ShopRole.SHOPKEEPER && !context.isPlatformAdmin) {
    return { success: false, error: "Unauthorized: Only Shop Owners can remove staff." };
  }

  try {
    await removeStaffMember(context, membershipId);
    revalidatePath(`/${context.shopId}/settings`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove staff member" };
  }
}

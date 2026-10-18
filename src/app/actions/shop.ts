"use server";

import { getCurrentContext } from "./auth";
import { updateShopSettingsSchema, UpdateShopSettingsInput } from "@/lib/validations/shop-settings";
import { getShopSettings, updateShopSettings } from "@/lib/services/shop-service";
import { revalidatePath } from "next/cache";

export async function getShopSettingsAction() {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const settings = await getShopSettings(context);
    return { success: true, settings };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load shop settings" };
  }
}

export async function updateShopSettingsAction(data: UpdateShopSettingsInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = updateShopSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const updated = await updateShopSettings(context, parsed.data);
    revalidatePath(`/${context.shopId}/settings`);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/dashboard`);
    return { success: true, settings: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update shop settings" };
  }
}

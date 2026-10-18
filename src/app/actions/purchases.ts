"use server";

import { getCurrentContext } from "./auth";
import {
  supplierSchema,
  SupplierInput,
  purchaseOrderSchema,
  PurchaseOrderInput,
  receivePurchaseSchema,
  ReceivePurchaseInput,
} from "@/lib/validations/purchase";
import {
  createSupplier,
  listSuppliers,
  createPurchaseOrder,
  receivePurchaseStock,
  listPurchaseOrders,
} from "@/lib/services/purchase-service";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(data: SupplierInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supplier = await createSupplier(context, parsed.data);
    revalidatePath(`/${context.shopId}/purchases/suppliers`);
    return { success: true, supplier };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create supplier" };
  }
}

export async function getSuppliersAction() {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const suppliers = await listSuppliers(context);
    return { success: true, suppliers };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load suppliers" };
  }
}

export async function createPurchaseOrderAction(data: PurchaseOrderInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = purchaseOrderSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const po = await createPurchaseOrder(context, parsed.data);
    revalidatePath(`/${context.shopId}/purchases`);
    return { success: true, purchaseOrder: po };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create purchase order" };
  }
}

export async function receivePurchaseStockAction(data: ReceivePurchaseInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = receivePurchaseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const po = await receivePurchaseStock(context, parsed.data);
    revalidatePath(`/${context.shopId}/purchases`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true, purchaseOrder: po };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to receive stock" };
  }
}

export async function getPurchaseOrdersAction(options: { status?: any; page?: number; pageSize?: number } = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await listPurchaseOrders(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load purchase orders" };
  }
}

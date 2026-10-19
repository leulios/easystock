"use server";

import { getCurrentContext } from "./auth";
import { createSaleSchema, CreateSaleInput, returnSaleSchema, ReturnSaleInput } from "@/lib/validations/sales";
import { createSale, processReturn, listSales, ListSalesOptions } from "@/lib/services/sales-service";
import { prisma } from "@/lib/db";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import crypto from "crypto";


export async function checkoutSaleAction(data: CreateSaleInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createSaleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await createSale(context, parsed.data);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/dashboard`);
    return {
      success: true,
      sale: result.sale,
      isDuplicateReplay: result.isDuplicateReplay,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Checkout failed" };
  }
}

export async function returnSaleAction(data: ReturnSaleInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = returnSaleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await processReturn(context, parsed.data);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/pos/history`);
    revalidatePath(`/${context.shopId}/inventory`);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process return" };
  }
}

export async function getSalesHistoryAction(options: ListSalesOptions = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await listSales(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load sales history" };
  }
}

export async function quickSellItemAction(data: {

  variantId: string;
  quantity: number;
  paymentMethod: PaymentMethod;
  customerId?: string | null;
}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: data.variantId },
      include: { product: true },
    });
    if (!variant) {
      return { success: false, error: "Product not found" };
    }

    const price = Number(variant.sellingPrice);
    const total = price * data.quantity;
    const idempotencyKey = crypto.randomUUID();

    const saleInput: CreateSaleInput = {
      idempotencyKey,
      customerId: data.customerId || undefined,
      items: [
        {
          variantId: variant.id,
          quantity: data.quantity,
          unitPrice: price,
          discount: 0,
        },
      ],
      payments: [
        {
          paymentMethod: data.paymentMethod,
          amount: total,
        },
      ],
    };

    const result = await createSale(context, saleInput);
    revalidatePath(`/${context.shopId}/pos`);
    revalidatePath(`/${context.shopId}/inventory`);
    revalidatePath(`/${context.shopId}/dashboard`);
    revalidatePath(`/${context.shopId}/scan`);

    return {
      success: true,
      sale: result.sale,
      productName: variant.product.name,
      totalAmount: total,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to process sale" };
  }
}


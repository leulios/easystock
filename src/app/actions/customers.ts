"use server";

import { getCurrentContext } from "./auth";
import {
  customerInputSchema,
  CustomerInput,
  adjustCreditSchema,
  AdjustCreditInput,
} from "@/lib/validations/customer";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  adjustCustomerCredit,
  deleteCustomer,
  ListCustomersOptions,
} from "@/lib/services/customer-service";
import { revalidatePath } from "next/cache";

export async function getCustomersAction(options: ListCustomersOptions = {}) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const result = await listCustomers(context, options);
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load customers" };
  }
}

export async function getCustomerDetailAction(customerId: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const customer = await getCustomerById(context, customerId);
    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load customer details" };
  }
}

export async function createCustomerAction(data: CustomerInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = customerInputSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const customer = await createCustomer(context, parsed.data);
    revalidatePath(`/${context.shopId}/customers`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create customer" };
  }
}

export async function updateCustomerAction(customerId: string, data: CustomerInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = customerInputSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const customer = await updateCustomer(context, customerId, parsed.data);
    revalidatePath(`/${context.shopId}/customers`);
    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update customer" };
  }
}

export async function adjustCustomerCreditAction(data: AdjustCreditInput) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = adjustCreditSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const customer = await adjustCustomerCredit(context, parsed.data);
    revalidatePath(`/${context.shopId}/customers`);
    revalidatePath(`/${context.shopId}/pos`);
    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to adjust customer credit" };
  }
}

export async function deleteCustomerAction(customerId: string) {
  const context = await getCurrentContext();
  if (!context) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await deleteCustomer(context, customerId);
    revalidatePath(`/${context.shopId}/customers`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete customer" };
  }
}
